/* itembox: item-box V7 for the recompiled MHGU (1.4.0) PC build, as a Forge PC 0.7 plugin.
 *
 * The pchtxt works on an emulator because dynarmic decodes guest memory at run time. The AOT
 * export keeps native code per basic block, so writing the 123 patched words into .text changes
 * nothing (docs/patches/item-box-v7-plugin-spec.md section 1). This plugin therefore hooks the
 * block start B that contains each patch site and runs a patched copy of the block prefix.
 *
 * Per site (i.e. per pchtxt line) in sites.h:
 *   1. verify the original 1.4.0 word with mem_read; one mismatch and nothing is installed;
 *   2. find the recompiled block start B <= site by walking back in 4-byte steps with is_block;
 *   3. group the sites by B, copy B..last site of the group into a fresh mem_alloc buffer with
 *      the patched words substituted, and append an absolute return to last site + 4
 *      (ldr pc,[pc,#-4] + address, spec Appendix A);
 *   4. refuse to clone a group whose copied range contains an instruction that reads or writes
 *      r15 or branches (its meaning depends on the address, spec section 4 R7/R11): such a group
 *      is logged as needing hand-written handling, the other groups still install;
 *   5. hook B with a pre hook that sets r15 to the clone and returns FORGE_HOOK_JUMP.
 *
 * Everything is logged to forge.log and to <mods>/0100770008DD8000/ItemBoxV7/itembox.txt.
 * Hooks are only created when <mods>/0100770008DD8000/ItemBoxV7/ENABLE exists; without it the
 * plugin runs the whole analysis and logs it as a dry run.
 *
 * EXPERIMENTAL: this plugin has not been run. The pchtxt's own residual risks stay (B/C keep
 * 2300 entries while the box holds 2992 slots, spec section 4 R2; the unbounded copy at
 * 0x19B1F4, R4). V7 saves are incompatible with the unpatched game. Back up save files.
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
#define ibox_mkdir(p) _mkdir(p)
#else
#include <sys/stat.h>
#define ibox_mkdir(p) mkdir(p, 0777)
#endif

FORGE_PLUGIN_DEFINE_API

#define PLUGIN "itembox"
#define MOD_FOLDER "ItemBoxV7"
#define HIGHEST_SITE 0x13F1DECu /* highest site, main-relative: .text ends at 0x13F1DEC */
#define WALK_LIMIT 0x400u       /* how far back a block start is searched (spec 5, step 3) */
#define LINE_MAX 2048
#define WORDS_MAX (WALK_LIMIT / 4u + 3u) /* 257 copied words + the 2-word return veneer */
#define POOL_MAX (WALK_LIMIT / 4u + 1u)  /* at most one literal per copied word */
#define LDR_PC_M4 0xE51FF004u            /* ldr pc,[pc,#-4]: pc = here+8, so -4 = next word */

static FILE* s_report;

/* One copied block: B and its clone, plus the first-hit flag. */
typedef struct IboxGroup {
    uint32_t block;        /* absolute guest address of B, the hooked block start */
    uint32_t clone;        /* absolute guest address of the cloned words */
    volatile uint32_t hit; /* first-hit logging flag, written from the game threads */
    ForgeHook* hook;       /* kept so a failed install can switch every hook off again */
} IboxGroup;

static ForgeHook* s_getter_hook;

static uint32_t s_base;                       /* absolute address of module "main" */
static uint32_t s_block[IBOX_SITE_COUNT];     /* B of every site, 0 = none found */
static uint32_t s_order[IBOX_SITE_COUNT];     /* site indices sorted by (B, vaddr) */
static uint32_t s_words[WORDS_MAX + POOL_MAX]; /* copy of B..last site + veneer + literal pool */
static uint32_t s_pool[POOL_MAX];             /* literals of the re-aimed loads */
static unsigned char s_fixed[WORDS_MAX];      /* 1 = word rewritten by the literal pass */
static IboxGroup s_group[IBOX_SITE_COUNT];    /* installed groups, in install order */
static uint32_t s_group_count;
static uint32_t s_skip_hazard;
static uint32_t s_skip_memory;
static uint32_t s_skip_hook;
static uint32_t s_skip_internal;

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

