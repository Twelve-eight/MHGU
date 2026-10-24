# DbgPort

这是 MHGU 原生重编译版（SUYU 导出）的 Forge PC 插件，开了一个本机调试端口，用来**注入按键与摇杆、读写游戏内存、截图**。

**安全**：插件只监听 `127.0.0.1:47100`，没有认证，本机任何进程都能连上并改写游戏内存。只在测试时加载，用完把 `DbgPort` 目录从 mods 里移走。

## 构建与安装

- 构建：运行 `build.bat`（MSVC x64），产物在 `dist\mods\0100770008DD8000\DbgPort\plugins\dbgport.dll`。
- 安装：把 `dist\mods\...\DbgPort` 复制进导出目录的 Forge mods 目录。
- 端口：默认 47100，可在 Forge 配置 `dbgport` 的 `[net] port` 里改。
- 同一时间只接受一个客户端连接。

## 命令

每行一条，回复一行，以 `ok`/`err` 开头。除 `<n>`、`<frames>`、`<updates>` 用十进制外，数字都是十六进制（`0x` 可省）。

|命令|作用|
|---|---|
|`base`|main 模块基址|
|`mask`|输入掩码 `[[GOT 0x183931c]+0x6bfc]`，附带当前注入状态（`inject <bits> left <n>`）|
|`hold <bits>`|把 `<bits>` OR 进游戏读到的每个 nn::hid Npad 状态，直到 `release`|
|`tap <bits> <updates>`|同上，只在接下来 `<updates>` 次游戏更新内生效，然后自动松开|
|`stick <L\|R> <x> <y> <frames>`|强制某个摇杆（`<x>`/`<y>` 为十进制，-32767..32767；`<frames>` 为 0 表示直到 `release`）|
|`release`|停止所有注入（按键与两个摇杆）|
|`hooks`|每个 sdk `GetNpadState(s)` 钩子是否装上、触发次数，以及最近一次的 `out`、`r1`、`r0`、`lr`、`btn`|
|`shot [path]`|把下一帧画面存成 24 位 BMP（默认 `.tmp\mhgu-scratch\shot.bmp`）|
|`rd <addr> <n>`|读 `<addr>` 处 `n` 字节（1..256）|
|`rm <off> <n>`|同上，地址是 main 基址 + `<off>`（偏移来自静态笔记）|
|`w32 <addr> <value>`|在 `<addr>` 写一个 u32，并记进游戏日志|
|`ptr <off> [o1 o2 ...]`|沿指针链 `[[base+off]+o1]+o2…` 逐级读取，打印每一步的地址和值|

例：

```
node dbg.mjs "mask" ";" "tap 100 6" ";" "mask"
node dbg.mjs "base" ";" "rm 183931c 8" ";" "hooks"
```

### 线程与超时

- 除 `shot` 外，命令都在游戏线程（`forge_onUpdate`）里执行；游戏不更新时（例如停在 Forge 菜单里）2 秒后返回 `err timeout (game not updating)`。
- `shot` 在 socket 线程执行，真正的拷贝在 `forge_onPresent` 里录进 Forge 的命令缓冲，最多等 3 秒；窗口被遮挡、最小化、失焦，甚至游戏逻辑暂停时也能截图。

## 客户端脚本

### dbg.mjs

```
node dbg.mjs "<命令>" ";" "<命令>" ...
```

一次连接里按顺序发送多条命令，逐条打印 `命令 -> 回复`。它只发命令、不做定时等待，按键之间要停顿请用 `macro.mjs` 的 `wait:<ms>`。端口用环境变量 `DBGPORT` 覆盖，默认 47100。

### macro.mjs

```
node macro.mjs "A A wait:2000 Down A" [--frames=4] [--shot=name]
```

按顺序执行一串记号：

- 按键名：`A B X Y L R ZL ZR Plus Minus Left Up Right Down`，用 `+` 连接表示同时按（例如 `L+Y`、`R+A`）。每个按键记号等价于 `tap <bits> <frames>`，随后暂停 `<frames>×17 + 300` 毫秒。
- `wait:<ms>`：纯等待。
- `hold:<bits-hex>:<frames>`：直接给十六进制位，等价于 `tap <bits> <frames>`，随后暂停 `<frames>×17 + 300` 毫秒。

选项：

- `--frames=<n>`：每个按键记号的 tap 帧数，默认 4。
- `--shot=<name>`：序列结束后发 `shot .tmp\mhgu-scratch\<name>.bmp`，再用 `py -3.14` + PIL 缩成 640×360 的 `<name>.png`。

示例：`node macro.mjs "A A wait:1500 L+Y hold:1:30" --frames=6 --shot=menu`

端口同样读环境变量 `DBGPORT`（默认 47100）；连接失败会打印 `dbgport: <错误码>` 并退出。

## 按键位

用的是 Npad 原始位（MHGU DEVLOG 2026-10-25）：

- A 0x1、B 0x2、X 0x4、Y 0x8
- L 0x40、R 0x80、ZL 0x100、ZR 0x200
- Plus 0x400、Minus 0x800
- 十字键：左 0x1000、上 0x2000、右 0x4000、下 0x8000

其中十字键的 4 个位静态已确认；L/R/ZL/ZR/Plus/Minus 按 Switch `NpadButton` 的定义给出，尚未逐个实机核对。

## 注入原理与限制

- 注入在 sdk 的 `nn::hid::GetNpadState` / `GetNpadStates`（FullKey、Handheld、JoyDual 三套）的 post 钩子里：把位 OR 进返回的状态，所以游戏看到的效果和真实手柄一样，窗口失焦、被遮挡都不影响。钩子只在该函数被游戏调用时生效。
- 只要有注入（按键或摇杆），状态的 `attributes @0x20` 的 bit0（IsConnected）会被强制置 1：main `0x86d37c` 只把 `attr&1` 当连接标志，未连接的 pad 的按键会被忽略，也就是早期"注入了却没反应"的那个卡点。
- 注入状态（按键位、两个摇杆、剩余帧数）放在一个结构体里，由一把 SRWLOCK 保护：钩子里先取共享锁拷一份快照就放锁，之后才读写游戏内存，所以钩子不会卡住游戏线程的命令。钩子可能在任意一个模拟 CPU 线程上触发，不能直接读全局变量。
- 时长按游戏更新（帧）算，不是毫秒；游戏不更新时 `tap` / `stick` 的倒计时也停。
- `mask` 命令看到的只是 `[[GOT 0x183931c]+0x6bfc]` 这个掩码，它是"游戏读到的按键"，可以用来确认注入有没有被后面的逻辑覆盖。
- `shot` 依赖 Vulkan 呈现路径，每帧只处理一次请求；复制那帧会 `vkDeviceWaitIdle` 一次，只影响截图那一帧。
- 离线假宿主冒烟测试覆盖了上一版（无锁全局变量）的全部命令往返与注入/卸载；本次改动（SRWLOCK 快照、注释与本文档）尚未重新构建或运行。
