/* dbgport: local debug port for the recompiled MHGU (1.4.0) PC build, as a Forge PC plugin.
 *
 * Listens on 127.0.0.1:<port> (default 47100; dbgport.ini [net] port). Only loopback is bound and
 * there is no authentication: any local process can press buttons and read/write game memory.
 * One client at a time, one text command per line, one reply line per command:
 *
 *   base                     main module base (hex)
 *   mask                     current input mask [[GOT 0x183931c]+0x6bfc] (hex)
 *   hold <mask>              OR <mask> into the input mask every game update until release
 *   tap <mask> <updates>     OR <mask> for <updates> game updates, then stop
 *   release                  stop injecting
 *   rd <addr> <n>            hex dump n (1..256) bytes at guest address addr
 *   rm <off> <n>             same, at main base + off (addresses from the static notes)
 *   w32 <addr> <value>       write a u32 at guest address addr
 *   ptr <off> [o1 o2 ...]    follow [[base+off]+o1]+o2...; prints each step
 * Numbers are hex (0x optional) except <n> and <updates>, which are decimal.
 *
 * Every command runs on the game thread inside forge_onUpdate; the socket thread only queues it
 * and waits up to 2 s for the reply (the game must be running, not paused in the Forge menu).
 * Bit values are raw NpadButton bits (MHGU DEVLOG 2026-10-25): A 0x1, B 0x2, X 0x4, Y 0x8,
 * L 0x40, R 0x80, ZL 0x100, ZR 0x200, D-pad Left 0x1000, Up 0x2000, Right 0x4000, Down 0x8000.
 * Whether the game also derives edge (just-pressed) state from another field is not verified:
 * if a held bit is not acted on, check the mask with `mask` and report it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
#define _CRT_SECURE_NO_WARNINGS
#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "forge_pc.h"

#pragma comment(lib, "ws2_32.lib")

FORGE_PLUGIN_DEFINE_API

#define PLUGIN "dbgport"
#define GOT_INPUT 0x183931Cu /* GOT cell holding &input singleton pointer (main-relative) */
#define MASK_OFF 0x6BFCu
#define LINE_CAP 512
#define REPLY_CAP 1024

static SOCKET s_listen = INVALID_SOCKET;
static HANDLE s_thread;
static volatile LONG s_stop;
static volatile SOCKET s_client = INVALID_SOCKET; /* closed by forge_onUnload to unblock recv */

static CRITICAL_SECTION s_lock;
static CONDITION_VARIABLE s_done;
static char s_cmd[LINE_CAP];
static char s_reply[REPLY_CAP];
static int s_pending; /* 1 = command queued, 0 = reply ready / idle */

static uint32_t s_inject;      /* bits ORed in each update */
static int32_t s_inject_left;  /* < 0 = hold until release */

static void dlog(ForgeLogLevel level, const char* fmt, ...)
{
    char buf[512];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    forge_api->log(level, PLUGIN, buf);
}

static uint32_t main_base(void) { return forge_api->mem_getModuleBase("main"); }

static bool rd32(uint32_t addr, uint32_t* out) { return forge_api->mem_read(addr, out, 4); }

/* Absolute address of the input mask, or 0 while the singleton does not exist yet. */
static uint32_t mask_addr(void)
{
    uint32_t cell, obj;
    if (!rd32(main_base() + GOT_INPUT, &cell) || !rd32(cell, &obj) || !obj) {
        return 0;
    }
    return obj + MASK_OFF;
}

static bool parse_hex(const char* s, uint32_t* out)
{
    char* end;
    if (!s) {
        return false;
    }
    *out = (uint32_t)strtoul(s, &end, 16);
    return end != s && *end == 0;
}

static bool parse_dec(const char* s, int32_t* out)
{
    char* end;
    if (!s) {
        return false;
    }
    *out = (int32_t)strtol(s, &end, 10);
    return end != s && *end == 0;
}

