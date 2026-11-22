# Review: multiplayer claims C1..C7 (SUYU-GURecomp / MHGU export)

Reviewer: V6BridgeReview.
Sources: `G:/omp works/.tmp/ext/SUYU-GURecomp` (shallow clone, `refs/heads/main` = `35015f1488eeabc226f815fbadc2f348ebb948f8`) and the read-only export `I:/suyu/export/MONSTER HUNTER GENERATIONS ULTIMATE`.
No `run` tool was attached to this session, so every command below is a `read`/`grep`/`glob` over the tree or the export, or an HTTP fetch of an upstream primary source.

Verdict tags: [C] confirmed by primary source + command; [B] strong inference; [I] inference; [U] unknown.

---

## 0. Version-skew check (does the tree describe the shipped exe?)

The claim set is only meaningful if the shipped `MONSTER HUNTER GENERATIONS ULTIMATE.exe` was built from this tree. Three independent checks say yes:

1. Commit hash in the binary's own runtime log:
   - `read I:/suyu/export/.../user/log/27836_suyu_log.txt:1-40` line 20:
     `suyu Version: suyu | build010-35015f1488-build010 (Vulkan)`
   - `read .git/refs/heads/main` -> `35015f1488eeabc226f815fbadc2f348ebb948f8`
   - GitHub API `https://api.github.com/repos/GURecomp/SUYU-GURecomp/commits/v0.10.0-test` -> `"sha": "35015f1488eeabc226f815fbadc2f348ebb948f8"`. So `v0.10.0-test` **is** this exact commit (the `build010` prefix in the version string is the release tag, which does not appear anywhere in the tree: `grep build010` over the repo -> no matches).
2. Source line numbers stamped into the log match HEAD byte-for-byte at the lines I checked:
   - log `multiplayer.cpp:582` = HEAD `src/suyu_cmd/multiplayer.cpp:579-582` (the `SetupLdnBackend` LOG_INFO whose closing paren is on 582);
   - log `suyu.cpp:936` ("Window created") = HEAD `src/suyu_cmd/suyu.cpp:936`.
3. `docs/a32recomp/CHANGELOG.md:1` = `## 0.10.0-test`, Date 2026-10-22; release API `published_at: 2026-10-22T13:35:19Z`; clone reflog epoch 1792761231 = 2026-10-22.
4. Artifact-level: the shipped ini carries `; layout 4` (`game_settings.ini:4`) and the template's marker is `kLayoutMarker = "; layout 4"` (`game_settings_ini.cpp:22`); it also contains `online_server_host` (`game_settings.ini:170`), a key introduced by the 0.10.0 commit (commit API patch). A 0.9.x-generated ini would have neither.

[C] The shipped build is the 0.10.0-test release commit. No skew between tree and binary for the parts below (each claim additionally cites the code path the binary runs, and the ini/format evidence below is from the export itself).

---

## C1. Build identity and the three multiplayer paths — **CONFIRMED**

| Sub-claim | Verdict | Evidence |
|---|---|---|
| Export is SUYU-GURecomp 0.10.0-test | **CONFIRMED [C]** | Version log line above; tag commit equality; `CHANGELOG.md:1`. |
| It is a static recompile (game code compiled into the exe, HLE backend) | **CONFIRMED [C]** | `user/log/27836_suyu_log.txt:5-8`: `Static recompiled module [0] rtld — ArmRecomp active` ... `[3] sdk — ArmRecomp active`; `README_NATIVE_EXPORT.txt` ("statically recompiled to x86 machine code and linked into ...exe"); `src/core/arm/recomp/` exists in the tree. |
| (a) game's Local Play over a suyu room, ENet, UDP 24872 | **CONFIRMED [C]** | `src/network/room.h:26` `constexpr u16 DefaultRoomPort = 24872;`; `src/core/arm/recomp/game_settings_ini.cpp:161` default `24872`; `src/network/room.cpp` is ENet (`ENetHost* server`, `enet_host_create`, `enet_host_service`) with `ENetAddress`/`ENET_HOST_ANY`; `src/network/room_member.cpp:593-597` `ENetAddress address{}; enet_address_set_host(...)`. ENet is UDP by construction (ENet = "reliable UDP"; `enet.h` `ENET_SOCKET_TYPE_DATAGRAM`). |
| (b) RyuLdn so Ryujinx players share lobbies, TCP 30456 | **CONFIRMED [C]** | `src/network/ryuldn/protocol.h:42` `DefaultPort = 30456`; `protocol.h:20-22` "Clients keep one TCP connection to the server, which owns the lobbies and relays the games' traffic"; `src/network/ryuldn/socket_util.cpp:73-77` `hints.ai_family = AF_INET; hints.ai_socktype = SOCK_STREAM;`. |
| (c) experimental NEX redirect via `[Multiplayer] online_server_host` (MHGU-NEX is the built-in equivalent) | **CONFIRMED [C]** | `game_settings.ini:167-170` declares `online_server_host`; `src/core/hle/service/sockets/sfdnsres.cpp:126-160` `ReplacementHostFor()` returns the value for blocked/Nintendo names and logs `[NEXPROBE] resolve ... (redirected)`; `game_settings_ini.cpp:172-176` is exactly the row added by the 0.10.0 commit (commit API patch, `game_settings_ini.cpp` hunk at line ~169); `CHANGELOG.md:6` names MHGU-NEX. |

