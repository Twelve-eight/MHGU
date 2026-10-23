# 私有数据（不公开，不入本仓库）

以下路径在本机通过**目录联接 / 硬链接**指向 `G:/omp works/MHGU-private`（本地 git 仓库，**永不推送**），
因此脚本与代理沿用原路径即可。公开仓库的 `.gitignore` 屏蔽这些路径。备份：`robocopy` 镜像到 `G:\backups\MHGU-private`。

| 原路径 | 类型 | 不公开原因 |
|---|---|---|
| `main.140.flat.bin` | 硬链接 | Capcom 游戏代码 |
| `save-snapshots/` | 联接 | 个人存档 |
| `docs/reference/mhxx-wiki/` | 联接 | 第三方 wiki 内容 |
| `docs/data/mhgu.db`、`docs/data/json/*`（除 README 与两份 monster-slot-map）、`docs/data/{armor,weapons,viewer}/`、`docs/data/{quests,skills,skillMeta,decorations,hammer,weapons}.json` | 硬链接/联接 | Capcom 数据衍生汇编（MHGenDatabase / Kiranico 爬取） |
| `editor-src/` | 联接 | 第三方编辑器反编译源码（原作者未授权开源） |
| `docs/analysis/dumps/` | 联接 | 大段原始反汇编 |

别处机器：clone 公开仓库后，自行准备上述输入（`tools/mhgu/nso-flat.mjs` 从你自己的 exefs 生成 flat）。
新增私有文件：放进 `MHGU-private` 同名路径，再在 MHGU 原位置建链接并加入 `.gitignore`。