/* <mods>/ItemBoxV7/<leaf>; false when the mods dir is unknown or the path does not fit. */
static bool mod_path(char* buf, size_t cap, const char* leaf)
{
    const char* mods = forge_api->mods_dir();

    if (!mods || !mods[0] || cap == 0) {
        return false;
    }
    if ((size_t)snprintf(buf, cap, "%s/" MOD_FOLDER "/%s", mods, leaf) >= cap) {
        return false;
    }
    return true;
}

static bool open_report(void)
{
    char dir[1024];
    char path[1024];
    const char* mods = forge_api->mods_dir();

    if (!mods || !mods[0]) {
        return false;
    }
    if ((size_t)snprintf(dir, sizeof(dir), "%s/" MOD_FOLDER, mods) >= sizeof(dir)) {
        return false;
    }
    ibox_mkdir(dir); /* the folder exists with an installed plugin; EEXIST is fine */
    if ((size_t)snprintf(path, sizeof(path), "%s/itembox.txt", dir) >= sizeof(path)) {
        return false;
    }
    s_report = fopen(path, "w");
    return s_report != NULL;
}

/* The install gate: the plugin only hooks when <mods>/ItemBoxV7/ENABLE exists. */
static bool enable_requested(char* path, size_t cap)
{
    FILE* f;

    if (cap == 0) {
        return false;
    }
    path[0] = '\0';
    if (!mod_path(path, cap, "ENABLE")) {
        return false;
    }
    f = fopen(path, "rb");
    if (!f) {
        return false;
    }
    fclose(f);
    return true;
}

/* Row numbers of one group, space separated, for the log. */
static void row_list(char* buf, size_t cap, uint32_t first, uint32_t count)
{
    size_t used = 0;
    uint32_t k;

    if (cap == 0) {
        return;
    }
    buf[0] = '\0';
    for (k = 0; k < count && used + 1 < cap; k++) {
        int n = snprintf(buf + used, cap - used, "%s%u", k == 0 ? "" : " ",
                         kIboxSites[s_order[first + k]].row);
        if (n < 0) {
            break;
        }
        used += (size_t)n;
        if (used >= cap) {
            break;
        }
    }
}

/* True when the group covers the given pchtxt row. */
static bool rows_include(uint32_t first, uint32_t count, uint32_t row)
{
    uint32_t k;

    for (k = 0; k < count; k++) {
        if (kIboxSites[s_order[first + k]].row == row) {
            return true;
        }
    }
    return false;
}

/* Why a word cannot move to another address, or NULL when it does not mind.
 *
 * A clone is executed at an address the compiler did not know, so every instruction whose result
 * or target depends on its own address is a hazard: b/bl/blx to an immediate, PC-relative loads
 * and stores, ADR, and everything that writes r15 (mov pc, ldr pc, pop/ldm pc, ...). Branches
 * that would leave the copied range (bx rN, and a conditional branch at the last word) are
 * hazards too: the copy must be one straight run up to the site. The assignment (and spec
 * section 4 R7/R11) says to skip such a group and leave it for a hand-written hook.
 */
