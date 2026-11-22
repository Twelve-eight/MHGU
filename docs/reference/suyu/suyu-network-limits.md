# suyu 网络侧的限制（只讲联机链路，不是 suyu 的全部限制）

**范围声明（先读这段）**：本文只覆盖**联机/网络**这一条链路——`nn::ldn`、HLE BSD socket、suyu room、RyuLdn、NEX 域名重定向，以及由它们推出的结论。它**不代表 suyu 的全部限制**，对重编译器、图形渲染、模组加载、输入、性能等其他方面**不作任何断言**；那些方面的已知问题见第 6 节指到的文档，本文未复核。

写给谁看：没接触过 suyu / 模拟器代码、但要用这个 MHGU 原生版联机或评估联机方案的人。
写的目的：把"联机这条链路能做到什么、做不到什么、为什么"讲清楚，并标出**哪些结论是验过的、哪些还必须核验**。
证据等级：`[C]` 本会话亲手跑过命令；`[B]` 由证据推出、未单独验证；`[U]` 未验证，必须实测。

对象：`I:\suyu\export\MONSTER HUNTER GENERATIONS ULTIMATE\MONSTER HUNTER GENERATIONS ULTIMATE.exe`（SUYU-GURecomp `0.10.0-test` 导出的原生版），源码 `G:/omp works/.tmp/ext/SUYU-GURecomp`（HEAD `35015f1`）。

---

## 0. 三个词先解释

| 词 | 在这里是什么意思 |
|---|---|
| **suyu** | 一个 Switch 模拟器的分支。这个 fork 额外做了一件事：把游戏的 32 位 ARM 代码**提前翻译成 C 再编译成 Windows exe**，所以你双击的是"游戏本体 + 模拟器的系统服务层"合成的一个文件，不是 ROM + 模拟器 |
| **HLE** | "高层模拟"：不模拟 Switch 硬件，而是用 PC 上的函数**顶替**游戏调用的系统接口（文件、网络、手柄、图形）。网络这块就是 HLE 自己实现的 socket |
| **LDN** | Switch 的"本地无线"接口（`nn::ldn`）。MHGU 的本地联机走它。suyu 用 HLE 把这个"无线网络"伪造出来，再通过互联网把它接到别的玩家——所谓"网络联机"就是这么来的 |

关键推论（后面很多限制都源于此）：**游戏看到的"IP 地址"和"网络"是 HLE 伪造的，不是 Windows 的网卡。**

---

## 1. 一句话结论

这套 build 的联机 = **把游戏的"本地无线"搬运到网络上**（外加一个把游戏在线大厅重定向到自建服务器的实验口子）。它不是官方联机，**永远不会连 Nintendo 的服务器**；IPv6 在这条链路上**一层都用不上**；而"今天能联机成功"很大程度上依赖 suyu 自己替游戏兜底（可靠传输、分片），裸 UDP 的新传输会第一次暴露这些坑。

---

## 2. 限制清单

### L1. 没有官方联机，只有两条替代路径 `[C]`

- 游戏的在线大厅（NEX）需要 Nintendo 账号与主机票据，模拟器没有。build 的做法是把所有 Nintendo 在线域名**改指向**你在设置里填的服务器（`online_server_host`）：`src/core/hle/service/sockets/sfdnsres.cpp:121-145`。
- 能玩的只有：① 游戏自己的 **Local Play**（本地无线）经 suyu room 或 RyuLdn 搬运；② 自建 NEX 服务器（MHGU-NEX）时进游戏原本的在线大厅。
- 对玩家的后果：**没有"官方在线、和全世界匹配"这条路**；②要给一台不属于玩家的公网 IPv4 机器。

### L2. 全栈 IPv4，IPv6 拿不到任何直连路径 `[C]`

