# Review: yuzu 1734 Room dialog and UDP-relay claims (N1-N5)

Scope: audit 5 claims the main session made after the user showed a yuzu 1734 "创建房间" screenshot.
Read-only sources used: `G:/omp works/.tmp/ext/SUYU-GUReComp` (HEAD 35015f1, "0.10.0-test"), upstream yuzu
(`https://gitee.com/mirrors/yuzu` = mirror of `yuzu-mirror/yuzu`, branch `master`), ENet 1.3.18 from
`sources.debian.org`, the user's own yuzu install (`<APPDATA>/yuzu`), and the
exported build `I:/suyu/export/MONSTER HUNTER GENERATIONS ULTIMATE` (read only, never launched).

Verdict vocabulary: PASS = CONFIRMED (claim holds as stated); PASS-WITH-CORRECTIONS = CONFIRMED overall
but a stated mechanism/detail is wrong or incomplete (that detail is effectively REFUTED); FAIL = REFUTED;
UNVERIFIABLE-OFFLINE = UNCLEAR (cannot be settled from these sources). No claim was REFUTED outright.
Tags: [C] primary source + command; [B] strong inference; [I] weak inference; [U] unknown.

## Summary

| # | Claim | Verdict | One-line reason |
|---|---|---|---|
| N1 | Dialog is yuzu's Room (ENet/UDP, 24872); same recipe on the recompiled build (`mode = host\|join`) | **PASS** [C] | yuzu `network_version`/port/enum/UI fields reproduced from source; the export's `[Multiplayer] mode = off\|host\|join`, `port = 24872`, `backend = room` and its host/join code are the same `Network::Room` stack |
| N2 | Hard version gate; suyu `network_version = 1`; yuzu 1734 side unverified | **PASS** [C]/[B] | Upstream yuzu `room.h` also has `network_version = 1`, and every room message layout I compared is byte-identical. Caveat: "1734 exactly" is [B], the mirror is yuzu's final `master` |
| N3 | Relay observation proves only (a) star topology is adequate, (b) per-packet cap >= room's largest datagram; room re-sends RELIABLE, ignores Protocol byte, zstd-compresses | **PASS-WITH-CORRECTIONS** [C] | Mechanism confirmed, but (i) only *proxy* packets are zstd'd - LDN control packets are sent raw; (ii) guest TCP/UDP to a **non-LAN** destination is swapped to a real host socket and never enters the room |
| N4 | yuzu library has MHGU Update 1.3.0, export is 1.4.0 only -> cross-version play not assumed | **PASS** [C] on both premises | `yuzu_log` proves 1.3.0 + yuzu 1734; `INSTALL.md:97` says 1.4.0 only. Extra fact: **no** emulator-side gate would even detect the mismatch (room sends GameInfo but nothing rejects) |
| N5 | Mixed mod sets / fps patches may desync MHGU local play | **UNVERIFIABLE-OFFLINE** (claim plausible) | Disk/facts verified (5 MHGU mod folders on the yuzu side, none on the export side, fps is a *game-timing* input); whether MHGU desyncs is a game-internal question |

---

## N1 - the dialog is yuzu's Room; the recipe transfers to the recompiled build

**Verdict: PASS [C].** Two independent legs: (i) the screenshot's control set is yuzu's own Qt
"Create Room" dialog (`HostRoom`), not a third-party relay client; (ii) the recompiled build's
multiplayer is the same `Network::Room`/`RoomMember` code, driven by `[Multiplayer] mode`.

Commands / key output (all `read`/`grep` with selectors):

```
grep 最大玩家数|创建房间|房间名称  SUYU-GUReComp/          -> dist/languages/zh_CN.ts:6505-6521
     6505: <source>Create Room</source>        6506: <translation>创建房间</translation>
     6510: <source>Room Name</source>          6511: <translation>房间名称</translation>
     6520: <source>Max Players</source>        6521: <translation>最大玩家数</translation>
                                     (locations cited as ../../src/yuzu/multiplayer/host_room.ui)
```
The `.ts` catalogs attribute these strings to `src/yuzu/multiplayer/host_room.ui`, i.e. yuzu's own room
dialog. Upstream yuzu's `host_room.ui` (fetched from the gitee mirror, :30-130) contains exactly the six
fields the screenshot shows - Room Name, Preferred Game, Max Players (`minimum 2`, `maximum 16`,
`value 8`), Username, Password, Port - so the screenshot's `最大玩家数 8` is the dialog's *default*
value, and `端口 24872` is `Network::DefaultRoomPort`:

```
read SUYU-GUReComp/src/suyu/multiplayer/host_room.cpp:157-158
  157: const auto port = ui->port->isModified() ? ui->port->text().toInt()
  158:                                            : Network::DefaultRoomPort;
read .../room.h:24-33
   24: constexpr u32 network_version = 1;
   26: constexpr u16 DefaultRoomPort = 24872;
   28: constexpr u32 MaxMessageSize = 500;
   31: static constexpr u32 MaxConcurrentConnections = 254;
   33: constexpr std::size_t NumChannels = 1;
```

