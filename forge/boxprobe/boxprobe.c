/* boxprobe: read-only start-up verification of the item-box v7 patch table.
 *
 * Forge PC plugin for the recompiled MHGU (1.4.0) PC build. It runs steps 1-4 of
 * docs/patches/item-box-v7-plugin-spec.md section 5: locate module "main", check the 123
 * patch sites against their original 1.4.0 words, resolve the recompiled block start B of
 * every site, and group the sites by B. Nothing is patched and no hook is created: this
 * plugin only reads game memory, logs, and writes <mods>/BoxProbe/boxprobe.txt.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
#define _CRT_SECURE_NO_WARNINGS
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>

#include "forge_pc.h"
#include "sites.h"

#ifdef _WIN32
#include <direct.h>
#define box_mkdir(p) _mkdir(p)
#else
#include <sys/stat.h>
#define box_mkdir(p) mkdir(p, 0777)
#endif

FORGE_PLUGIN_DEFINE_API

#define PLUGIN "boxprobe"
#define HIGHEST_SITE 0x13F1DECu /* highest patched address, main-relative (spec 5, step 1) */
#define WALK_LIMIT 0x400u
#define LINE_MAX 2048

static FILE* s_report;

/* One line to the game log and to the report file, when it could be opened. */
static void out(ForgeLogLevel level, const char* fmt, ...)
{
    char buf[LINE_MAX];
    va_list ap;

    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    forge_api->log(level, PLUGIN, buf);
    if (s_report) {
        fputs(buf, s_report);
        fputc('\n', s_report);
    }
}

static bool open_report(void)
{
    const char* mods = forge_api->mods_dir();
    char dir[1024];
    char path[1024];

    if (!mods || !mods[0]) {
        return false;
    }
    snprintf(dir, sizeof(dir), "%s/BoxProbe", mods);
    box_mkdir(dir); /* the folder exists with an installed plugin; EEXIST is fine */
    snprintf(path, sizeof(path), "%s/boxprobe.txt", dir);
    s_report = fopen(path, "w");
    return s_report != NULL;
}

/* Block start of each site (0 = none found): is_block in step 2, walk-back in step 3. */
static uint32_t s_block[BOX_SITE_COUNT];