static const char* pc_hazard(uint32_t w)
{
    const unsigned cond = w >> 28;
    const unsigned cls = (w >> 25) & 0x7u; /* the three class bits 27-25 */
    const unsigned rn = (w >> 16) & 0xFu;
    const unsigned rd = (w >> 12) & 0xFu;
    const unsigned rs = (w >> 8) & 0xFu;
    const unsigned rm = w & 0xFu;
    const unsigned op20 = (w >> 20) & 0x1Fu; /* bits 24-20: movw/movt are 10000 / 10100 */

    if (cond == 0xFu) {
        /* unconditional space: blx imm (0b101x), rfe (0b1001), pld/pli, svc */
        if (cls == 0x5u) {
            return "blx imm";
        }
        if (cls == 0x4u && (w & (1u << 20)) != 0) {
            return "rfe (writes pc)";
        }
        return NULL;
    }
    switch (cls) {
    case 0x5u: /* 101: b/bl with a condition code, pc-relative */
        return "b/bl imm (branch)";
    case 0x4u: /* 100: ldm/stm */
        if ((w & 0x8000u) != 0) {
            return "ldm/stm pc in the register list";
        }
        return rn == 0xFu ? "ldm/stm pc base" : NULL;
    case 0x6u: /* 110: ldc/stc */
        return rn == 0xFu ? "ldc/stc pc-relative" : NULL;
    case 0x7u: /* 111: svc (1111) or cdp/mcr/mrc (1110) */
        if ((w & 0x0F000000u) == 0x0F000000u) {
            return NULL;
        }
        return rd == 0xFu ? "coprocessor transfer to pc" : NULL;
    case 0x2u: /* 010: ldr/str word/byte */
        if (rn == 0xFu) {
            return "ldr/str pc-relative";
        }
        if (rd == 0xFu) {
            return "ldr/str pc";
        }
        if ((w & 0x10u) != 0 && rm == 0xFu) {
            return "ldr/str pc offset";
        }
        return NULL;
    case 0x3u: /* 011: bit 4 = 0 is ldr/str with a register offset; bit 4 = 1 is media
                * (parallel add/sub, pack, extend, rev), which has no pc operand or branch */
        if ((w & 0x10u) != 0) {
            return NULL;
        }
        if (rn == 0xFu) {
            return "ldr/str pc + register"; /* e.g. ldr r0,[pc,r0]: pc-relative data access */
        }
        if (rd == 0xFu) {
            return "ldr/str pc";
        }
        return rm == 0xFu ? "ldr/str pc offset" : NULL;
    case 0x1u: /* 001: dp immediate, or movw/movt (bits 24-20 = 10000 / 10100) */
        if (op20 == 0x10u || op20 == 0x14u) {
            return rd == 0xFu ? "movw/movt pc" : NULL;
        }
        if (rn == 0xFu) {
            return "adr / dp immediate with pc";
        }
        return rd == 0xFu ? "mov pc" : NULL;
    default: /* 000: dp register, multiply, extra load/store, misc */
        break;
    }

    if ((w & 0x0FBF0FFFu) == 0x010F0000u) { /* mrs: Rd at 15-12, bits 19-16 are fixed 1111 */
        return rd == 0xFu ? "mrs pc" : NULL;
    }
    if ((w & 0x0FB0FFF0u) == 0x0120F000u) { /* msr (register): Rm at 3-0, mask at 19-16 */
        return rm == 0xFu ? "msr pc" : NULL;
    }
    if ((w & 0x0FFFFFD0u) == 0x012FFF10u) { /* bx / blx (register), bits 7-4 = 0001/0011 */
        return rm == 0xFu ? "bx pc" : "branch to a register";
    }
    if ((w & 0x10u) == 0) { /* dp register, shift by immediate */
        return (rn == 0xFu || rd == 0xFu || rm == 0xFu) ? "dp register with pc" : NULL;
    }
    if ((w & 0x80u) == 0) { /* dp register, shift by register */
        return (rn == 0xFu || rd == 0xFu || rm == 0xFu || rs == 0xFu)
                   ? "dp register with pc"
                   : NULL;
    }
    /* bits 7 and 4 set: multiply, swap, extra load/store, bx/blx, clz */
    switch ((w >> 4) & 0xFu) {
    case 0x9u: /* mul/mla/mls/long multiply/swap: Rd, Rn, Rs, Rm are all registers */
        return (rn == 0xFu || rd == 0xFu || rs == 0xFu || rm == 0xFu) ? "multiply with pc"
                                                                       : NULL;
    case 0xBu: /* ldrh/strh */
    case 0xDu: /* ldrsb, or ldrd when L = 0 */
    case 0xFu: /* ldrsh, or strd when L = 0 */
        /* bits 11-8 are imm4 here, not a register */
        if (rn == 0xFu) {
            return "extra load pc-relative";
        }
        if (rd == 0xFu) {
            return "extra load pc";
        }
        if ((w & (1u << 22)) == 0 && rm == 0xFu) {
            return "extra load pc offset";
        }
        if (rd == 0xEu && (w & 0x60u) == 0x40u && (w & (1u << 20)) == 0) {
            return "ldrd pair writes pc"; /* Rt = 14 also writes Rt + 1 = r15 */
        }
        return NULL;
    default: /* clz and the rest of the space (bx/blx were taken above) */
        return (rn == 0xFu || rd == 0xFu || rs == 0xFu || rm == 0xFu) ? "misc with pc" : NULL;
    }
}