Competing explanation considered (falsification): "the third path is only a documentation promise". Ruled out: the ini key is read on the live DNS path (`sfdnsres.cpp:128`), not just documented; the 0.10.0 commit that shipped the binary adds the key and its reader, and the shipped ini contains the key.

Caveat (not a refutation): (a)+(b) are two *transports under the same Local Play feature*; only (c) is a different game feature (online). The claim's wording "three multiplayer paths" is defensible but (a)/(b) are mutually exclusive only per-lobby, not per-mode: mode `auto` runs both.

---

## C2. `backend = room` in the shipped ini disables crossplay; `ryuldn_public` is read but not templated — **CONFIRMED**

Evidence:

1. Shipped ini: `grep backend|ryuldn_public game_settings.ini` ->
   `:166  backend = room`, `:154 port = 24872`, `:174 ryuldn_port = 30456`; **no `ryuldn_public` line in the file at all**.
2. Template: `src/core/arm/recomp/game_settings_ini.cpp:169-184` declares `backend` (default `"room"`), `online_server_host`, `ryuldn_host`, `ryuldn_port`, `ryuldn_servers`, `ryuldn_passphrase` — and **no row for `ryuldn_public`**. `MakeRows()` is what writes/repairs the file (`Rebuild`/`AddMissing` in the same file), so a generated ini cannot contain it.
3. Runtime read: `src/suyu_cmd/multiplayer.cpp:313` `if (Trimmed(GS::Value("Multiplayer", "ryuldn_public")) != "off") { add(DefaultRyuLdnHost, port); }` — default (absent) = public server included. The key is documented to users (`docs/a32recomp/RYULDN.md` Settings table) and even named in the F10 help text (`src/suyu_cmd/game_menu.cpp:672`), yet the generated file never shows it. Users must add it by hand. (The reader does not whitelist keys: `GameSettings::ReadValue` scans the file text, `game_settings.cpp:136-197`.)
4. `backend = room` really means "RyuLdn not in use":
   - `SetupLdnBackend()` (`multiplayer.cpp:553-589`) parses `backend`; `room` -> `LdnMode::Room`; unknown value logs an error and falls back to room (`multiplayer.h:75`).
   - The LDN service picks its state machine from that mode: `src/core/hle/service/ldn/user_local_communication_service.cpp:37-55` — `Room` instantiates `LANDiscovery` only; `RyuLdnNetwork` is only constructed for `RyuLdn`/`Auto`.
   - Data plane: `src/network/ldn_backend.cpp:145-149` `HybridLdnBackend::Resolve()` returns `LdnTransport::Room` unconditionally in `Room` mode.
   - Hosting: `multiplayer.cpp:502-510` starts this PC's RyuLdn server only `if (g_mode != LdnMode::Room ...)`.
   - The menu shows the consequence: `game_menu.cpp:609-611` `"Local play is set to suyu rooms only (ini backend = room)."`
   - Accepted values include `auto`: `multiplayer.cpp:555-566` (`backend == "ryuldn"` / `"room"` / else-if not empty and not `"auto"` -> error), and `ModeText()` (`multiplayer.cpp:232-241`) maps `Auto -> "auto"`, `RyuLdn -> "ryuldn"`, else `"room"`. The menu labels exist: `game_menu.cpp:731-733` `"Suyu room" / "Ryujinx LDN" / "Both (automatic)"`, and switching calls `SetLdnMode()` which persists via `GS::SetValue("Multiplayer","backend", ModeText(mode))` (`multiplayer.cpp:616`).
   - Live proof that the shipped exe accepts `auto` and reports it: `user/log/18004_suyu_log.txt:31` `multiplayer: local play over auto (RyuLdn server 127.0.0.1:30456 + 1 more)` (i.e. own server + public server). The other seven logs show `local play over room (RyuLdn server ldn.ryujinx.app:30456)`, which is only a report of the configured server — the RyuLdn backend object is constructed at start but never connected in room mode (`SetupLdnBackend` comment: "Both transports are always set up (a RyuLdn server is only contacted once it is used)").