static void dump(char* out, size_t cap, uint32_t addr, int32_t n)
{
    uint8_t buf[256];
    size_t at;
    if (n < 1 || n > 256) {
        snprintf(out, cap, "err n must be 1..256");
        return;
    }
    if (!forge_api->mem_read(addr, buf, (uint32_t)n)) {
        snprintf(out, cap, "err unreadable %08x", addr);
        return;
    }
    at = (size_t)snprintf(out, cap, "ok %08x", addr);
    for (int32_t i = 0; i < n && at + 4 < cap; i++) {
        at += (size_t)snprintf(out + at, cap - at, " %02x", buf[i]);
    }
}

/* Runs one command on the game thread. */
static void execute(char* line, char* out, size_t cap)
{
    char* argv[12];
    int argc = 0;
    uint32_t a, b;
    int32_t n;

    for (char* tok = strtok(line, " \t\r\n"); tok && argc < 12; tok = strtok(NULL, " \t\r\n")) {
        argv[argc++] = tok;
    }
    if (argc == 0) {
        snprintf(out, cap, "err empty");
    } else if (!strcmp(argv[0], "base")) {
        snprintf(out, cap, "ok %08x", main_base());
    } else if (!strcmp(argv[0], "mask")) {
        a = mask_addr();
        if (!a || !rd32(a, &b)) {
            snprintf(out, cap, "err input singleton not ready");
        } else {
            snprintf(out, cap, "ok %08x at %08x inject %08x left %d", b, a, s_inject, s_inject_left);
        }
    } else if (!strcmp(argv[0], "hold") && argc == 2 && parse_hex(argv[1], &a)) {
        s_inject = a;
        s_inject_left = -1;
        snprintf(out, cap, "ok hold %08x", a);
    } else if (!strcmp(argv[0], "tap") && argc == 3 && parse_hex(argv[1], &a) && parse_dec(argv[2], &n) && n > 0) {
        s_inject = a;
        s_inject_left = n;
        snprintf(out, cap, "ok tap %08x for %d", a, n);
    } else if (!strcmp(argv[0], "release")) {
        s_inject = 0;
        s_inject_left = 0;
        snprintf(out, cap, "ok release");
    } else if (!strcmp(argv[0], "rd") && argc == 3 && parse_hex(argv[1], &a) && parse_dec(argv[2], &n)) {
        dump(out, cap, a, n);
    } else if (!strcmp(argv[0], "rm") && argc == 3 && parse_hex(argv[1], &a) && parse_dec(argv[2], &n)) {
        dump(out, cap, main_base() + a, n);
    } else if (!strcmp(argv[0], "w32") && argc == 3 && parse_hex(argv[1], &a) && parse_hex(argv[2], &b)) {
        if (forge_api->mem_write(a, &b, 4)) {
            dlog(FORGE_LOG_INFO, "w32 %08x = %08x", a, b);
            snprintf(out, cap, "ok");
        } else {
            snprintf(out, cap, "err unwritable %08x", a);
        }
    } else if (!strcmp(argv[0], "ptr") && argc >= 2 && parse_hex(argv[1], &a)) {
        size_t at = (size_t)snprintf(out, cap, "ok");
        a += main_base();
        for (int i = 2; i <= argc; i++) {
            if (!rd32(a, &b)) {
                snprintf(out + at, cap - at, " [%08x]=unreadable", a);
                return;
            }
            at += (size_t)snprintf(out + at, cap - at, " [%08x]=%08x", a, b);
            if (i == argc) {
                break;
            }
            if (!parse_hex(argv[i], &a)) {
                snprintf(out + at, cap - at, " bad offset %s", argv[i]);
                return;
            }
            a += b;
        }
    } else {
        snprintf(out, cap, "err unknown or malformed command");
    }
}

/* Socket thread: queue one line, wait for the game thread's reply, send it back. */
static void serve(SOCKET c)
{
    char line[LINE_CAP];
    size_t len = 0;
    char ch;

    while (!s_stop && recv(c, &ch, 1, 0) == 1) {
        if (ch != '\n') {
            if (len + 1 < sizeof(line)) {
                line[len++] = ch;
            }
            continue;
        }
        line[len] = 0;
        len = 0;

        EnterCriticalSection(&s_lock);
        strcpy(s_cmd, line);
        s_pending = 1;
        bool ok = true;
        while (s_pending && ok) {
            ok = SleepConditionVariableCS(&s_done, &s_lock, 2000) != 0;
        }
        char reply[REPLY_CAP];
        if (s_pending) {
            s_pending = 0; /* drop it: the game thread is not updating */
            snprintf(reply, sizeof(reply), "err timeout (game not updating)");
        } else {
            snprintf(reply, sizeof(reply), "%s", s_reply);
        }
        LeaveCriticalSection(&s_lock);

        size_t rl = strlen(reply);
        reply[rl++] = '\n';
        if (send(c, reply, (int)rl, 0) != (int)rl) {
            break;
        }
    }
}