/* Runs instead of the hooked block: continue at the clone. */
static ForgeHookAction ibox_pre(ForgeCpu* cpu, void* user)
{
    IboxGroup* g = (IboxGroup*)user;

    cpu->r[15] = g->clone;
    cpu->thumb = 0; /* ARM state, and the clone address is 4-aligned so bit 0 is already 0 */
    if (g->hit == 0) {
        char msg[96];
        g->hit = 1; /* benign race: two threads may both log the first hit */
        snprintf(msg, sizeof msg, "first hit: B main+%#x -> clone %#010x",
                 (unsigned)(g->block - s_base), (unsigned)g->clone);
        forge_api->log(FORGE_LOG_INFO, PLUGIN, msg); /* log() takes a finished string */
    }
    return FORGE_HOOK_JUMP;
}

/* Rows 23, 24 and 26 (spec section 2): the capacity getter at main+0x198F04. V7 turns its
 * first two words into `movw r0,#0xBB0; bx lr`, so the function returns 2992 at once and its
 * epilogue (row 26) never runs. A clone cannot express the `bx lr`; a pre hook that sets the
 * return value and returns FORGE_HOOK_RETURN does exactly the same (forge_pc.h:136-139). */
#define GETTER_VADDR 0x198F04u
#define GETTER_VALUE 0xBB0u
static volatile int s_getter_hit;

static bool is_getter_row(uint32_t row)
{
    return row == 23u || row == 24u || row == 26u;
}

static ForgeHookAction getter_pre(ForgeCpu* cpu, void* user)
{
    (void)user;
    cpu->r[0] = GETTER_VALUE;
    if (s_getter_hit == 0) {
        s_getter_hit = 1;
        forge_api->log(FORGE_LOG_INFO, PLUGIN, "first hit: capacity getter -> 0xBB0");
    }
    return FORGE_HOOK_RETURN;
}

static bool site_less(uint32_t a, uint32_t b)
{
    if (s_block[a] != s_block[b]) {
        return s_block[a] < s_block[b]; /* B = 0 (none) sorts first */
    }
    return kIboxSites[a].vaddr < kIboxSites[b].vaddr;
}

/* Clone and hook one group. Returns true when its sites are covered (installed, or would be in
 * a dry run). Every false return has logged why and counted it in one of the s_skip_ counters. */