Precision note: the `backend` row's own comment (`game_settings_ini.cpp:170`) lists only `room | ryuldn` and omits `auto`, even though `auto` is accepted and is written by the menu. And `docs/a32recomp/RYULDN.md` contradicts both the ini default and this claim twice: "There is nothing to switch. Local play uses a suyu room and RyuLdn servers at the same time" and the Settings table calls `empty/auto` "the default". The **shipped file** is the authority and says `room`; the doc is stale or aspirational.

Competing explanation for the log line: "the log says RyuLdn server, so RyuLdn is active in room mode." Refuted by the three code points above (mode selection, Resolve, hosting hook) — the log prints `ConfiguredRyuLdnServers()[0]` regardless of mode.

---

## C3. Reachability: room = host UDP 24872 only; RyuLdn hosting = host TCP 30456 — **REFUTED as stated** (room and NEX clauses confirmed; the RyuLdn clause is conditional and false in the shipped default)

Wire semantics, room (confirmed):

- `src/network/room.cpp:1110-1120` host: `ENetAddress address; address.host = ENET_HOST_ANY; ... address.port = server_port; enet_host_create(&address, max_connections + 1, NumChannels, 0, 0)`. `ENET_HOST_ANY = 0` (IPv4 wildcard, `enet.h` v1.3.18).
- `room_member.cpp:593-597` client: one `ENetAddress` to the host and `enet_host_connect`.
- Broadcast fan-out by the host: `room.cpp:871-929` `HandleProxyPacket` / `:931-985` `HandleLdnPacket` — `if (broadcast) { for members except sender: enet_peer_send }` else unicast to the member owning the destination fake IP, else to the gateway. Star confirmed.
- Therefore only the host must accept inbound UDP on the room port; clients only need outbound + NAT mapping. [C]

Wire semantics, RyuLdn (this is where the claim breaks):

- Topology: clients connect to a **master server**, which owns the lobbies and **relays** the traffic (`protocol.h:20-22`). With the shipped default `ryuldn_host = ldn.ryujinx.app` (`game_settings.ini:172`; template default `game_settings_ini.cpp:177`), `ConfiguredRyuLdnServers()` returns `ldn.ryujinx.app` as the main server (`multiplayer.cpp:289-291`), so `OwnServerIsMain()` is false (`multiplayer.cpp:325-327`) and hosting does **not** open a local listener (`multiplayer.cpp:502-510`, `:858-866`). The lobby lives on Ryujinx's public server: **no inbound port on the host at all**.
- A local TCP 30456 listener exists only when the user explicitly picks "Host for friends (Radmin VPN)" (`game_menu.cpp:517-520`) or sets `ryuldn_host = self`/empty/own address (`multiplayer.cpp:292-306`), which does `StartOwnServer()` -> `Server::Start("", port, ...)` -> `ListenTcp("", 30456)` = `INADDR_ANY`, `AF_INET` (`socket_util.cpp:193-207`). In that mode the claim is right: friends connect to that TCP port on the host.
- Third case: joining a Ryujinx host that runs its own P2P proxy — this build supports the `ExternalProxy` P2P link (`ryuldn/client.cpp:44-46`, `:296-299`, `StartP2p` `ConnectTcp`), and the project's own doc states "the host's proxy port must be reachable, as for Ryujinx joiners" (`RYULDN.md`, "What works and what doesn't"). That port is whatever the Ryujinx host advertises, not necessarily 30456.

So the sentence "RyuLdn hosting needs TCP 30456 reachable on the host" is false for the shipped default (public server = relay, zero inbound) and true only in own-server mode. It is not a property of "RyuLdn hosting" as such.