| 层 | 事实 | 证据 |
|---|---|---|
| 游戏侧 socket | HLE 的地址族枚举只有 `Unspecified / INET`，**没有 INET6** | `src/core/hle/service/sockets/sockets.h:54-57`；`sockets_translate.cpp:137-158` 的 default 直接 `UNIMPLEMENTED_MSG` |
| 域名解析 | 返回的地址类型写死 IPv4 | `sfdnsres.cpp:217` `h_addrtype = Domain::INET` |
| suyu room | ENet，标准 ENet 只有 IPv4 | `src/network/room.cpp:17` |
| RyuLdn | 客户端 `ai_family = AF_INET`，服务端 `inet_pton(AF_INET,…)` 直接拒绝 v6 | `src/network/ryuldn/socket_util.cpp:76,195-200` |
| NEX | 要求公网 IPv4 | MHGU-NEX `SETUP.md` |

后果 `[B]`：纯 IPv6 / IPv6-only 宽带的玩家在这套 build 里没有直连方案，只能靠中继（Radmin/ZeroTier、VPS 上的 FRP）或自己实现新传输。

附带一条容易忽略的：**连"加入房间"的地址栏都表达不了 IPv6 字面量**——邀请串按最后一个 `:` 切端口（`src/suyu_cmd/multiplayer.cpp:1121-1144` 的 `ParseInvite`），`[2001:db8::1]:24872` 这种写法解析出来的地址还要交给只认 IPv4 的 ENet `[C]`。

### L3. LDN 协议不协商 MTU，但游戏以为接口是 1500，于是超长包静默丢弃 `[C]`

- HLE 交给游戏的 LDN 网络信息（`CommonNetworkInfo`）只有 `bssid / ssid / channel / link_level / network_type` 加 4 字节填充，共 `0x30` 字节，**没有 mtu 字段**：`src/core/hle/service/ldn/ldn_types.h:224-232`；`src/core/hle/service/ldn/` 和 `src/network/` 全树 `mtu` **零命中** `[C]`。
- **但"游戏不知道 MTU"是错的**：普通 socket 的接口 MTU 由 `nifm` 提供，写死 **1500**（`src/core/hle/service/nifm/nifm.cpp:160` 的 `u16 mtu{}`、`:703` 的 `.mtu{1500}`）`[C]`。所以游戏在合法范围内可以发到约 **1472 B**（1500 − 28 B IPv4 头，它按 IPv4 记账）。
- 于是：新传输如果设一个"安全上限"（比如 1200 B）就只是**悄悄丢包**，不会触发任何上层分片。想做裸 UDP 传输，必须自己实现分片/重组。
- 容量算法：`路径MTU − 48(IPv6 40 + UDP 8) − 自定义头`。20 B 头 → 1500 路径剩 1432、1280 路径剩 1212；头长度是自己的设计选择，不存在"固定 72 B"。

### L4. 现有两条路都在替游戏兜底，所以"现在能跑"不能证明"裸 UDP 也能跑" `[C]`

| 后端 | 兜底方式 | 证据 |
|---|---|---|
| suyu room | 所有包用 `ENET_PACKET_FLAG_RELIABLE`（18/18 处），由 ENet 分片、重传、重组；ENet 1.3.18 的 `1392` 是 **UDP 载荷预算**，IP 层单包约 1420 B `[C]`（复核逐行核过） | `src/network/room.cpp:637-640` 等 |
| RyuLdn | 客户端到服务器是 TCP，丢包/顺序由 TCP 处理 | 同上 `socket_util.cpp` |

后果：任何"换一种更省的传输"的方案，都必须**先把兜底能力补回去**（分片、必要的可靠性），否则表现为"偶发不同步/进不了任务"，很难归因。

### L5. room 是星型，房主转发；不是人人直连 `[C]`

- 成员之间不互连：房主收到后**向其余成员重广播**（`src/network/room.cpp:206-236` 的 `Broadcast…` 系列）。
- 所以今天"4 人一局"只要房主一个人可达；反过来，**游戏内部的流量模式（guest 之间要不要互传）从未被测过**——因为星型把这两种情况都盖住了。这是必须实测的项（见 L9）。

### L6. 假 IP 是 HLE 造的，系统层网络工具对它无效 `[C]`