static bool process_group(uint32_t block, uint32_t first, uint32_t count, bool enable)
{
    IboxGroup* g = &s_group[s_group_count];
    char rows[512];
    const uint32_t b_off = block - s_base;
    const uint32_t last = kIboxSites[s_order[first + count - 1u]].vaddr; /* max vaddr (sorted) */
    uint32_t nwords;
    uint32_t bytes;
    uint32_t clone;
    uint32_t k;
    const char* hazard = NULL;
    uint32_t hazard_at = 0;
    uint32_t npool;
    ForgeHook* hook;

    row_list(rows, sizeof(rows), first, count);
    if (last < b_off || ((last - b_off) & 3u) != 0) {
        s_skip_internal++;
        out(FORGE_LOG_ERROR, "[4] B main+%#x rows %s: last site main+%#x is not inside the "
            "block, skipped", b_off, rows, last);
        return false;
    }
    nwords = (last - b_off) / 4u + 1u;
    if (nwords + 2u > WORDS_MAX) {
        s_skip_internal++;
        out(FORGE_LOG_ERROR, "[4] B main+%#x rows %s: %u words, longer than the walk limit, "
            "skipped", b_off, rows, nwords);
        return false;
    }
    if (!forge_api->mem_read(block, s_words, nwords * 4u)) {
        s_skip_memory++;
        out(FORGE_LOG_ERROR, "[4] B main+%#x rows %s: mem_read of %u words failed, skipped",
            b_off, rows, nwords);
        return false;
    }
    /* Put the patched word at every site of the group. */
    for (k = 0; k < count; k++) {
        const IboxSite* site = &kIboxSites[s_order[first + k]];
        const uint32_t index = (site->vaddr - b_off) / 4u;

        if (index >= nwords || s_words[index] != site->orig_word) {
            s_skip_internal++;
            out(FORGE_LOG_ERROR, "[4] B main+%#x row %u: main+%#x does not hold its original "
                "word inside the copied range, skipped", b_off, site->row, site->vaddr);
            return false;
        }
        s_words[index] = site->patched_word;
    }
    /* Literal loads `ldr rD,[pc,#+-imm]` (rD != pc) are kept: the literal is read from the game
     * and placed in a pool after the return veneer, and the load is re-aimed at that pool.
     * When the literal is a pc-relative offset consumed by a later `ldr rD,[pc,rD]` (the PIC
     * idiom in 4 of the groups: offset load, then `ldr r0,[pc,r0]`), the absolute address
     * literal + (that ldr + 8) goes into the pool instead and the second load becomes
     * `ldr rD,[rD]`. Only words rewritten here skip the hazard scan below. */
    npool = 0;
    memset(s_fixed, 0, sizeof(s_fixed));
    for (k = 0; k < nwords; k++) {
        const uint32_t w = s_words[k];
        const uint32_t rd = (w >> 12) & 0xFu;

        if ((w & 0x0F7F0000u) == 0x051F0000u && rd != 0xFu && (w >> 28) != 0xFu) {
            const uint32_t imm = w & 0xFFFu;
            const uint32_t at = block + k * 4u + 8u;
            const uint32_t lit = (w & 0x00800000u) ? at + imm : at - imm;
            const uint32_t pair = (0xE79F0000u | (rd << 12) | rd); /* ldr rD,[pc,rD] */
            uint32_t value;
            uint32_t off;
            uint32_t j;

            if (!forge_api->mem_read(lit, &value, 4u)) {
                s_skip_memory++;
                out(FORGE_LOG_ERROR, "[4] B main+%#x rows %s: literal at %#010x unreadable, "
                    "skipped", b_off, rows, lit);
                return false;
            }
            /* Pair only across plain data-processing words that do not write rD. */
            for (j = k + 1u; j < nwords; j++) {
                const uint32_t v = s_words[j];
                const uint32_t cls = (v >> 25) & 0x7u;
                const bool dp = (v >> 28) == 0xEu &&
                                (cls == 0x1u || (cls == 0x0u && (v & 0x10u) == 0));

                if (v == pair || !dp || ((v >> 12) & 0xFu) == rd) {
                    break;
                }
            }
            if (j < nwords && s_words[j] == pair) {
                value += block + j * 4u + 8u;                      /* absolute data address */
                s_words[j] = 0xE5900000u | (rd << 16) | (rd << 12); /* ldr rD,[rD] */
                s_fixed[j] = 1;
            }
            /* pool word npool sits at clone + (nwords + 2 + npool) * 4; pc reads as here + 8 */
            off = (nwords + 2u + npool) * 4u - (k * 4u + 8u);
            if (off > 0xFFFu) {
                s_skip_internal++;
                out(FORGE_LOG_ERROR, "[4] B main+%#x rows %s: literal pool out of ldr range, "
                    "skipped", b_off, rows);
                return false;
            }
            s_pool[npool++] = value;
            s_words[k] = (w & 0xFF70F000u) | 0x00800000u | 0x000F0000u | off; /* U=1, Rn=pc */
            s_fixed[k] = 1;
        }
    }
    /* One straight run of address-independent instructions is required. */
    for (k = 0; k < nwords; k++) {
        if (s_fixed[k]) {
            continue;
        }
        hazard = pc_hazard(s_words[k]);
        if (hazard != NULL) {
            hazard_at = k;
            break;
        }
    }
    if (hazard != NULL) {
        s_skip_hazard++;
        out(FORGE_LOG_WARN, "[4] B main+%#x rows %s: NOT CLONED, needs hand-written handling: "
            "main+%#x is %s", b_off, rows, b_off + hazard_at * 4u, hazard);
        return false;
    }
    if (!enable) {
        out(FORGE_LOG_INFO, "[4] B main+%#x rows %s: would clone %u words (dry run)", b_off, rows,
            nwords);
        return true;
    }
    /* mem_alloc memory has no recompiled block, so the clone runs on the JIT (forge_pc.h,
     * `call`: "code a plugin loaded into mem_alloc memory ... runs on the JIT"). A fresh buffer
     * per group, never reused: the JIT caches a translation per guest address (spec R11), so
     * different bytes at the same address would run stale code. */
    bytes = (nwords + 2u + npool) * 4u;
    clone = forge_api->mem_alloc(bytes, 16u);
    if (clone == 0) {
        s_skip_memory++;
        out(FORGE_LOG_ERROR, "[5] B main+%#x rows %s: no guest memory for %u bytes, skipped",
            b_off, rows, bytes);
        return false;
    }
    s_words[nwords] = LDR_PC_M4;                   /* ldr pc,[pc,#-4] */
    s_words[nwords + 1u] = s_base + last + 4u;     /* -> the instruction after the last site */
    for (k = 0; k < npool; k++) {
        s_words[nwords + 2u + k] = s_pool[k];      /* literals, never executed */
    }
    if (!forge_api->mem_write(clone, s_words, bytes)) {
        /* Deliberately not mem_free'd: the page must never come back with other bytes (R11). */
        s_skip_memory++;
        out(FORGE_LOG_ERROR, "[5] B main+%#x rows %s: mem_write of the clone at %#010x failed, "
            "skipped", b_off, rows, clone);
        return false;
    }
    g->block = block;
    g->clone = clone;
    g->hit = 0;
    hook = forge_api->hook_create(block, ibox_pre, NULL, g);
    if (hook == NULL) {
        s_skip_hook++;
        out(FORGE_LOG_ERROR, "[5] B main+%#x rows %s: hook_create refused the block start, "
            "skipped (clone at %#010x stays unused)", b_off, rows, clone);
        return false;
    }
    /* A created hook is active already; the explicit enable keeps the intent readable and
     * covers a loader that hands out disabled hooks. */
    forge_api->hook_enable(hook, true);
    g->hook = hook;
    s_group_count++;
    out(FORGE_LOG_INFO, "[5] B main+%#x rows %s: installed, %u words cloned at %#010x, returns "
        "to main+%#x", b_off, rows, nwords, clone, last + 4u);
    return true;
}