VPN / FRP wording: supported by the product docs for the room path (`docs/a32recomp/INSTALL.md:172-173`: "It works over the internet through a VPN such as Radmin VPN or ZeroTier"). FRP is a TCP/UDP forwarder outside the repo; no code proof either way, but it is a plain port map, so "can supply that reachability" is [I] (needs a UDP tunnel for the room, TCP for the RyuLdn own-server).

NEX clause (confirmed): `https://github.com/GURecomp/MHGU-NEX/blob/main/SETUP.md` (fetched; 35 lines) says verbatim:
- "A machine that is **not one of the players**. The game drops UDP packets whose source IP equals the NAT-check server's IP..."
- "For play over the internet, a host with a **public IPv4** address. Inbound ports must be open: TCP `443`, UDP `10025`, `10125`, `33334`, `33335`"
- "Direct peer-to-peer play depends on the players' NATs. Tunnel services that hide client IPs are not supported."
That matches "separate machine + public IPv4 + direct peer-to-peer" and matches "Radmin/ZeroTier/FRP don't help" for tunnels that hide client IPs. The emulator side of the redirect is `sfdnsres.cpp:126-160`.

Competing explanation for the RyuLdn clause: the author meant "hosting **your own** RyuLdn server". Evidence that would settle it: netstat/`GetStatus()` on the host while hosting in public mode (should show no 30456 listener; `StartOwnServer` not called) vs own-server mode (listener present). Code says exactly that; a live check is still listed below because it is the user-visible behaviour.

---

## C4. IPv6 unusable at every layer — **CONFIRMED**

| Claim | Verdict | Evidence |
|---|---|---|
| HLE BSD `Domain` has no INET6 | **CONFIRMED [C]** | `src/core/hle/service/sockets/sockets.h:54-57`: `enum class Domain : u32 { Unspecified = 0, INET = 2, };` (nothing else). |
| `sfdnsres` hardcodes `h_addrtype = Domain::INET` | **CONFIRMED [C]** | `sfdnsres.cpp:217`: `Append<u16_be>(data, static_cast<u16>(Domain::INET)); // h_addrtype`; `:218` `h_length = sizeof(Network::IPv4Address)`. |
| suyu room is ENet (IPv4 only) | **CONFIRMED [C]** | ENet pinned to `lsalzman/enet v1.3.18` (`cpmfile.json:68-74`; `.gitmodules:6-8`; the submodule dir is empty in this shallow clone, so I fetched the exact version from Debian sources: `enet.h` 1.3.18 has `typedef struct _ENetAddress { enet_uint32 host; enet_uint16 port; } ENetAddress;` and `ENET_HOST_ANY 0`). `room_member.cpp:593-597` uses that struct; the room's packets carry `IPv4Address` only (`room_member.h:32-47`). |
| RyuLdn client `ai_family = AF_INET`; server bind `AF_INET` + `inet_pton(AF_INET,...)` rejects IPv6 | **CONFIRMED [C]** | `socket_util.cpp:74-76` `hints.ai_family = AF_INET; // the master servers are IPv4`; `:193-202` `sockaddr_in`, `sin_family = AF_INET`, `inet_pton(AF_INET, address.c_str(), ...)` else error `"not an IPv4 address: {}"`. |
| Whole layer stack | **CONFIRMED [C] with one extra** | The room's invite/config path cannot even express an IPv6 literal: `multiplayer.cpp:1121-1144` splits on the last `:` for the port, so `[::1]:24872` becomes host `[::1]` and `enet_address_set_host` (AF_INET) cannot resolve it; `ParseServer` (`multiplayer.cpp:249-265`) has the same shape. |

No `INET6` / `AF_INET6` token appears under `src/core/hle/service/sockets`, `src/core/internal_network` or `src/network` (grep), and nothing maps the guest to an IPv6 socket family.

Competing explanation: "the online/NEX path uses real host sockets, so it could be IPv6." Refuted for the guest: real sockets are still created through the same `Domain` enum (`bsd.cpp:587-601` -> `Translate(domain)`), which has no INET6 value, so the guest cannot ask for an IPv6 socket at all.

---

## C5. The right place for an IPv6 transport is a new `LdnBackend`, not TUN/NAT46; topology must be measured — **CONFIRMED** (one count corrected)