- 游戏里看到的 IPv4 来自后端接口 `GetFakeIpAddress()`（`src/network/ldn_backend.h:39`），room 里是 `192.168.x.y`，RyuLdn 里是 `10.114.x.x` 加替身地址段。
- 后果：**在 Windows 上做 TUN 网卡 / NAT46 / 防火墙规则，对 Local Play 完全无效**，因为这些包根本不经过 Windows 的网络栈。要改传输，只能改 suyu 的 `LdnBackend` 实现。
- 细化 `[C]`：代理还是真实 socket 在 **socket 创建那一刻**决定（`src/core/hle/service/sockets/bsd.cpp:587-591`：`proxy = GetLdnBackend()->IsConnected()`）。所以"进大厅之前就打开的 socket 仍是真实 socket"，两个方向都可能出现；`ldn_census` 的 `proxy/real` 列就是用来测这一点的。

### L7. "能否公共房"取决于服务器，suyu 本身只给你一个传输 `[C]`

- Local Play 的"搜索房间"依赖上层发现机制：room 靠 `LANDiscovery` 公告包，RyuLdn 靠服务器持有 lobby。
- 一旦换成纯 P2P（无服务器），**游戏内就搜不到未邀请的人**，这是设计上无法回避的，不是实现漏洞。

### L8. 文档与默认值不一致（同一版本内），要以 ini 模板 / 实际 ini 为准 `[C]`

- 出货 ini 里 `backend = room`，此时 RyuLdn 层**不激活**（切模式要求先离开大厅）：`src/suyu_cmd/multiplayer.cpp:540-596`。
- `ryuldn_public` 由代码在运行时读取（`multiplayer.cpp:313`，默认**开**），但**不在 ini 键模板里**（`src/core/arm/recomp/game_settings_ini.cpp` 无此键），所以生成的 ini 里没有这一行；F10 帮助文本却会提到它。
- **两处实测到的矛盾** `[C]`：① `docs/a32recomp/RYULDN.md` 说本地联机"同时用 room 和 RyuLdn"、`backend` 默认 `auto`；实际模板默认 `room`，且 room 模式下 `HybridLdnBackend::Resolve()` 恒定返回 Room。② 该文档说 `ryuldn_host` 默认空/`self`、开房时本机自己起服务器；实际出货 ini 是 `ryuldn_host = ldn.ryujinx.app`，此时 lobby 注册在 Ryujinx 公共服务器、**本机不开 30456 监听**（本机监听只在 `self`/空/本机地址时出现，`src/suyu_cmd/multiplayer.cpp:286-327,389-410`）。
- 另外 `game_settings_ini.cpp` 里 `backend` 的注释只列了 `room` / `ryuldn`，**没写代码也接受的 `auto`**。
- 后果：照文档配 ini 可能配了个不存在的键、以为切了模式其实没切、或者以为房主需要开 30456 其实不需要。

### L9. 诊断开关能回答的问题，目前一个都还没答 `[U]`

- 存在仪器：`[Diagnostics] diagnostics = true` → `src/core/internal_network/ldn_census.cpp` 每 10 秒写 `user\ldn_census.txt`，内容包括 socket 列表、每条代理流的源/目的/广播标志/包数/`size min..max`、LDN 状态机。
- 尚未采集：**是否只用 UDP（有没有代理 TCP）**、**guest 之间是否互传（星型够不够）**、**真实包大小分布（分片阈值）**。这三项都必须在真机双人 session 里测，离线无法定论。

### L10. NEX 路径的"不能用 VPN"是个陷阱 `[C]`

- 游戏的 NAT 检查会丢弃"源 IP 等于检查服务器 IP"的 UDP 包；MHGU-NEX 明确要求**服务器不能和玩家同机/同 IP**，并且**不支持隐藏客户端 IP 的隧道**（`SETUP.md`）。
- 所以 Radmin / ZeroTier / FRP 这类中继对 **Local Play** 有用，对 **NEX 在线大厅**有害或无效。这条区分如果不讲清楚，玩家会按"加速器"的思路配，然后一直连不上。

### L11. 实验性部分的稳定性与政策风险 `[C]`/`[B]`

- RyuLdn 桥接在源码里标注实验性；`RYULDN.md` 自己写了 "Not done: … IPv6 servers"、以及"由 suyu room 玩家开、Ryujinx 玩家加入"这条尚未成立 `[C]`。
- Ryujinx 的公共 LDN 服务器由 Ryujinx 运营，文档写明非 Ryujinx 客户端**可能被封** `[C]`（`RYULDN.md`）。
- 跨 build 互通（例如与 morerokk/MHGURecomp 的 `RoomServe` / `RoomServer`）双方文档都写"未在真机验证" `[C]`（morerokk `docs/research/crossplay.md`）。