/* One pass over all 123 lines. Returns true when every line is covered. With enable = false
 * nothing is allocated, written or hooked. */
static bool install(bool enable)
{
    const uint32_t base = forge_api->mem_getModuleBase("main");
    const uint32_t size = forge_api->mem_getModuleSize("main");
    uint32_t verified = 0;
    uint32_t mismatches = 0;
    uint32_t no_block = 0;
    uint32_t groups = 0;
    uint32_t installed = 0;
    uint32_t covered = 0;
    uint32_t getter_rows = 0;
    size_t i;

    s_group_count = 0;
    s_getter_hook = NULL;
    s_skip_hazard = 0;
    s_skip_memory = 0;
    s_skip_hook = 0;
    s_skip_internal = 0;

    out(FORGE_LOG_INFO, "[0] pass: %s", enable ? "install" : "dry run (nothing is changed)");

    /* Step 1: module "main" and the range the table needs (spec 5, step 1; risk R0). */
    out(FORGE_LOG_INFO, "[1] main base %#010x, size %#x (%u bytes)", base, size, size);
    if (base == 0 || size == 0) {
        out(FORGE_LOG_ERROR, "[1] FAIL: module \"main\" not found, nothing installed");
        return false;
    }
    if (size < HIGHEST_SITE) {
        out(FORGE_LOG_ERROR, "[1] FAIL: highest site main+%#x is outside the module (size %#x)",
            HIGHEST_SITE, size);
        return false;
    }
    if (!forge_api->mem_read || !forge_api->is_block) {
        out(FORGE_LOG_ERROR, "[1] FAIL: loader lacks mem_read/is_block (Forge PC 0.7 required)");
        return false;
    }
    if (enable && (!forge_api->hook_create || !forge_api->mem_alloc || !forge_api->mem_write)) {
        out(FORGE_LOG_ERROR, "[1] FAIL: loader lacks hook_create/mem_alloc/mem_write");
        return false;
    }
    s_base = base;

    /* Step 2: every original word has to be there, or nothing is installed at all. */
    for (i = 0; i < IBOX_SITE_COUNT; i++) {
        const IboxSite* site = &kIboxSites[i];
        const uint32_t abs = base + site->vaddr;
        uint32_t word = 0;
        const bool readable = forge_api->mem_read(abs, &word, 4);

        s_block[i] = 0;
        if (readable && word == site->orig_word) {
            verified++;
            out(FORGE_LOG_DEBUG, "[2] row %u site main+%#x word %08X ok", site->row, site->vaddr,
                word);
        } else {
            mismatches++;
            out(FORGE_LOG_ERROR, "[2] row %u site main+%#x word %08X expect %08X %s", site->row,
                site->vaddr, readable ? word : 0u, site->orig_word,
                readable ? "MISMATCH" : "UNREADABLE");
        }
    }
    out(FORGE_LOG_INFO, "[2] original words verified %u/%u", verified,
        (unsigned)IBOX_SITE_COUNT);
    if (mismatches != 0) {
        out(FORGE_LOG_ERROR, "[2] FAIL CLOSED: %u of %u sites do not hold their 1.4.0 "
            "instruction; nothing installed (wrong game version or module base?)",
            mismatches, (unsigned)IBOX_SITE_COUNT);
        return false;
    }

    /* Step 3: block start of every site: is_block, else walk back up to 0x400 bytes. */
    for (i = 0; i < IBOX_SITE_COUNT; i++) {
        const uint32_t off = kIboxSites[i].vaddr;
        const uint32_t abs = base + off;
        uint32_t d;

        if (forge_api->is_block(abs)) {
            s_block[i] = abs;
            out(FORGE_LOG_DEBUG, "[3] row %u: B main+%#x (the site is a block start)",
                kIboxSites[i].row, off);
            continue;
        }
        for (d = 4; d <= WALK_LIMIT && abs >= base + d; d += 4) {
            if (forge_api->is_block(abs - d)) {
                s_block[i] = abs - d;
                break;
            }
        }
        if (s_block[i] != 0) {
            out(FORGE_LOG_DEBUG, "[3] row %u: B main+%#x, site-B %#x", kIboxSites[i].row,
                s_block[i] - base, abs - s_block[i]);
        } else {
            no_block++;
            out(FORGE_LOG_WARN, "[3] row %u: NO block start within %#x bytes of main+%#x, "
                "this site cannot be patched", kIboxSites[i].row, WALK_LIMIT, off);
        }
    }
    out(FORGE_LOG_INFO, "[3] block start found for %u/%u sites, %u without B",
        (unsigned)IBOX_SITE_COUNT - no_block, (unsigned)IBOX_SITE_COUNT, no_block);

    /* Step 4: order the sites by (B, site) so a group is one contiguous run. */
    for (i = 0; i < IBOX_SITE_COUNT; i++) {
        s_order[i] = (uint32_t)i;
    }
    for (i = 1; i < IBOX_SITE_COUNT; i++) {
        const uint32_t key = s_order[i];
        size_t j = i;

        while (j > 0 && site_less(key, s_order[j - 1u])) {
            s_order[j] = s_order[j - 1u];
            j--;
        }
        s_order[j] = key;
    }

    /* Step 5: clone and hook one group per distinct B. The getter rows (23, 24, 26) are not
     * cloned: one replace-fn hook at the getter entry covers all three (spec section 2). */
    i = 0;
    while (i < IBOX_SITE_COUNT && s_block[s_order[i]] == 0) {
        i++; /* no B: reported in step 3 */
    }
    while (i < IBOX_SITE_COUNT) {
        const uint32_t block = s_block[s_order[i]];
        const uint32_t first = (uint32_t)i;
        size_t j = i;
        bool getter = true;
        size_t k;

        while (j < IBOX_SITE_COUNT && s_block[s_order[j]] == block) {
            j++;
        }
        for (k = i; k < j; k++) {
            getter = getter && is_getter_row(kIboxSites[s_order[k]].row);
        }
        if (getter) {
            covered += (uint32_t)(j - i); /* withdrawn below if the getter hook fails */
            getter_rows += (uint32_t)(j - i);
            out(FORGE_LOG_INFO, "[4] B main+%#x: getter rows, handled by the replace-fn hook",
                block - base);
        } else {
            groups++;
            if (process_group(block, first, (uint32_t)(j - i), enable)) {
                installed++;
                covered += (uint32_t)(j - i);
            }
        }
        i = j;
    }
    if (getter_rows != 3u) {
        out(FORGE_LOG_ERROR, "[5] getter rows found %u/3 (rows 23, 24, 26 must each have a B)",
            getter_rows);
        covered -= getter_rows;
    } else if (enable) {
        s_getter_hook = forge_api->hook_create(base + GETTER_VADDR, getter_pre, NULL, NULL);
        if (s_getter_hook == NULL) {
            out(FORGE_LOG_ERROR, "[5] getter main+%#x: hook_create refused", GETTER_VADDR);
            covered -= getter_rows;
        } else {
            forge_api->hook_enable(s_getter_hook, true);
            out(FORGE_LOG_INFO, "[5] getter main+%#x: installed, returns 0xBB0", GETTER_VADDR);
        }
    } else {
        out(FORGE_LOG_INFO, "[5] getter main+%#x: would install (dry run)", GETTER_VADDR);
    }

    out(FORGE_LOG_INFO, "[6] summary: %s; words %u/%u; sites with a B %u/%u; groups %u, "
        "installed %u (%u sites incl. getter), skipped %u; sites left unpatched %u",
        enable ? "install" : "dry run", verified, (unsigned)IBOX_SITE_COUNT,
        (unsigned)IBOX_SITE_COUNT - no_block, (unsigned)IBOX_SITE_COUNT, groups, installed,
        covered, groups - installed, (unsigned)IBOX_SITE_COUNT - covered);
    out(FORGE_LOG_INFO, "[6] skips: %u pc-hazard/not-one-block, %u memory, %u hook, %u internal",
        s_skip_hazard, s_skip_memory, s_skip_hook, s_skip_internal);
    if (covered != (uint32_t)IBOX_SITE_COUNT) {
        /* All or nothing (spec R3): a half-applied layout writes a save no build can read. */
        uint32_t g;

        for (g = 0; g < s_group_count; g++) {
            forge_api->hook_enable(s_group[g].hook, false);
        }
        if (s_getter_hook != NULL) {
            forge_api->hook_enable(s_getter_hook, false);
        }
        out(FORGE_LOG_ERROR, "[6] %u of %u patch lines cannot be applied: %s (see the [4]/[5] "
            "lines above); the game runs unmodified",
            (unsigned)IBOX_SITE_COUNT - covered, (unsigned)IBOX_SITE_COUNT,
            enable ? "ALL hooks switched off again" : "an install would be refused");
        return false;
    }
    out(FORGE_LOG_INFO, "[6] %s: all %u patch lines covered", enable ? "ACTIVE" : "dry run OK",
        (unsigned)IBOX_SITE_COUNT);
    return true;
}