1. Interface: `src/network/ldn_backend.h:24-60`. Actual virtual set:
   - pure: `IsConnected`, `GetFakeIpAddress`, `SendProxyPacket`, `SendLdnPacket`, `BindOnProxyPacketReceived`, `BindOnLdnPacketReceived`, `Unbind(CallbackHandle<ProxyPacket>)`, `Unbind(CallbackHandle<LDNPacket>)` = **8 pure**
   - one optional override with a default: `GetFakeSubnetMask()`.
   So "~6 virtuals over ProxyPacket/LDNPacket" undercounts but the substance (a small, whole-run transport interface over exactly those two packet types) is right. [C]
2. "The game's Local Play traffic never leaves the emulator as a Windows socket":
   - `bsd.cpp:587-601`: on `Socket()`, `const bool proxy = Network::GetLdnBackend()->IsConnected(); if (proxy) descriptor.socket = std::make_shared<Network::ProxySocket>();` — a pure in-process socket object, no host socket is created for it in that branch.
   - `socket_proxy.cpp:191-195, 206-240`: `SendTo` only builds a `ProxyPacket` and calls `backend->SendProxyPacket` (plus the census hook); `Connect`/`Accept`/`Listen` are stubs. No `socket()`/`sendto()` anywhere in `ProxySocket`.
   - The emulated network is IPv4-only anyway (`GetFakeIpAddress` returns `IPv4Address`), and the guest's addresses are rewritten to the backend's fake IP (`socket_proxy.cpp:233-240`).
   - So a TUN/NAT46 driver would sit *below* a layer the guest never reaches; a new backend is the correct seam. [C]
3. Caveat (worth stating, does not overturn the claim): the decision is made **once, at socket creation** (`bsd.cpp:587`). A socket the guest opens while no lobby is active is a real `Network::Socket`. The claim therefore holds for Local Play sockets created in a lobby; whether the game can create any of them earlier is exactly what the census's `proxy`/`real` column measures (see C6). [B] for "always", [C] for the mechanism.
4. "Whether a full mesh or a host-star is needed is not knowable a priori and must be measured": correct as an engineering statement [I]; the tool to measure it exists (`ldn_census.cpp:116-140`: summary line `# summary: proxied TCP sockets: ...; broadcast packets sent:` at `:131-132` plus `# unicast <src> -> <dsts>` at `:133-140`), so the recommendation is actionable.

Note: the claim "NOT a TUN/NAT46 driver" is a design judgement, not a code fact. What the code proves is that a TUN driver would not see the guest's Local Play datagrams at all, because they are consumed by `ProxySocket` before any host socket exists. That is the strongest form of the argument and it holds.

---

## C6. `ldn_census` exists and is gated by `[Diagnostics] diagnostics` — **CONFIRMED** (two precision notes)

Implementation: `src/core/internal_network/ldn_census.cpp`, header `ldn_census.h`.