Transport is ENet, and ENet's host socket is a datagram socket (UDP; ENet offers no stream mode at all,
so nothing in the room protocol can run over TCP):

```
read https://sources.debian.org/data/main/e/enet/1.3.18%2Bds-2/win32.c:191
  191: return socket (PF_INET, type == ENET_SOCKET_TYPE_DATAGRAM ? SOCK_DGRAM : SOCK_STREAM, 0);
grep  ENET_SOCKET_TYPE_DATAGRAM  .../enet/1.3.18+ds-2/host.c
   51: host -> socket = enet_socket_create (ENET_SOCKET_TYPE_DATAGRAM);
   52: ... enet_socket_bind (host -> socket, address)
```
(The fork pins that same version: `cpmfile.json:68-74` `"repo": "lsalzman/enet", "version": "v1.3.18"`;
`externals/enet` is an empty submodule in this checkout, hence the Debian copy.) The fork's own
`docs/user/ServerHosting.md:15-16` states "Only UDP is required for Eden; opening TCP is optional" and
publishes with `-p 24872:24872/udp`.

The host binds all interfaces on the chosen port, so a router forward of that UDP port is the whole
network requirement; the host then joins its *own* room over loopback, and joiners dial `host:port`:

```
read .../src/network/room.cpp:1105-1120
 1111: ENetAddress address;
 1112: address.host = ENET_HOST_ANY;
 1114:     enet_address_set_host(&address, server_address.c_str());
 1116: address.port = server_port;
 1120: room_impl->server = enet_host_create(&address, max_connections + 1, NumChannels, 0, 0);
read .../src/suyu_cmd/multiplayer.cpp:851,858,875,923
  851: if (!room->Create(c.room_name, "", "", c.port, c.password, c.max_players, ...))   <- "" bind addr
  858: room->SetHostGateway(true);
  875: member->Join(c.nickname, "127.0.0.1", c.port, 0, Network::NoPreferredIP, c.password);
  923: member->Join(c.nickname, c.address.c_str(), c.port, 0, Network::NoPreferredIP, c.password);
```

The recompiled build drives exactly that through its ini, not through the Qt dialog:

```
read I:/suyu/export/.../game_settings.ini  [Multiplayer]
  mode = off        ; Local play over a suyu room (e.g. through Radmin VPN): off | host | join at start
  port = 24872      ; Room port (host and join must match).
  backend = room    ; room = a suyu room (the settings above); ryuldn = a RyuLdn master server
  max_players = 4   ; host: room size (2-16).
read .../src/core/arm/recomp/game_settings_ini.cpp:154-171   (same keys/comments in the source table:
  :155-157 mode off|host|join, :161 port 24872, :164 max_players, :169-171 backend room|ryuldn)
read .../src/suyu_cmd/multiplayer.cpp:801, 1012-1020
  801: c.mode = get("mode", c.mode);                     (Config built from [Multiplayer])
 1012: if (c.mode == "host") { if (!Host(system, c, &error)) ...
 1017: } else if (c.mode == "join") { if (!Join(c, &error)) ...
```
The exported launcher *is* that frontend, so the ini key reaches those functions literally - the export
copies `suyu-cmd` to `<game name>.exe`:
```
read .../src/suyu/game_export.cpp:2561-2564, 3156-3163, 3207-3213
 2561: // Every module also builds as a static library ... Linking those into a private copy of
 2562: // suyu-cmd produces one exe that carries the recompiled CPU code inside it
 3156: // Bundle suyu-cmd.exe (renamed to the game name) and its runtime DLLs so the package runs standalone
 3209: : bin_dir + QStringLiteral("/suyu-cmd") + exe_suffix;
 3213: QFile::copy(launcher_src, launcher_dst);
```
The export's host passes `Network::VerifyUser::NullBackend` (`multiplayer.cpp:852`), whose
`LoadUserData` returns empty (`verify_user.cpp:12-15`), so joining needs no account or token: the
`token` field every client sends in `IdJoinRequest` is read and discarded. (A Qt host that creates a
*Public* room uses `WebService::VerifyUserJWT` instead, `host_room.cpp:97-110`/`:169`, but the result is
only used for the ban-list check and the moderator flag; an invalid token is not a rejection reason, only
a ban-list match (username or IP) is - `room.cpp:383-410`.)

Provenance is Citra -> yuzu -> suyu in the files themselves (`room.h:1-5`, `room.cpp:1-5`,
`room_member.cpp` carry "Copyright 2017 Citra" plus suyu), the project states the chain
(`README.md:25-26`: "a fork of suyu ... which descends from Eden and yuzu"), and the tree still ships a
yuzu-room-compatible dedicated server next to its own (`src/dedicated_room/yuzu_room.cpp:1-6` vs
`suyu_room.cpp`).

**Correction / nuance (does not break the claim):** the fork's room host is not byte-for-byte yuzu's
behaviour at the *relay* level. With `host_gateway` on (what `HostLocked` does at `multiplayer.cpp:858`),
a unicast proxy packet whose destination IP no member owns is handed to the host's own member instead of
being dropped:

```
read .../src/network/room.cpp:910-925
  916: enet_peer_send(member->peer, 0, enet_packet);
  917: } else if (ENetPeer* gateway = GatewayPeer(event->peer)) {
  918:     enet_peer_send(gateway, 0, enet_packet);
  920: } else { LOG_ERROR(Network, "Attempting to send to unknown IP address: ...");
upstream room.cpp (gitee): same function, no gateway branch -> LOG_ERROR + drop
(same fallback also exists in the LDN relay: room.cpp:973-980)
```
Wire format unchanged, so cross-play still works; only the failure mode of a stray destination differs.

**Falsification test (N1):** (1) *Dialog identity* - the claim would fail if the screenshot's labels were
absent from yuzu's own catalogs or if upstream `host_room.ui` had a different field set. Both were
checked: the labels map 1:1 to `host_room.ui` and the six fields match. A must-fail control is already
in the data: the *fork's* current dialog (Eden-derived) has extra rows the screenshot lacks (Room
Description, Load Previous Ban List, Public/Unlisted, `host_room.ui:134-199`) - so "same six fields, no
room-type row" discriminates yuzu-1734 from this fork's UI, i.e. the discriminator has non-zero power.
(2) *Transfer* - the claim would fail if the export's mode key did not reach `Room::Create`/`RoomMember::Join`
or if the export bound only loopback. `game_settings_ini.cpp` declares the key, `suyu_cmd/multiplayer.cpp`
consumes it, `Room::Create` binds `ENET_HOST_ANY`, and `enet_host_connect` targets the dialled address
(`room_member.cpp:594-597`). Live check recorded under "only a two-client test can settle".

---

## N2 - hard version gate; upstream yuzu's `network_version`

**Verdict: PASS [C] for the gate and for upstream's value; [B] for "1734 exactly".**

The gate (fork and upstream are the same code, same position in the handshake - after password,
nickname and fake-IP checks, before the member is added):

```
read .../src/network/room.cpp:352-360
  357: if (client_version != network_version) {
  358:     SendVersionMismatch(event->peer);
  359:     return;
  360: }
read https://gitee.com/mirrors/yuzu/raw/master/src/network/room.cpp:300-420   (upstream HandleJoinRequest)
      ... identical reads (nickname, preferred_fake_ip, client_version, pass, token) and the identical
      357-equivalent `if (client_version != network_version) { SendVersionMismatch(...); return; }`
```
The client turns the rejection into a visible error, not a crash: `room_member.cpp:215-218`
`case IdVersionMismatch: SetState(Idle); SetError(Error::WrongVersion);` (the version value in the reply is
not even read, so only the *id* matters).

Upstream yuzu's value, fetched independently of the main session (it had only grepped the fork):

```
read https://gitee.com/mirrors/yuzu/raw/master/src/network/room.h
   constexpr u32 network_version = 1; ///< The version of this Room and RoomMember
   constexpr u16 DefaultRoomPort = 24872;
   constexpr u32 MaxMessageSize = 500;
   static constexpr u32 MaxConcurrentConnections = 254;
   constexpr std::size_t NumChannels = 1;
   enum RoomMessageTypes : u8 { IdJoinRequest = 1, IdJoinSuccess, IdRoomInformation, IdSetGameInfo,
        IdProxyPacket, IdLdnPacket, IdChatMessage, IdNameCollision, IdIpCollision, IdVersionMismatch,
        IdWrongPassword, IdCloseRoom, IdRoomIsFull, IdStatusMessage, IdHostKicked, IdHostBanned,
        IdModKick, IdModBan, IdModUnban, IdModGetBanList, IdModBanListResponse, IdModPermissionDenied,
        IdModNoSuchUser, IdJoinSuccessAsMod };
```
Packet ids and their order are identical to the fork's `room.h:41-67`, so no id can be reinterpreted.
Layouts I compared field by field (fork vs upstream, both directions where both exist):

| Message | Fork | Upstream | Same layout |
|---|---|---|---|
| IdJoinRequest (client->host) | `room_member.cpp:280-292` id, nickname, fake_ip, u32 version, password, token | upstream `room_member.cpp` `SendJoinRequest` (fetched in a :180-300 slice): identical six writes | yes |
| IdJoinRequest (host parse) | `room.cpp:310-335` same order (client_version at :327-328, token at :333-334) | upstream `room.cpp` same order | yes |
| IdJoinSuccess / AsMod | `room.cpp:684-702` id + 4-byte fake IP | same | yes |
| IdRoomInformation | `room.cpp:815-844` name, description, slots, port, preferred_game.name, host_username, u32 n, then per member nickname, fake_ip, name, id, version, username, display_name, avatar_url | upstream `room.cpp` `BroadcastRoomInformation` **character-identical** | yes |
| IdProxyPacket | `room.cpp:871-929` skips local(1+4+2), reads remote_ip, skips port, skips protocol (:885), reads broadcast, appends original bytes (:891-893) | upstream identical (no gateway branch) | yes |
| IdLdnPacket | `room.cpp:931-985` skips type/local_ip, reads remote_ip, broadcast, appends original | upstream identical | yes |
| IdStatusMessage | `room.cpp:776-813` id, u8 type, nickname, username | upstream identical | yes |
| IdModBanListResponse / IdChatMessage / IdSetGameInfo | `room.cpp:744-757`, `:987-1035`, `:1037-1070` | identical | yes |