static void probe(void)
{
    const uint32_t base = forge_api->mem_getModuleBase("main");
    const uint32_t size = forge_api->mem_getModuleSize("main");
    unsigned matched = 0, starts = 0, distinct = 0, missing = 0;
    size_t i, j;

    if (!forge_api->is_block) {
        out(FORGE_LOG_ERROR, "loader has no is_block (Forge PC 0.7 required)");
        return;
    }

    /* Step 1: base and size of "main", and the highest patched address inside the module. */
    out(FORGE_LOG_INFO, "[1] main base %#010x, size %#x (%u bytes)", base, size, size);
    if (base == 0 || size == 0) {
        out(FORGE_LOG_ERROR, "[1] FAIL: module \"main\" not found");
        return;
    }
    if (size < HIGHEST_SITE) {
        out(FORGE_LOG_ERROR, "[1] FAIL: base + %#x > base + size %#x", HIGHEST_SITE, size);
        return;
    }
    out(FORGE_LOG_INFO, "[1] OK: base + %#x <= base + size", HIGHEST_SITE);

    /* Step 2: read every site; a wrong base shows up as a word mismatch. */
    for (i = 0; i < BOX_SITE_COUNT; i++) {
        const BoxSite* site = &kBoxSites[i];
        const uint32_t abs = base + site->vaddr;
        const bool block = forge_api->is_block(abs);
        uint32_t word = 0;
        const bool readable = forge_api->mem_read(abs, &word, 4);
        const bool match = readable && word == site->word;

        matched += match ? 1u : 0u;
        s_block[i] = block ? abs : 0;
        if (readable) {
            out(block && match ? FORGE_LOG_INFO : FORGE_LOG_WARN,
                "[2] row %u site main+%#x is_block %d word %08X expect %08X match %d",
                site->row, site->vaddr, block ? 1 : 0, word, site->word, match ? 1 : 0);
        } else {
            out(FORGE_LOG_WARN,
                "[2] row %u site main+%#x is_block %d word unreadable (expect %08X)",
                site->row, site->vaddr, block ? 1 : 0, site->word);
        }
    }
    out(FORGE_LOG_INFO, "[2] words matched %u/%u", matched, (unsigned)BOX_SITE_COUNT);

    /* Step 3: walk back 4 bytes at a time to the start of the block that contains the site. */
    for (i = 0; i < BOX_SITE_COUNT; i++) {
        const uint32_t abs = base + kBoxSites[i].vaddr;
        uint32_t block = 0;
        uint32_t d;

        if (s_block[i] != 0) {
            continue;
        }
        for (d = 4; d <= WALK_LIMIT && abs >= base + d; d += 4) {
            if (forge_api->is_block(abs - d)) {
                block = abs - d;
                break;
            }
        }
        s_block[i] = block;
        if (block != 0) {
            out(FORGE_LOG_INFO, "[3] row %u: B main+%#x, site-B %#x", kBoxSites[i].row,
                block - base, abs - block);
        } else {
            out(FORGE_LOG_WARN, "[3] row %u: NO B within %#x bytes of main+%#x (reported)",
                kBoxSites[i].row, WALK_LIMIT, kBoxSites[i].vaddr);
        }
    }

    /* Step 4: one line per distinct B, listing the rows that hang off it. */
    for (i = 0; i < BOX_SITE_COUNT; i++) {
        char line[LINE_MAX];
        size_t used;
        bool first = true;
        bool truncated = false;

        if (s_block[i] == 0) {
            continue;
        }
        for (j = 0; j < i; j++) {
            if (s_block[j] == s_block[i]) {
                first = false;
                break;
            }
        }
        if (!first) {
            continue;
        }
        distinct++;
        used = (size_t)snprintf(line, sizeof(line), "[4] B main+%#x: rows", s_block[i] - base);
        for (j = i; j < BOX_SITE_COUNT; j++) {
            if (s_block[j] != s_block[i]) {
                continue;
            }
            if (used + 8 >= sizeof(line)) {
                truncated = true;
                break;
            }
            used += (size_t)snprintf(line + used, sizeof(line) - used, " %u", kBoxSites[j].row);
        }
        out(FORGE_LOG_INFO, "%s%s", line, truncated ? " ..." : "");
    }

    for (i = 0; i < BOX_SITE_COUNT; i++) {
        if (s_block[i] != 0) {
            starts++;
        } else {
            missing++;
        }
    }
    out(FORGE_LOG_INFO,
        "[5] summary: words matched %u/%u, block starts %u/%u, distinct B %u, missing B %u",
        matched, (unsigned)BOX_SITE_COUNT, starts, (unsigned)BOX_SITE_COUNT, distinct, missing);
}

FORGE_EXPORT void forge_onLoad(ForgePluginInfo* info)
{
    info->required_ver.major = FORGE_PC_VERSION_MAJOR;
    info->required_ver.minor = FORGE_PC_VERSION_MINOR;
    info->required_ver.patch = FORGE_PC_VERSION_PATCH;
    snprintf(info->name, sizeof(info->name), "BoxProbe (read-only site probe)");
}

FORGE_EXPORT void forge_onInit(void)
{
    out(FORGE_LOG_INFO, "# boxprobe: %u sites from sites.h, read-only", (unsigned)BOX_SITE_COUNT);
    if (!open_report()) {
        out(FORGE_LOG_WARN, "cannot write %s/BoxProbe/boxprobe.txt, logging only",
            forge_api->mods_dir() ? forge_api->mods_dir() : "?");
    }
    probe();
    if (s_report) {
        fclose(s_report);
        s_report = NULL;
    }
}

FORGE_EXPORT void forge_onUnload(void)
{
    /* nothing to restore: the plugin never wrote game memory */
    out(FORGE_LOG_INFO, "unload");
}