| Claim | Verdict | Evidence |
|---|---|---|
| `[Diagnostics] diagnostics = true` enables it; old `[Debug]` also accepted | **CONFIRMED [C]** | `ldn_census.cpp:179-182` `Enabled()` = `Core::GameSettings::DiagnosticsEnabled()`; `game_settings.cpp:843-848` reads `ReadValue("Debug","diagnostics")` and accepts `true/1/yes/on`. The `[Debug]`/`[Diagnostics]` equivalence is structural: `ReadValue` (`game_settings.cpp:142-143`) compares through `Ini::Canonical(section,key)`, and `Canonical` (`game_settings_ini.cpp:384-388`) maps `[Debug]` to the row's section when `row->legacy == "Debug"`; the `diagnostics` row is declared `{"Diagnostics","diagnostics","false",..., K::Advanced, D}` with `D = "Debug"` (`game_settings_ini.cpp:16`, `:139-141`). So both sections are read, and the value is cached at first use (`static const bool`). |
| `ldn_census.txt` in the export's `user/` folder | **CONFIRMED [C]** | `ldn_census.cpp:97-101`: `GetSuyuPath(SuyuPath::SuyuDir) / "ldn_census.txt"`; `path_util.h:16-39` `SuyuDir = EdenDir`; the export sets `EdenDir` to `<exe>/user` only under `SUYU_CMD_STATIC_RECOMP` using `GetModuleFileNameW` (`suyu.cpp:434-458`, `:439`, `:458`), and the export contains `user/config`, `user/log`, `user/nand`... created by that code. |
| every 10 s | **CONFIRMED [C]** | `StartWriterLocked()` (`ldn_census.cpp:163-177`): `for(;;){ sleep_for(10s); lock; WriteLocked(); }` at `:169-170` on a detached thread. Note: started lazily by the first event (`OnSocket`/`OnCall`/`OnPacket`/`OnLdnState`), so no file appears until the game opens a socket. |
| proxied-vs-real sockets, TCP usage | **CONFIRMED [C]** | Sockets section columns `fd  created_s  domain/type/protocol  proxy|real  calls (count)`; `OnSocket` is called from `bsd.cpp:600-601` with the same `proxy` flag used to pick `ProxySocket`; TCP summary at `ldn_census.cpp:116-132` (`proxied TCP sockets: YES/none`, checks `type == 1 || protocol == 6`, printed at `:131`). |
| every proxied flow: src->dst, broadcast, packets, bytes, size min..max | **CONFIRMED [C]** | `FlowKey = (protocol, src ip, src port, dst ip, dst port, broadcast)` (`ldn_census.cpp:39-40`); `WriteFlows` (`:88-96`) prints `proto  src  dst  bcast|-  packets  bytes  min..max  first..last`; `Record` (`:72-86`) accumulates exactly those; called from `ProxySocket` on send (`socket_proxy.cpp:228`) and receive (`:44`). Header says sizes are the game payload before the room's zstd compression. |
| LDN states | **CONFIRMED [C], room path only** | `OnLdnState` is called only from `src/core/hle/service/ldn/lan_discovery.cpp:84-86` (the room/LANDiscovery state machine). In RyuLdn mode `RyuLdnNetwork` calls it nowhere (`grep OnLdnState src` -> only those two files), so the `## LDN states` section stays empty there. |
| Purpose: "TCP or UDP only?" / "guest-to-guest or only to the host?" | **CONFIRMED [C]** | `ldn_census.h:13-22` says exactly those two questions; the file's summary implements them (`ldn_census.cpp:116-140`: proxy TCP flag at `:131`, unicast peer sets per source at `:133-140`). |

Precision notes: (a) the file's own header line still says `([Debug] diagnostics)` although the key now lives in `[Diagnostics]` — cosmetic; (b) the state lines are room-only, so in a RyuLdn lobby the census reports flows and sockets but no LDN states; (c) `Enabled()` is a cached static, so toggling the ini needs a restart (the ini text says "Next start" for similar keys, fine).

Cannot be verified without running: whether the game actually opens the LDN sockets *after* the backend connects (i.e. whether every local-play socket row says `proxy`), and whether guest-to-guest unicast appears. Those are exactly the questions the census answers at runtime.

---

## C7. No LDN MTU; existing backends hide it; payload ceiling MTU-72 — **CONFIRMED except the 72-byte constant (UNVERIFIED)**