Note in particular that upstream's *extra* `enable_yuzu_mods` argument (`Room::Create(..., bool
enable_yuzu_mods = false)`) never reaches the wire: upstream's `BroadcastRoomInformation` does not write
it, so the fork dropping it (`room.h:123-129` + `SetHostGateway`) costs no bytes.

Client-side parsers were compared too, because a matching host writer is not enough (a peer must read the
same bytes back): upstream `HandleGameInfoPacket` (fetched :955-1000) reads name, id, version in that
order; upstream `HandleProxyPackets`/`HandleLdnPackets`/`HandleJoinPacket` (fetched :340-410) are
character-identical to the fork's `room_member.cpp:350-380` / `:381-401` / `:339-348`. No read is missing
or extra on either side.

Encoding is the Citra `Packet` class on both sides: big-endian integers, strings as `u32` length + bytes,
`IPv4Address` as 4 raw bytes (`packet.cpp:193-209`, `:244-249`).

Unknown message ids are ignored, not fatal: the client's `switch (event.packet->data[0])` has no
`default:` (`room_member.cpp:171-241`, cases end at `:238-240`), same upstream - so a future packet type
cannot break an old peer.

**Why "exactly 1734" is only [B]:** the mirror's `master` is yuzu's final state (1734 was yuzu's last
release, early March 2024). I tried to pin the tag directly and no such ref is fetchable
(`read .../raw/1734/src/network/room.h -> "URL output is empty"`), so I cannot distinguish "1734 ==
master for these files" from "changed in the final days before the takedown". Corroboration that no
change is plausible: this fork's room files are yuzu's with only local additions (SPDX line, `SetHostGateway`,
`KickMember`, the `#ifdef`-free `verify_backend` null check), and the fork still speaks `network_version = 1`.
In-tree documentation also assumes cross-emulator joining works: `docs/user/Multiplayer.md` "Can Other
Platforms Play Together? ... different emulators can play together as well (Eden/Citron/Ryubing, etc.)",
while listing "Emulator Version Mismatches ... can join the same lobby without issue" as a *behavioural*
pitfall, not a join failure. The fork's own install guide is more careful: `INSTALL-LINUX.md:115`
"Linux and Windows players use the same room protocol (mixed groups not tested yet)".

**Falsification test (N2):** the claim would fail if (a) upstream's constant were != 1, or (b) a layout
differed. (a) Upstream says 1 [C]. (b) The most sensitive probe is the largest struct: I compared upstream
and fork `BroadcastRoomInformation` token by token - identical, including the trailing three
per-member strings - and the fork's client parser (`room_member.cpp:315-327`) reads exactly that sequence,
so a fork client parses a yuzu room object without leftovers or short reads. A *positive* structural
control exists too: the fork keeps `HandleJoinRequest`'s version check *after* the fake-IP assignment and
its client sends `network_version` in the same slot (`room_member.cpp:288`), so a one-field insertion
anywhere would have shown up as a mismatch in one of the eight messages above. What would still fail:
unit-level `Packet` encoding differences (ruled out: same file lineage, BE conversions present in both),
and magic values inside `GameInfo`/`VerifyUser` payloads (not compared, but not read by a peer's logic -
`VerifyUser::NullBackend` is what `HostLocked` passes, `multiplayer.cpp:852`).

---

## N3 - what the UDP-relay observation can and cannot prove

**Verdict: PASS-WITH-CORRECTIONS [C]** - the stated limits are if anything too generous to the relay; two
mechanism statements in the claim are imprecise.

