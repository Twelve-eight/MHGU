# DbgPort

这是 MHGU 原生重编译版（SUYU 导出）的 Forge PC 插件，开了一个本机调试端口，用来**注入按键、读写游戏内存**。

**安全**：插件只监听 `127.0.0.1:47100`，没有认证，本机任何进程都能连上并改写游戏内存。只在测试时加载，用完把 `DbgPort` 目录从 mods 里移走。

## 构建与安装

- 构建：运行 `build.bat`（MSVC x64），产物在 `dist\mods\0100770008DD8000\DbgPort\plugins\dbgport.dll`。
- 安装：把 `dist\mods\...\DbgPort` 复制进导出目录的 Forge mods 目录。
- 端口：默认 47100，可在 Forge 配置 `dbgport` 的 `[net] port` 里改。

## 命令

每行一条，回复一行，以 `ok`/`err` 开头。数字用十六进制；`n` 和 `updates` 用十进制。

|命令|作用|
|---|---|
|`base`|main 模块基址|
|`mask`|当前按键掩码 `[[GOT 0x183931c]+0x6bfc]`|
|`hold <mask>`|每次游戏更新都把这些位 OR 进掩码，直到 `release`|
|`tap <mask> <updates>`|按住 N 次更新后自动松开|
|`release`|停止注入|
|`rd <addr> <n>` / `rm <off> <n>`|读 n 字节（≤256）；`rm` 的地址相对 main 基址|
|`w32 <addr> <value>`|写一个 u32，并记进游戏日志|
|`ptr <off> o1 o2 …`|沿指针链 `[[base+off]+o1]+o2…` 逐级读取|

客户端：`node dbg.mjs "mask" ";" "tap 100 6" ";" "mask"`

## 按键位

用的是 Npad 原始位（MHGU DEVLOG 2026-10-25）：

- A 0x1、B 0x2、X 0x4、Y 0x8
- L 0x40、R 0x80、ZL 0x100、ZR 0x200
- 十字键：左 0x1000、上 0x2000、右 0x4000、下 0x8000

其中十字键的 4 个位静态已确认；L/R/ZL/ZR 是推断，需要实机核对。

## 限制

- 命令在 `forge_onUpdate`（游戏主线程）里执行。游戏不更新时（例如停在 Forge 菜单里），命令 2 秒后返回 `err timeout`。
- 注入是在插件更新时把位 OR 进掩码。如果游戏在插件之后才重写掩码，或者另有字段记录"刚按下"的边沿，注入可能不生效；用 `mask` 确认后再判断 [U]。
- 已验证：离线假宿主冒烟测试，全部命令往返通过，注入与卸载正常。实机效果尚未验证。