| Sub-claim | Verdict | Evidence |
|---|---|---|
| `CommonNetworkInfo` is 0x30 with no mtu | **CONFIRMED [C]** | `src/core/hle/service/ldn/ldn_types.h:224-232`: `MacAddress bssid; Ssid ssid; WifiChannel channel; LinkLevel link_level; PackedNetworkType network_type; INSERT_PADDING_BYTES_NOINIT(0x4);` `static_assert(sizeof(CommonNetworkInfo) == 0x30)`. `LdnNetworkInfo` (0x430) and `NetworkInfo` (0x480) also have no mtu field (`ldn_types.h:249-279`). |
| zero `mtu` hits in the LDN/proxy/network tree | **CONFIRMED [C]** | `grep "mtu\|MTU" src/network; src/core/internal_network; src/core/hle/service/ldn` -> no matches. A later whole-`src` case-insensitive grep finds exactly one unrelated field, nifm's (next row). |
| A raw-UDP transport cannot rely on the game shrinking datagrams | **CONFIRMED [C] with a counter-detail** | There is no LDN-level MTU, but the guest is told **1500** by nifm: `nifm.cpp:156-162` `struct IpSettingData { ...; u16 mtu{}; }` and `nifm.cpp:703` `.mtu{1500}` in `GetNetworkProfile`. So the game may size to a hardcoded 1500 regardless of the real path — which is precisely why a transport cannot rely on it over a tunnel with a smaller MTU. The claim's conclusion stands; the phrase "zero mtu hits in the LDN/proxy/network tree" must not be read as "no MTU anywhere". |
| Room sends everything RELIABLE; ENet fragments/reassembles | **CONFIRMED [C]** | `room.cpp:892-893` (proxy relay), `:948-949` (LDN relay), `:1013-1014` (chat) all `ENET_PACKET_FLAG_RELIABLE`; client side `room_member.cpp:265-266`. ENet 1.3.18: `ENET_HOST_DEFAULT_MTU = 1392`, and `ENET_PACKET_FLAG_UNRELIABLE_FRAGMENT` is documented as "fragment using unreliable (instead of reliable) sends if it exceeds the MTU" — i.e. oversize reliable packets are fragmented reliably by default. Framing overhead is real: `ENetProtocolHeader` 4 B + `ENetProtocolSendFragment` 24 B = 28 B per fragment (`protocol.h` 1.3.18). |
| RyuLdn tunnels over TCP | **CONFIRMED [C]** | `protocol.h:20-22` ("one TCP connection ... relays"), `MaxPacketSize = 131072`, `MaxPayloadSize = MaxPacketSize - HeaderSize - 1` (`:39-41`), 12-byte header (`:34`); `socket_util.cpp:73-77` `SOCK_STREAM`; the P2P (`ExternalProxy`) link is also TCP (`client.cpp:44-46, 382-411`). |
| "payload ceiling = MTU - 72 (1428 at 1500, 1208 at 1280)" | **UNVERIFIED [U]** | Arithmetic is consistent (1500-72=1428, 1280-72=1208), but **no constant or derivation for 72 exists in the tree**: `grep 1428|1208 src` returns only unrelated numeric tables, and nothing computes a datagram budget. The overheads that *are* derivable: IP+UDP 28 B (IPv4) / 48 B (IPv6); + ENet 28 B for a fragmented reliable send (56 / 76 total, which already exceeds 72 in the IPv6 case); + a transport header of the new backend's choosing. Precedents in-tree: `ProxyDataHeader` = 0x14 = 20 B (`ryuldn/protocol.h:154-157`, `static_assert` at `:254`), RyuLdn packet header 12 B. So 72 is a plausible conservative budget (≈ IPv6+UDP 48 + a 20-byte body header + 4), not a measured or code-derived number. |
| "if measured payloads exceed the path ceiling the backend must implement its own fragmentation, not lower a cap silently" | **CONFIRMED as a requirement [B/I]** | It follows from the two facts above (no LDN MTU negotiation; the only thing hiding it today is ENet's fragmentation at its own 1392-byte MTU and RyuLdn's TCP stream). The census is the instrument for the measurement: `size min..max` per flow. |

Competing explanation for the 72 figure: it may have been derived from a specific tunnel (e.g. WireGuard-over-IPv6 = 80, ZeroTier L2 ~ 32+..., or ENet 1392-1320). None of these appear in the repo; a correct statement today would be "ceiling = path MTU − (IP+UDP headers) − backend header; measure the max payload with `ldn_census.txt` first". Evidence that would settle it: the same number with its arithmetic (which headers) and a measured `size max` from the census.

---

## Claims that need a live 2-player session to settle

1. **C1(a)** room path end to end: two machines, host UDP 24872 reachable, Gathering Hall local play joins and a quest starts.
2. **C1(b)** RyuLdn crossplay: one export + one Ryujinx on `ldn.ryujinx.app`, lobby visible, quest start; and the reverse (Ryujinx hosts).
3. **C1(c)** NEX path: export + MHGU-NEX on a separate public-IPv4 machine; check login, matchmaking, and that the NAT-check datagrams from `127.0.0.2/.3` aliases behave (the `[NEXPROBE]` log lines).
4. **C3** RyuLdn hosting: in the shipped default (public server) confirm **no** inbound port is needed (no listener on 30456, `GetStatus().running == false`); then in "Host for friends" mode confirm the listener and that a friend joins over Radmin/ZeroTier. Also confirm FRP/UDP forwarding works for the room.
5. **C5** whether every local-play socket is `proxy` (census `sockets` section) and whether the game is mesh or star (census `# unicast` summary) — needs a 3-player session for the mesh question.
6. **C6** that `user/ldn_census.txt` appears with diagnostics on, with the columns above, within ~10 s of the first socket; and that it is absent with diagnostics off.
7. **C7** the real `size min..max` per flow (that is the "measure first" step) and whether any flow exceeds 1428/1208/1392-28.