Verified mechanism (all in the fork's Room path used by `backend = room`):

1. Data plane is the *proxy packet* path whenever a room is connected - every guest socket becomes a
   proxy socket, so both UDP and TCP guest traffic is relayed:
```
read .../src/core/hle/service/sockets/bsd.cpp:587-590
  587: const bool proxy = Network::GetLdnBackend()->IsConnected();
  588: if (proxy) { 589: descriptor.socket = std::make_shared<Network::ProxySocket>(); ... }
```
2. The proxy packet is zstd-compressed before it enters the room (and decompressed on receipt):
```
read .../src/network/ldn_backend.cpp:73-82, 92-102
   77: ProxyPacket compressed = packet;
   78: compressed.data = Common::Compression::CompressDataZSTDDefault(packet.data.data(), packet.data.size());
   79: room_member->SendProxyPacket(compressed);
   97: decompressed.data = Common::Compression::DecompressDataZSTD(packet.data);
```
3. The host ignores the guest's Protocol byte and re-sends the **original bytes** with
   `ENET_PACKET_FLAG_RELIABLE`:
```
read .../src/network/room.cpp:874-893
  885: in_packet.IgnoreBytes(sizeof(u8)); // Protocol
  888: in_packet.Read(broadcast);
  890: Packet out_packet;
  891: out_packet.Append(event->packet->data, event->packet->dataLength);
  892: ENetPacket* enet_packet = enet_packet_create(out_packet.GetData(), out_packet.GetDataSize(),
  893:                                              ENET_PACKET_FLAG_RELIABLE);
upstream room.cpp HandleProxyPacket: identical skip + verbatim append + RELIABLE
```
   The receiving member does use the byte (`room_member.cpp:372-377`), so protocol semantics survive
   end-to-end; the *transport* between them is one reliable, ordered ENet channel (`NumChannels = 1`,
   `room.h:33`; client sends also RELIABLE, `room_member.cpp:265-267`).
4. Topology is a star through the host process: the host opens the room and joins it over loopback
   (`multiplayer.cpp:851/875`), so all member-to-member traffic is relayed by the host's `Room` object
   (`room.cpp:891-929` broadcast fan-out and unicast lookup by fake IP). There is no member-to-member
   direct path and no central public relay.

Corrections / additions to the claim's wording:

- **(i) "zstd-compresses the payload before sending" holds for proxy packets only.** LDN control packets
  (scan/connect/sync - `lan_discovery.cpp:480-482` -> `ldn_backend.cpp:84-90`) go through
  `RoomMember::SendLdnPacket` with **no** compression, and the host re-sends them verbatim with RELIABLE
  (`room.cpp:931-985`). So "the room compresses what it relays" is not universally true; the observation
  therefore says even less about payload sizes than claimed for the LDN channel.
- **(ii) "every proxy packet (guest TCP and UDP alike)" is true only for packets that are proxy packets.**
  A guest socket whose destination is not in a LAN-looking range escapes the room entirely: at connect
  *and* at unconnected-UDP sendto the emulator swaps in a real host socket:
```
read .../src/core/hle/service/sockets/bsd.cpp:737-749, 817, 1145
  743: const bool virtual_lan = ip[0] == 10 || (ip[0] == 192 && ip[1] == 168) ||
  744:                          (ip[0] == 169 && ip[1] == 254) ||
  745:                          (ip[0] == 172 && ip[1] >= 16 && ip[1] <= 31);
  746: if (virtual_lan) return;                      // stays proxied
  749: LOG_INFO(Service, "[NEXPROBE] fd={} proxy->real host {} socket for non-LAN ...");
  817: MaybeSwapProxyToHost(fd, Translate(addr_in));   // in ConnectImpl
 1145: MaybeSwapProxyToHost(fd, *p_addr_in);           // in SendToImpl (unconnected UDP)
```
  This matters for the epistemic claim: the relayed set is "LAN-looking destinations" (the room's
  `192.168.x.y` fake IPs, `room.cpp:846-857`), and internet-bound traffic (NEX/online services) never
  touches the room at all. A UDP relay observation therefore tells you nothing even about *all* of the
  guest's UDP, only about its intra-LAN UDP.
- **(iii) MTU: confirmed, and the room's own datagrams are bounded by it.** ENet 1.3.18
  (`https://sources.debian.org/data/main/e/enet/1.3.18%2Bds-2/include/enet/enet.h`):
```
   ENET_HOST_DEFAULT_MTU                  = 1392,
   ENET_HOST_DEFAULT_MAXIMUM_PACKET_SIZE  = 32 * 1024 * 1024,
   ENET_PACKET_FLAG_UNRELIABLE_FRAGMENT   -> "... fragmented using unreliable (instead of reliable)
                                             sends if it exceeds the MTU"
```
  i.e. oversize *reliable* packets are fragmented reliably and reassembled, so the UDP datagram ENet emits
  stays <= 1392 B (ENet's own protocol/fragment headers are inside that budget) while an application
  packet may be up to 32 MB. The claim's
  "per-packet cap is at least the room's largest datagram (~1392)" is therefore right, and 1392 is exact
  for this pinned ENet.
  *Refinement:* 1392 bounds the **UDP payload** (ENet's `peer.mtu` covers its own header), so the packet
  the relay actually sees at the IP layer is 1392 + 8 (UDP) + 20 (IPv4) = **1420 B** (1440 with IPv6).
  A relay that caps a *datagram at 1392 bytes including headers* would clip up to 28 bytes of every
  full-MTU packet; the safe bound to quote is ~1420, not 1392. This does not weaken the claim's
  conclusion, it tightens the number a tester should use.
```
read https://sources.debian.org/data/main/e/enet/1.3.18%2Bds-2/peer.c:119,423
  119: fragmentLength = peer -> mtu - sizeof (ENetProtocolHeader) - sizeof (ENetProtocolSendFragment);
  423: peer -> mtu = peer -> host -> mtu;
```
  i.e. `mtu` is the whole ENet datagram budget, not the app payload size - so the fragmentation headroom
  is *smaller* than 1392 per fragment and the IP-layer packet is slightly *larger* than 1392.
- **(iv) What the observation still cannot say** - unchanged and correct: nothing about whether the guest
  uses UDP only (it does not: TCP guest sockets are proxied the same way, and TCP semantics such as
  partial reads are emulated on the receiving `ProxySocket`, `socket_proxy.cpp:146-189`), nothing about
  whether a raw unreliable UDP transport would suffice (the room is reliable+ordered; a raw relay is
  neither, and loss/ordering would hit a TCP-over-room flow much harder than the current RELIABLE
  transport), and nothing about MHGU's payload size distribution (the observer only sees MTU-sized,
  compressed datagrams; the app-level sizes are hidden by both zstd and fragmentation).

**Falsification test (N3):** for each mechanism sentence, a code path that contradicts it:
(a) "always RELIABLE" - would fail if any proxy/LDN send used a non-RELIABLE flag or a second channel;
`grep ENET_PACKET_FLAG_RELIABLE` in `src/network` returns RELIABLE at every `enet_packet_create`
(`room.cpp:638,648,658,668,679,689,699,709,719,729,739,754,765,786,841,892,948,1013`,
`room_member.cpp:266`) and `NumChannels = 1` is the only channel used (`room.cpp:1120` allocates
`NumChannels`, `room_member.cpp:587/597` connect with `NumChannels`). (b) "compress before send" - would
fail if the room received uncompressed payloads from a room backend; it cannot for the Room path
(`ldn_backend.cpp:73-81`) but it *can* for the RyuLdn bridge, which sniffs the zstd magic and tolerates
raw peers (`ryuldn/room_bridge.cpp:322-335`) - a must-pass/must-fail pair inside the tree.
(c) "star topology" - would fail if members could address each other directly; the only send primitive is
`enet_peer_send(member.peer, ...)` from the room host, and members connect only to the host address
(`room_member.cpp:594-597`).

---

## N4 - yuzu library has 1.3.0; the export is 1.4.0-only

**Verdict: PASS [C] on both premises, with a sharpened conclusion about *why*.**

Premise 1 (the yuzu side), from the user's own log rather than the screenshot:
```
grep (?i)... <APPDATA>/yuzu/log/yuzu_log.txt.old.txt
    4: Frontend <Info> yuzu\main.cpp:GMainWindow:379: yuzu Version: yuzu 1734
 1307: Frontend <Info> yuzu\main.cpp:BootGame:2057: Booting game: 0100770008DD8000 |
       MONSTER HUNTER GENERATIONS ULTIMATE (32-bit) | 1.3.0
read <APPDATA>/yuzu/log/yuzu_log.txt:14
   14: Frontend <Info> yuzu\main.cpp:SetFirmwareVersion:4833: Installed firmware:
       NintendoSDK Firmware for NX 20.5.0-1.0
```
So the yuzu install is exactly 1734 and its MHGU is 1.3.0 - independently of the screenshot.

Premise 2 (the export):
```
read .../docs/a32recomp/INSTALL.md:94-97
   94: 3. Install the 1.4.0 update: File -> Install Files to NAND...
   95:    Right-click the game -> Properties should then list the update as 1.4.0.
   97: The export only works with version 1.4.0 (title ID 0100770008DD8000).
read .../tools/a32recomp/package_readme.txt:4-18   (same requirement in the shipped readme)
```
The requirement is real and mechanical, not merely cosmetic: the exporter recompiles the *installed
update's* ExeFS (`src/suyu/game_export.cpp:1157-1175`, `:1211-1234`) and the recompiler's own behaviour
patches are hard-coded to 1.4.0 offsets (`src/core/arm/recomp/game_settings.h:22-41`: "MHGU 1.4.0 ...
MT Framework's target frame rate ... at +0x243C ...; Locations came from public 1.4.0 patches").
There is no `if (version != 1.4.0)` guard in `game_export.cpp` - the gate is documented, so exporting from
a 1.3.0 install would be attempted and (per those hard-coded offsets) mis-compile. That is worth saying
plainly: the build is 1.4.0 *by construction*, not by a runtime check.

Sharpened conclusion: the reason cross-version play "is not assumed to work" is *not* an emulator-side
version gate. I found none on the room path - `GameInfo` (name/id/version) is sent with `IdSetGameInfo`,
stored, echoed in `IdRoomInformation`, and only **logged**:
```
read .../src/network/room.cpp:1037-1070
 1064: LOG_INFO(Network, "{} is playing {} ({})", display_name, game_info.name, game_info.version);
```
Even the fork's RyuLdn lobby server advertises the version string (`ryuldn/server.cpp:402-405`) but its
scan matcher compares only passphrase/lcid/scene/session/ssid/network type (`server.cpp:530-562`) - no
version predicate. So the mismatch would be *silently* accepted by the transport and would have to be
rejected by the game itself. Whether MHGU 1.3.0 and 1.4.0 can see each other's local-play session is a
game-internal question, not answerable from this tree [U].

**Falsification test (N4):** the claim would fail if (a) the export accepted other versions, or (b) some
emulator-side check made the mismatch impossible. (a) would show as a version comparison in the export
path - `grep version src/suyu/game_export.cpp` returns only update-selection and file-format versions, no
game-version predicate, and the docs state the constraint twice. (b) would show as a comparison of
`game_info.version` in `src/network/**` - the only uses are the room payload writes/reads and the log line
above, so no check exists; a must-fail control is the `IdVersionMismatch` path, which *does* exist but is
about `network_version`, a different constant (1 on both sides). Everything else in N4 depends on MHGU's
own LDN/quest protocol, i.e. live test.

---

## N5 - mod sets / fps patches and MHGU local-play desync

**Verdict: UNVERIFIABLE-OFFLINE** (the *risk* is real and the configuration divergence is verified; the
desync consequence cannot be settled from these sources). Claiming "may desync" is defensible; claiming
"will desync" or "will not" is not.

What I could verify - the two sides really are configured differently:

- The yuzu install has five MHGU mods on disk (`<APPDATA>/yuzu/load/0100770008DD8000/`):
  `a商店MOD/romfs/` (game data), `mhgu-box-expand/exefs/` (exe patch, "ITEM BOX EXPANSION V7" in the log),
  `ChuckPatch_FSRDisable+QualityReduceFix+Shadow1024+1008p/exefs/` (graphics), `b4k/exefs/` (resolution),
  `c120FPS-Map/Cheats/` (cheat file), plus an unlisted `mods.zip`.
  ```
  glob <APPDATA>/yuzu/load/0100770008DD8000/*/*
  ```
  Three of those names match the screenshot's list (aShopMOD, b4k, ChuckPatch); two do not
  (`c120FPS-Map` vs `60fps_stable`, `mhgu-box-expand` vs `zz2Map`). Either the set changed after the
  screenshot or the screenshot is of another install - the audit should not pretend the two lists are the
  same set [B/U].
- The export has **no** content mods: `I:/suyu/export/.../mods/0100770008DD8000/` contains only
  `Forge/` (the mod loader, `[Mods] loader = Forge/forge.dll`), `BoxProbe/` and `DbgPort/` (dev plugins).
  So today the two clients differ by five mods, not "maybe".
- Frame rate is a *simulation* input on the recompiled side, not a display knob:

```
read I:/suyu/export/.../game_settings.ini  [Display]
  ; Target frame rate: 30 = original game, 60/120/240 for fast monitors; auto = follow what the PC
  ; reaches (up to the monitor's refresh rate). The game times itself from it. Default 30.
  fps = 30
read .../src/core/arm/recomp/game_settings.h:22-30
  22: * MHGU 1.4.0 (0100770008DD8000):
  23: *   [Display] fps: MT Framework's target frame rate, a float in the engine object that the global
  24: *   at main+0x18A6210 points to, at +0x243C (30.0 in the original game; the engine derives its
  25: *   timing from it).
```
  That is the strongest offline support for the fps half of the claim: a player at 60/120 fps runs the
  game's timing at a different rate from one at 30. Whether MHGU's local-play netcode tolerates it is
  game-internal [U]. Note the yuzu side's fps options are *mods* (`c120FPS-Map/Cheats`) while the export
  has an emulator-level `fps` key - so the two sides cannot even be compared by mod name alone.
- The transport itself is indifferent: `ProxyPacket.data` is opaque bytes end to end
  (`room.cpp:885-893`, no content inspection), and nothing in the room protocol carries a mod list or a
  content hash - only `GameInfo{name, id, version}` (`announce_multiplayer_room.h`, `room.cpp:815-844`).
  So a mod mismatch is invisible to the transport by construction, and any divergence appears only
  in-game.

What only a live test can settle: whether MHGU's local play actually rejects or desyncs on (a) 1.3.0 vs
1.4.0, (b) item-box/shop romfs/exefs differences (these touch save structures, not just appearance), (c)
30 vs 60/120 fps between clients. My prior: (a) most likely blocks or visibly breaks at the game's own
version/quest handshake; (b) plausible desync/crash on quest start or during item sync; (c) plausible
timing divergence but the least likely to break a MH quest outright. All three are [I] - do not report
them as findings.

**Falsification test (N5):** the claim would be refuted offline only by evidence that local play is
authoritative-state (host-only) at every point that mods/fps affect, i.e. that clients cannot diverge.
The emulator layers do not establish that either way: they forward opaque datagrams and validate no
content (a host-authoritative game design would be invisible in this code, since it lives in the game).
It would be *confirmed* by a two-client run where a box-expanded or 60 fps client and a vanilla one
complete a quest without divergence. Practically: run the two clients with identical versions/mods/fps
first (baseline), then flip one variable at a time; a desync must be reproduced with the changed variable
and disappear without it.

---

## What only a live two-client test can settle

1. Whether yuzu 1734 actually joins this build's room without `IdVersionMismatch` (source says it should;
   the binary's constant is [B], not [C]).
2. Whether the room is usable in practice through a UDP-only relay: join, chat room list, and a full
   local-play scan/connect, with the relay's per-packet cap and idle timeout exercised (the code path is
   MTU-bounded, but only a run shows the relay keeps the session alive).
3. Whether MHGU 1.3.0 and 1.4.0 can enter the same local-play session at all (game-level handshake).
4. Whether mixed mod sets (box-expand/shop romfs) or 30 vs 60/120 fps between clients desyncs a quest.
5. Which side is host in the intended test (host = the side that must be reachable on UDP 24872; if the
   recompiled build hosts, it also runs `SetHostGateway(true)`, which changes how unroutable destination
   IPs are handled compared with a yuzu host).
6. Whether the yuzu side's `以太网` interface binding (`M- Network.network_interface: 以太网` in the log)
   matches the interface the forwarded traffic arrives on - a classic silent failure for a star host.

## Self-FalsificationCheck

- Did I re-derive the constants rather than trust the main session? Yes: `network_version = 1`,
  `DefaultRoomPort = 24872`, `MaxMessageSize = 500`, `NumChannels = 1` from the fork *and* from upstream
  yuzu's `room.h` fetched independently; ENet 1392 from the pinned vendor version's header.
- Competing explanations considered for the dialog: (a) yuzu 1734 Qt Host Room dialog, (b) this fork's
  Eden-derived dialog, (c) a third-party relay client. (b) is excluded by the field set (fork has Room
  Description / ban-list / Public-Unlisted rows; upstream 1734 does not), (c) by the translation
  catalogs attributing the exact Chinese strings to `src/yuzu/multiplayer/host_room.ui`.
- Competing explanations for cross-play failure, in order: version constant (ruled out, both 1), packet
  layout drift (checked every message type in the enum that carries a payload; none differs), relay
  reachability (untested live), game-version handshake (untested, cannot be tested offline), mod set
  (untested).
- Did I mistake the LDN channel for the proxy channel? Considered and corrected: LDN packets exist and
  are relayed with a different (uncompressed) path; the *data plane* for a room is the proxy path because
  `bsd.cpp:587-590` proxies every socket while connected.
- Did I overstate N3? I weakened it: only LAN-destination traffic is relayed at all (`bsd.cpp:737-747`),
  and only proxy payloads are compressed.
- Did I overstate N4? I separated the hard fact (export is 1.4.0-only, yuzu library is 1.3.0) from the
  unproved part (MHGU's own rejection), and recorded that no emulator-side check exists.
- Stale-copy risk: everything cited lives in `.tmp/ext/SUYU-GUReComp` (HEAD 35015f1 per the task) or in
  the user's/export folders, not in `/tmp` copies. I did not use the fork's `MHRS/tools` copies.

## Difficulties

- **`raw.githubusercontent.com` and `cdn.jsdelivr.net` are unreachable from this session** (ECONNRESET /
  "unable to get local issuer certificate"), so the upstream yuzu comparison used the Gitee mirror
  `gitee.com/mirrors/yuzu` instead. Cost: two failed fetches. Residual risk: the mirror could in principle
  differ from yuzu-mirror/yuzu; I cross-checked one discriminator (the `enable_yuzu_mods` parameter and
  the identical `BroadcastRoomInformation`) and both are consistent with the fork having forked from it.
- **No yuzu 1734 tag in the mirror**: `read .../raw/1734/src/network/room.h` returned empty output (no
  such ref fetchable), so pinning the *exact release* is impossible here; the value is [B] rather than [C].
  Settled by the live join test (or by disassembling the user's `yuzu.exe`, which needs tooling this
  session does not have).
- **`externals/enet` is an empty submodule** in this checkout (`.gitmodules` + `cpmfile.json` pin
  `lsalzman/enet v1.3.18`), so I cited the same version from `sources.debian.org`. Cost: two extra fetches.
- **No git binary in this session, so history could not be walked.** `.git/logs/HEAD` has exactly one
  entry (`clone: from https://github.com/GUReComp/SUYU-GUReComp.git`, new tip 35015f1...), which pins HEAD
  but says nothing about `src/network/room.h`; provenance was therefore established from the SPDX headers,
  the identical upstream files, and `README.md:25-26` instead of `git log --follow`.
- **No `run` tool in this session** (only read/grep/glob/edit/write), so no scripted corpus scan was
  possible; every comparison above is a targeted file/line comparison rather than a whole-tree diff. Where
  that matters (N2), I listed the message types I compared instead of claiming "the files are equal".
- **The screenshot's mod list does not match the disk** (3 of 5 names match). I report the disk state and
  flag the difference instead of reconciling it silently; the screenshot may predate a rename.
- **`grep` skips binary files in this harness.** Control: `grep 'suyu|Vulkan|Forge'` on
  `README_NATIVE_EXPORT.txt` matches (line 6, 24), while the same pattern on
  `MONSTER HUNTER GENERATIONS ULTIMATE.exe` returns "No matches found" although that text is certainly in
  the launcher - so the exported `.exe` could not be string-searched, and export-side facts come from its
  ini/readme/source tree instead of the shipped binary.