### L12. 诊断模式本身有代价 `[C]`

- `[Diagnostics] diagnostics` 会同时打开 profiler、FSM 监视、文件监视（`game_settings_ini.cpp:127-129` 的说明），掉帧。测完必须关掉，否则会把"网络实验"的结论污染成"性能问题"。

### L13. 版本校验分两层：房间传输层不校验，LDN 层把版本号透传给游戏 `[C]`/`[B]`

- **传输层无门禁** `[C]`：room 只把 `GameInfo.version` 记录下来（`src/network/room.cpp:1064`），RyuLdn 服务端也只广播不过滤（`src/network/ryuldn/server.cpp:530-562`）。所以 yuzu 上的 1.3.0 与本导出的 1.4.0 能握手、能进同一个房间，**不会在这一层报错**。
- **游戏层有版本字段** `[C]`：LDN 的 `NetworkConfig` 与 `ConnectRequest` 都带 `local_communication_version`（`ldn_types.h:288`、节点信息在 `:241`），模拟器把它原样透传并写进 `NodeInfo`（`lan_discovery.cpp:622`）。**是否拒收由 MHGU 自己决定，源码里看不到** `[B]`——按 MH 系列一贯行为，跨版本本地联机大概率被拒。
- 导出的重编译版把时序补丁写死在 1.4.0 的偏移上（`docs/a32recomp/INSTALL.md:97`），所以 1.3.0 的客人即使过了版本检查也不可靠。
- 后果：跨版本的失败可能**静默**（房间能进、任务进不去），也可能在加入时被游戏拒绝；排查顺序是"先核版本，再看网络"。可行组合只有两种：**全员 1.4.0**（yuzu 侧装 1.4.0 更新）或**全员用导出**。

---

## 3. 需要核验的清单（离线无法定论）

| # | 待核验 | 怎么核验 | 判定标准 |
|---|---|---|---|
| V1 | 游戏是否只用 UDP（有无代理 TCP） | 开 `diagnostics`，单人进 Local Play，看 `user\ldn_census.txt` 的 `# summary: proxied TCP sockets:` | `none` → 裸 UDP 传输可行、可靠性层可省；`YES` → 传输层必须带可靠有序通道。**第三方服务跑通 yuzu 不能替代这一项**：room 对 LAN 作用域内的 TCP/UDP 一视同仁地用 `ENET_PACKET_FLAG_RELIABLE` 重发（`room.cpp:891-893`）。注意 census 只统计**代理** socket：目标不在 LDN 网段的 socket 会换成真实 host socket、不进 room（`bsd.cpp:743-746,817,1145`） |
| V2 | guest 之间是否互传（星型 vs mesh） | 双人一局，两边各留 census，看 `# unicast <src> -> <dst…>` | **默认已按星型设计**（同一字段旁证：房主只映射一个 UDP 端口即可整局，说明房主中继足够 `[U]`）；census 只用来判断是否还需要 mesh：出现 guest→guest 且星型下有异常再补 |
| V3 | 真实包大小分布 | 同上，看 `## packets out` 的 `size min..max` | ≤（路径 MTU − 48 − 头，典型 1432）可免分片；否则必须自带分片。注意游戏合法上限约 1472 B（L3），所以默认**假定需要分片**，实测只用于放宽。同时要问清所用端口映射服务的**单包上限**——它可能低于游戏的合法上限 |
| V4 | 出货 binary 的行为与 HEAD 文档是否一致 | 在 exe 里 grep 菜单/键字符串，再在 F10 菜单实际点一遍 | 字符串命中 ≠ 功能可用，必须点过 |
| V5 | 双端 IPv6 同时发包能否打通家用防火墙 | 两台真机（一台手机 v6 热点），双端同时发 PING | 一次打通即成立；否则要测严格策略下的中继回落 |
| V6 | 与 Ryujinx / MHGURecomp 的实际互通 | 真机各开一局，互填地址 | 双方文档均为"未验证"，只有实测算数 |
| V7 | `ryuldn_public = off` 手工加进 ini 是否真被读到 | 加键后启动，看日志有无对应的服务器列表变化 | 代码路径在 `multiplayer.cpp:313`，但键不在模板里，需实测 |