No live session is needed for C2, C4, or the interface/layout half of C5/C6; those are settled by the code above.

---

## Self-FalsificationCheck

- **C1**: tried to show the tree is newer than the binary (docs describing different behaviour). Found one such doc/ini mismatch (`RYULDN.md`), but the binary's own log embeds `35015f1488` and file:line stamps that match HEAD, and the tag commit is identical. The doc mismatch is reported under C2/C3 instead of being used as skew evidence.
- **C2**: tried to falsify "room means RyuLdn off" via the runtime log that names a RyuLdn server. Traced `SetupLdnBackend` -> `ApplyModeLocked` -> `Resolve()` -> LDN service state-machine selection; all four return room unconditionally. Also checked that the public-room scanner (`ScanPublicRooms`, `multiplayer.cpp:677-780`) is menu-driven and uses its own throwaway `RL::Client`, so it cannot connect the active backend in room mode.
- **C3**: tried to find an unconditional 30456 requirement for RyuLdn hosting. Found the opposite in the default path (public server relay; no listener) and the true condition in own-server mode. Kept the confirmed room/star and NEX parts rather than throwing out the claim wholesale.
- **C4**: tried to find an IPv6 escape (DNS `AddrInfo` serialization, `Translate(domain)`, ENet, the invite parser, the online real-socket path). None exists; the strongest counter is that nifm only advertises IPv4 settings.
- **C5**: tried to find a host-socket escape inside `ProxySocket` (a fallback to a real socket for non-LAN destinations). There is none — `Connect`/`Send` are stubs, `SendTo` only enqueues a proxy packet. Found and reported the one real caveat (socket creation time).
- **C6**: tried to find a different enable path (e.g. a separate `[Debug] ldn_census` key) or a different output path. None; the canonical-section logic is the only mapping. Found that LDN-state lines are room-only by checking every `OnLdnState` call site.
- **C7**: tried to reproduce the 72-byte figure from the tree and from ENet's real headers; could not. Deliberately did not "confirm" it by arithmetic alone. Also explicitly searched for an MTU outside the LDN tree and found `nifm` 1500, which is a partial counter-example to the strongest reading of the claim.

## Difficulties

- **No `run` tool** in this session, so no executable probes (no corpus-wide parser, no PE string extraction). Cost: could not read the shipped exe's string table to confirm menu labels directly; worked around via the runtime logs' `file:line` stamps, the shipped ini, and the GitHub tag/commit API. Suspected cause: assignment/session tooling, not the repo.
- **Binary grep unavailable**: `grep` over `MONSTER HUNTER GENERATIONS ULTIMATE.exe` returns "No matches found" even for strings that provably exist in it (control: `suyu-cmd: Window created` matches the log files but not the exe), i.e. binary files are skipped. Cost: one wasted probe; all exe-level facts were re-derived from logs/API instead.
- **ENet sources absent**: `externals/enet` is an empty submodule in this shallow clone (`.gitmodules` + `cpmfile.json` pin `lsalzman/enet v1.3.18`). Cost: fetched the identical version from `sources.debian.org` (`enet 1.3.18+ds-2`) to cite `ENetAddress`, `ENET_HOST_DEFAULT_MTU = 1392`, and the fragment struct sizes. `raw.githubusercontent.com` and jsdelivr both fail (ECONNRESET / local issuer certificate), so github.com HTML/blob pages and the Debian mirror were used.
- **Doc vs code drift inside the repo**: `docs/a32recomp/RYULDN.md` states the opposite of the shipped ini for `backend` (auto vs room) and for `ryuldn_host` ("empty/self (default)" vs the template's `ldn.ryujinx.app`). This is a real documentation defect and it is the most plausible origin of a wrong user-facing statement about C3. Flagged rather than silently "fixed" (out of scope for this review).
- **C7's 72-byte constant** could not be traced to any source. Cost: spent several probes (`grep 1428|1208`, ENet headers, nifm, proxy headers). Suspected cause: a hand-computed budget (IPv6 + UDP + a future header) rather than a value from the code.