FORGE_EXPORT void forge_onLoad(ForgePluginInfo* info)
{
    info->required_ver.major = FORGE_PC_VERSION_MAJOR;
    info->required_ver.minor = FORGE_PC_VERSION_MINOR;
    info->required_ver.patch = FORGE_PC_VERSION_PATCH;
    snprintf(info->name, sizeof(info->name), "ItemBox V7 (experimental)");
}

FORGE_EXPORT void forge_onInit(void)
{
    out(FORGE_LOG_INFO, "# itembox: %u sites from sites.h (item-box V7, experimental)",
        (unsigned)IBOX_SITE_COUNT);
    if (!open_report()) {
        out(FORGE_LOG_WARN, "cannot write %s/" MOD_FOLDER "/itembox.txt, logging only",
            forge_api->mods_dir() ? forge_api->mods_dir() : "?");
    }
    {
        char gate[1024];
        const bool want = enable_requested(gate, sizeof(gate));

        out(FORGE_LOG_INFO, "[0] gate %s %s", gate[0] ? gate : "<mods dir unknown>",
            want ? "present: dry run first, install only if all 123 lines pass"
                 : "missing: dry run only (create the file to install)");
        /* Two passes so no hook is ever live in a partial state: the install pass runs only
         * after the dry pass covered all 123 lines. Its own all-or-nothing rollback still
         * covers failures that only show up there (mem_alloc, hook_create). */
        if (install(false) && want) {
            install(true);
        }
    }
    if (s_report) {
        fclose(s_report);
        s_report = NULL;
    }
}

FORGE_EXPORT void forge_onUnload(void)
{
    /* The loader drops the hooks. The clone buffers stay allocated on purpose: freeing a guest
     * page the JIT has already translated and then getting it back for different bytes would
     * run the stale translation (spec section 4 R11). Set hot_reload = false in forge.ini. */
    out(FORGE_LOG_INFO, "unload (%u clones installed; their guest memory is left mapped)",
        s_group_count);
}