---

## 4. 这些限制对本项目意味着什么

1. 想做"IPv6 直连"：唯一正确的落点是 suyu 的 `LdnBackend`（8 个纯虚 + 1 个可选，`src/network/ldn_backend.h:24-63`），不是 TUN/NAT——见 L6。
2. 想"少一跳延迟"：必须先补 L3/L4 的兜底（分片 + 必要可靠性），否则省下的延迟会以"偶发不同步"的形式还回来。
3. 想"公共房"：一定需要一台服务器或目录（L7），P2P 给不了。
4. 想"官方在线"：这套 build 做不到（L1）；能做的是自建 NEX，且服务器必须独立、有公网 IPv4、玩家之间可直连（L10）。

---

## 5. 复核状态

- 本文 `[C]` 项均为主会话本回合亲手跑的命令所得；按 AGENTS §4e，`[C]` 中"驱动设计选择的数字 / 因果判断 / 否定断言"仍需另一路独立重算。
- 独立复核已完成（`V6BridgeReview`，dsv-remote，2026-11-07）：`multiplayer-v6-bridge-review.md`。结论：C1/C2/C4/C5/C6 CONFIRMED；**C3 关于 RyuLdn 端口的部分被推翻**（出货默认 `ryuldn_host = ldn.ryujinx.app`，本机不开 30456 监听），本文 L8/L11 已按复核改写；C7 只确认"协议不协商 MTU"，**72 B 常数不可推导**，并补上 `nifm` 写死 1500 这条（本文 L3 已改写）。
- 第二轮复核（`YuzuRoomAudit`，dsv-remote，2026-11-07）：`yuzu-room-compat-review.md`。yuzu 房间与本源出在协议层逐字段相同（`network_version = 1`、消息枚举、join 与数据面布局、两侧 zstd），但**房间不校验游戏版本**（本文 L13）；同时纠正三处：LDN 控制包不压缩、非 LAN 目标的 socket 不进 room、ENet 1392 是 UDP 载荷预算（IP 层约 1420）。
- 仍待真机核验的是 V1–V7。

---

## 6. 不在本文范围（已知但我没在本会话复核，`[U]`）

下面这些同样是"用这个 build 会遇到的事"，但属于重编译器 / 图形 / 模组 / 输入，不是网络链路。**只是索引，不是结论**——每条都来自文档，本会话没有独立核验过：

| 方面 | 文档里写的 | 出处 |
|---|---|---|
| 代码补丁 | `exefs` 补丁、`.pchtxt` / `.ips`、金手指**不支持**（游戏代码已被重编译），要用 `game_settings.ini` 或 Forge 插件 | `docs/a32recomp/INSTALL.md` §7 |
| 文件模组 | 必须放 `mods\<title id>\<mod name>\romfs\...`；两个模组改同一文件只有一个生效 | 同上 |
| 宽屏 | 非 16:9 屏幕 HUD 会被拉伸，除非装 HudFix（Forge PC，额外下载） | 同上 |
| 覆盖层冲突 | RivaTuner(RTSS) 的 Vulkan overlay 会让游戏启动即崩（已修，但 `[Debug] rtss_overlay` 保持 false） | `README_NATIVE_EXPORT.txt` / `INSTALL.md` §9 |
| 首启卡顿 | 首次出现某个效果时要编译着色器，前几分钟会卡 | `INSTALL.md` §9 |
| 前置条件 | 只支持 1.4.0；导出需要自己的 `prod.keys` / `title.keys` 和自己的 dump | `INSTALL.md` §4 |
| 客机代码改写 | 往客机代码内存写字节**不改变**已重编译代码的行为；hook 只能挂在重编译块的起点 | `internals.md` / `internals-review.md`（本项目既有复核） |

要评估这些方面，另开一份报告；不要拿本文当"suyu 全部限制"来引用。
