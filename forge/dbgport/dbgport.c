/* dbgport: local debug port for the recompiled MHGU (1.4.0) PC build, as a Forge PC plugin.
 *
 * Listens on 127.0.0.1:<port> (default 47100; dbgport.ini [net] port). Only loopback is bound and
 * there is no authentication: any local process can press buttons and read/write game memory.
 * One client at a time, one text command per line, one reply line per command:
 *
 *   base                     main module base (hex)
 *   mask                     game input mask [[GOT 0x183931c]+0x6bfc] (hex), read-only view
 *   hold <bits>              OR <bits> into every nn::hid Npad state the game reads, until release
 *   tap <bits> <frames>      same for <frames> game updates, then stop
 *   stick <L|R> <x> <y> <frames>  force a stick (decimal, -32767..32767; frames 0 = until release)
 *   release                  stop all injection
 *   hooks                    which sdk GetNpadState(s) hooks are active and how often they fired
 *   rd <addr> <n>            hex dump n (1..256) bytes at guest address addr
 *   rm <off> <n>             same, at main base + off (addresses from the static notes)
 *   w32 <addr> <value>       write a u32 at guest address addr
 *   ptr <off> [o1 o2 ...]    follow [[base+off]+o1]+o2...; prints each step
 * Numbers are hex (0x optional) except <n> and <updates>, which are decimal.
 *
 * Every command runs on the game thread inside forge_onUpdate; the socket thread only queues it
 * and waits up to 2 s for the reply (the game must be running, not paused in the Forge menu).
 * Injection happens in post hooks on the sdk's nn::hid::GetNpadState / GetNpadStates (FullKey,
 * Handheld, JoyDual): the bits are ORed into the returned state, so the game sees them exactly
 * like a real pad, whether or not the window has focus. Durations count game updates (frames),
 * not milliseconds. State layout (NpadFullKeyState etc.): s64 sampling @0, u64 buttons @8,
 * stick L {s32 x, y} @0x10, stick R @0x18, attributes @0x20, 0x28 bytes.
 * Bits are raw NpadButton: A 0x1, B 0x2, X 0x4, Y 0x8, L 0x40, R 0x80, ZL 0x100, ZR 0x200,
 * Plus 0x400, Minus 0x800, D-pad Left 0x1000, Up 0x2000, Right 0x4000, Down 0x8000.
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

#include "shot.h"

/* `shot [path]`: handled on the socket thread; the copy happens in forge_onPresent, so it also
 * works while the game logic is paused (Forge menu) or the window is covered / unfocused. */
static void shot_command(const char* line, char* out, size_t cap)
{
    const char* path = line + 4;
    while (*path == ' ') {
        path++;
    }
    if (!*path) {
        path = "G:\\omp works\\.tmp\\mhgu-scratch\\shot.bmp";
    }
    snprintf(s_shot_path, sizeof(s_shot_path), "%s", path);
    InterlockedExchange(&s_shot_state, 0);
    InterlockedExchange(&s_shot_req, 1);
    for (int i = 0; i < 300 && s_shot_state != 2 && s_shot_state != 3; i++) {
        Sleep(10);
    }
    if (s_shot_state == 2 || s_shot_state == 3) {
        snprintf(out, cap, "%s", s_shot_msg);
    } else {
        InterlockedExchange(&s_shot_req, 0);
        snprintf(out, cap, "err timeout (no present in 3 s; window minimised?)");
    }
    InterlockedExchange(&s_shot_state, 0);
}

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

static void dlog(ForgeLogLevel level, const char* fmt, ...)
{
    char buf[512];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    forge_api->log(level, PLUGIN, buf);
}

static uint32_t s_inject;      /* button bits ORed into every Npad state read */
static int32_t s_inject_left;  /* game updates left; < 0 = hold until release */

typedef struct StickOverride {
    bool on;
    int32_t x, y;
    int32_t left; /* game updates left; < 0 = until release */
} StickOverride;
static StickOverride s_stick[2]; /* 0 = L, 1 = R */

/* sdk-relative entry points of the public nn::hid Npad readers (sdk 1.4.0 dynsym). multi = the
 * GetNpadStates(State*, int, const u32&) form, which returns the number of states written. */
typedef struct NpadHook {
    const char* name;
    uint32_t sdk_off;
    bool multi;
    ForgeHook* hook;
    uint32_t fired;
    uint32_t last_out, last_r0, last_lr, last_r1; /* args[0], return r0, caller LR, r1 at entry */
    uint64_t last_buttons;        /* buttons word after injection */
} NpadHook;
static NpadHook s_hooks[] = {
    {"GetNpadState(FullKey)", 0x257B80u, false},
    {"GetNpadStates(FullKey)", 0x257BD8u, true},
    {"GetNpadState(Handheld)", 0x257C34u, false},
    {"GetNpadStates(Handheld)", 0x257C8Cu, true},
    {"GetNpadState(JoyDual)", 0x258138u, false},
    {"GetNpadStates(JoyDual)", 0x258190u, true},
};
#define HOOK_COUNT (sizeof(s_hooks) / sizeof(s_hooks[0]))
#define NPAD_STATE_SIZE 0x28u
#define NPAD_MAX_STATES 16

/* Apply the current injection to one Npad state at guest address st. */
static void inject_state(uint32_t st)
{
    uint8_t buf[NPAD_STATE_SIZE];
    if (!forge_api->mem_read(st, buf, sizeof(buf))) {
        return;
    }
    uint64_t buttons;
    memcpy(&buttons, buf + 8, 8);
    buttons |= s_inject;
    memcpy(buf + 8, &buttons, 8);
    if (s_inject || s_stick[0].on || s_stick[1].on) {
        /* attributes @0x20: bit0 IsConnected. The caller (main 0x86d37c) stores attr&1 as the
         * connected flag and ignores the buttons of a disconnected pad. */
        buf[0x20] |= 1;
    }
    for (int i = 0; i < 2; i++) {
        if (s_stick[i].on) {
            memcpy(buf + 0x10 + 8 * i, &s_stick[i].x, 4);
            memcpy(buf + 0x14 + 8 * i, &s_stick[i].y, 4);
        }
    }
    forge_api->mem_write(st, buf, sizeof(buf));
}