static DWORD WINAPI listen_thread(LPVOID unused)
{
    (void)unused;
    while (!s_stop) {
        SOCKET c = accept(s_listen, NULL, NULL);
        if (c == INVALID_SOCKET) {
            break; /* closesocket in forge_onUnload */
        }
        dlog(FORGE_LOG_INFO, "client connected");
        s_client = c;
        serve(c);
        s_client = INVALID_SOCKET;
        closesocket(c);
        dlog(FORGE_LOG_INFO, "client disconnected");
    }
    return 0;
}

FORGE_EXPORT void forge_onLoad(ForgePluginInfo* info)
{
    info->required_ver.major = FORGE_PC_VERSION_MAJOR;
    info->required_ver.minor = FORGE_PC_VERSION_MINOR;
    info->required_ver.patch = FORGE_PC_VERSION_PATCH;
    snprintf(info->name, sizeof(info->name), "DbgPort (127.0.0.1 debug port)");
}

FORGE_EXPORT void forge_onInit(void)
{
    WSADATA wsa;
    struct sockaddr_in addr;
    ForgeConfig* cfg = forge_api->config_open("dbgport");
    int32_t port = cfg ? forge_api->config_int(cfg, "net", "port", 47100) : 47100;

    InitializeCriticalSection(&s_lock);
    InitializeConditionVariable(&s_done);
    s_stop = 0;

    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        dlog(FORGE_LOG_ERROR, "WSAStartup failed");
        return;
    }
    s_listen = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons((u_short)port);
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK); /* loopback only, never 0.0.0.0 */
    if (s_listen == INVALID_SOCKET || bind(s_listen, (struct sockaddr*)&addr, sizeof(addr)) != 0 ||
        listen(s_listen, 1) != 0) {
        dlog(FORGE_LOG_ERROR, "cannot listen on 127.0.0.1:%d (error %d)", port, WSAGetLastError());
        if (s_listen != INVALID_SOCKET) {
            closesocket(s_listen);
            s_listen = INVALID_SOCKET;
        }
        WSACleanup();
        return;
    }
    s_thread = CreateThread(NULL, 0, listen_thread, NULL, 0, NULL);
    dlog(FORGE_LOG_INFO, "listening on 127.0.0.1:%d, main base %08x", port, main_base());
}

FORGE_EXPORT void forge_onUpdate(float dt)
{
    (void)dt;
    if (s_inject && s_inject_left != 0) {
        uint32_t a = mask_addr(), m;
        if (a && rd32(a, &m)) {
            m |= s_inject;
            forge_api->mem_write(a, &m, 4);
        }
        if (s_inject_left > 0 && --s_inject_left == 0) {
            s_inject = 0;
        }
    }
    if (s_listen == INVALID_SOCKET) {
        return;
    }
    EnterCriticalSection(&s_lock);
    if (s_pending) {
        execute(s_cmd, s_reply, sizeof(s_reply));
        s_pending = 0;
        WakeAllConditionVariable(&s_done);
    }
    LeaveCriticalSection(&s_lock);
}

FORGE_EXPORT void forge_onUnload(void)
{
    s_stop = 1;
    s_inject = 0;
    if (s_listen != INVALID_SOCKET) {
        closesocket(s_listen); /* unblocks accept */
        s_listen = INVALID_SOCKET;
    }
    if (s_client != INVALID_SOCKET) {
        shutdown(s_client, SD_BOTH); /* unblocks recv in serve */
    }
    if (s_thread) {
        WaitForSingleObject(s_thread, 3000);
        CloseHandle(s_thread);
        s_thread = NULL;
    }
    WSACleanup();
    DeleteCriticalSection(&s_lock);
    dlog(FORGE_LOG_INFO, "unload");
}