static bool injecting(void) { return s_inject || s_stick[0].on || s_stick[1].on; }

/* post hook: args[0] = State* out; multi readers return the count in r0. */
static void npad_post(ForgeCpu* cpu, const uint32_t args[4], void* user)
{
    NpadHook* h = (NpadHook*)user;
    h->fired++;
    h->last_out = args[0];
    h->last_r0 = cpu->r[0];
    h->last_lr = args[4];
    h->last_r1 = args[1];
    if (injecting()) {
        uint32_t n = h->multi ? cpu->r[0] : 1;
        if (n > NPAD_MAX_STATES) {
            n = NPAD_MAX_STATES;
        }
        for (uint32_t i = 0; i < n; i++) {
            inject_state(args[0] + i * NPAD_STATE_SIZE);
        }
    }
    forge_api->mem_read(args[0] + 8, &h->last_buttons, 8);
}

static void hooks_install(void)
{
    const uint32_t sdk = forge_api->mem_getModuleBase("sdk");
    if (!sdk) {
        dlog(FORGE_LOG_ERROR, "sdk module base unknown: no input injection");
        return;
    }
    for (size_t i = 0; i < HOOK_COUNT; i++) {
        s_hooks[i].hook = forge_api->hook_create(sdk + s_hooks[i].sdk_off, NULL, npad_post, &s_hooks[i]);
        dlog(s_hooks[i].hook ? FORGE_LOG_INFO : FORGE_LOG_WARN, "hook %s at sdk+%06x: %s", s_hooks[i].name,
             s_hooks[i].sdk_off, s_hooks[i].hook ? "ok" : "failed (not a block start)");
    }
}

static void hooks_remove(void)
{
    for (size_t i = 0; i < HOOK_COUNT; i++) {
        if (s_hooks[i].hook) {
            forge_api->hook_enable(s_hooks[i].hook, false);
            s_hooks[i].hook = NULL;
        }
    }
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
    int32_t n, x, y;

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
    } else if (!strcmp(argv[0], "stick") && argc == 5 && (argv[1][0] == 'L' || argv[1][0] == 'R') &&
               parse_dec(argv[2], &x) && parse_dec(argv[3], &y) && parse_dec(argv[4], &n) && n >= 0 &&
               x >= -32767 && x <= 32767 && y >= -32767 && y <= 32767) {
        StickOverride* s = &s_stick[argv[1][0] == 'R'];
        s->x = x;
        s->y = y;
        s->left = n ? n : -1;
        s->on = true;
        snprintf(out, cap, "ok stick %c %d %d for %d", argv[1][0], x, y, n);
    } else if (!strcmp(argv[0], "release")) {
        s_inject = 0;
        s_inject_left = 0;
        s_stick[0].on = s_stick[1].on = false;
        snprintf(out, cap, "ok release");
    } else if (!strcmp(argv[0], "hooks")) {
        size_t at = (size_t)snprintf(out, cap, "ok");
        for (size_t i = 0; i < HOOK_COUNT && at < cap; i++) {
            at += (size_t)snprintf(out + at, cap - at, " %s=%s/%u", s_hooks[i].name, s_hooks[i].hook ? "on" : "off",
                                   s_hooks[i].fired);
        }
        for (size_t i = 0; i < HOOK_COUNT && at < cap; i++) {
            if (s_hooks[i].fired) {
                at += (size_t)snprintf(out + at, cap - at, " | %s out=%08x r1=%08x r0=%08x lr=%08x btn=%llx",
                                       s_hooks[i].name, s_hooks[i].last_out, s_hooks[i].last_r1,
                                       s_hooks[i].last_r0, s_hooks[i].last_lr,
                                       (unsigned long long)s_hooks[i].last_buttons);
            }
        }
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

        if (!strncmp(line, "shot", 4) && (line[4] == 0 || line[4] == ' ')) {
            char reply[REPLY_CAP];
            shot_command(line, reply, sizeof(reply) - 1);
            size_t rl = strlen(reply);
            reply[rl++] = '\n';
            if (send(c, reply, (int)rl, 0) != (int)rl) {
                break;
            }
            continue;
        }

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
    hooks_install();
}

FORGE_EXPORT void forge_onUpdate(float dt)
{
    (void)dt;
    /* durations count game updates; the hooks apply whatever is active this update */
    if (s_inject_left > 0 && --s_inject_left == 0) {
        s_inject = 0;
    }
    for (int i = 0; i < 2; i++) {
        if (s_stick[i].on && s_stick[i].left > 0 && --s_stick[i].left == 0) {
            s_stick[i].on = false;
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

FORGE_EXPORT void forge_onPresent(const ForgePresent* p)
{
    if (p->size >= sizeof(ForgePresent)) {
        shot_present(p);
    }
}

FORGE_EXPORT void forge_onUnload(void)
{
    s_stop = 1;
    s_inject = 0;
    s_stick[0].on = s_stick[1].on = false;
    hooks_remove();
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
    if (s_vk.device && s_vk.DeviceWaitIdle) {
        s_vk.DeviceWaitIdle(s_vk.device);
        vk_free_buf();
    }
    DeleteCriticalSection(&s_lock);
    dlog(FORGE_LOG_INFO, "unload");
}
