# 怪物动作状态机：state → handler → motion（自动解析）

> **成果与边界**（必读）
> - **state → handler：53 个派发器全部解出**。机制：`u8[this+0x73E0]`(状态号) → `cmp #N` → `mov r0,r0,lsl#2` → `add r1,pc,#4`（r1 = 表基址 = 该指令+8+4）→ `ldr r0,[r0,r1]` → `add pc,r0,r1`。
>   表项是 **`handler − 表基址`** 的相对偏移；每个 case 通常是 `mov r0,r4; pop {..,lr}; b <handler>` 的尾调用。
> - **motion 名：41/53 个派发器至少有 1 个状态解出名字**（如 `em003_00ActionMove`、`em008_00FlyMove`）。
>   方法：在 handler 函数体内找 pc 相对引用的动作名串；若 handler 无直接串，则跟一层 callee 再找。
> - **未解**：部分状态（尤其共享 handler，如 `0xca114`）在 handler 与其一级 callee 内都无动作名串——
>   这些状态的动作名可能由**数据驱动**（romfs 的 motion 表）或由更深的间接层决定，**不要**当成「无动作」。
> - 有些名列 `—` 是因为函数边界用「首个 `pop {..,pc}`」估计，超长 handler 可能截断。
> - 生成脚本：`tools/mhgu/state-motion2.mjs`（可复现）。

## 派发器 `0x5c2cc` — 状态 0..225，单位 `(unknown)`，有名字的状态 0/226

| state | handler | motion |
|---|---|---|
| 0 | `0x5c68c` | — |
| 1 | `0x5c68c` | — |
| 2 | `0x5c6f0` | — |
| 3 | `0x5c6f0` | — |
| 4 | `0x5c68c` | — |
| 5 | `0x5c68c` | — |
| 6 | `0x5c6f0` | — |
| 7 | `0x5c68c` | — |
| 8 | `0x5c68c` | — |
| 9 | `0x5c68c` | — |
| 10 | `0x5c68c` | — |
| 11 | `0x5c68c` | — |
| 12 | `0x5c68c` | — |
| 13 | `0x5c68c` | — |
| 14 | `0x5c68c` | — |
| 15 | `0x5c68c` | — |
| 16 | `0x5c68c` | — |
| 17 | `0x5c68c` | — |
| 18 | `0x5c68c` | — |
| 19 | `0x5c68c` | — |
| 20 | `0x5c6f0` | — |
| 21 | `0x5c6f0` | — |
| 22 | `0x5c6f0` | — |
| 23 | `0x5c7f8` | — |
| 24 | `0x5c7f8` | — |
| 25 | `0x5c7f8` | — |
| 26 | `0x5c6f0` | — |
| 27 | `0x5c7f8` | — |
| 28 | `0x5c7f8` | — |
| 29 | `0x5c7f8` | — |
| 30 | `0x5c6f0` | — |
| 31 | `0x5c6f0` | — |
| 32 | `0x5c7f8` | — |
| 33 | `0x5c7f8` | — |
| 34 | `0x5c7f8` | — |
| 35 | `0x5c6f0` | — |
| 36 | `0x5c6f0` | — |
| 37 | `0x5c6f0` | — |
| 38 | `0x5c6f0` | — |
| 39 | `0x5c6f0` | — |
| 40 | `0x5c6f0` | — |
| 41 | `0x5c6f0` | — |
| 42 | `0x5c6f0` | — |
| 43 | `0x5c6f0` | — |
| 44 | `0x5c6f0` | — |
| 45 | `0x5c6f0` | — |
| 46 | `0x5c7f8` | — |
| 47 | `0x5c7f8` | — |
| 48 | `0x5c7f8` | — |
| 49 | `0x5c6f0` | — |
| 50 | `0x5c6f0` | — |
| 51 | `0x5c7f8` | — |
| 52 | `0x5c7f8` | — |
| 53 | `0x5c7f8` | — |
| 54 | `0x5c6f0` | — |
| 55 | `0x5c6f0` | — |
| 56 | `0x5c6f0` | — |
| 57 | `0x5c7f8` | — |
| 58 | `0x5c7f8` | — |
| 59 | `0x5c7f8` | — |
| 60 | `0x5c6f0` | — |
| 61 | `0x5c6f0` | — |
| 62 | `0x5c6f0` | — |
| 63 | `0x5c6f0` | — |
| 64 | `0x5c6f0` | — |
| 65 | `0x5c6f0` | — |
| 66 | `0x5c6f0` | — |
| 67 | `0x5c6f0` | — |
| 68 | `0x5c6f0` | — |
| 69 | `0x5c6f0` | — |
| 70 | `0x5c6f0` | — |
| 71 | `0x5c6f0` | — |
| 72 | `0x5c6f0` | — |
| 73 | `0x5c6f0` | — |
| 74 | `0x5c6f0` | — |
| 75 | `0x5c6f0` | — |
| 76 | `0x5c68c` | — |
| 77 | `0x5c6f0` | — |
| 78 | `0x5c6f0` | — |
| 79 | `0x5c68c` | — |
| 80 | `0x5c68c` | — |
| 81 | `0x5c6f0` | — |
| 82 | `0x5c68c` | — |
| 83 | `0x5c68c` | — |
| 84 | `0x5c68c` | — |
| 85 | `0x5c68c` | — |
| 86 | `0x5c68c` | — |
| 87 | `0x5c68c` | — |
| 88 | `0x5c68c` | — |
| 89 | `0x5c6f0` | — |
| 90 | `0x5c7f8` | — |
| 91 | `0x5c6f0` | — |
| 92 | `0x5c6f0` | — |
| 93 | `0x5c7f8` | — |
| 94 | `0x5c7f8` | — |
| 95 | `0x5c7f8` | — |
| 96 | `0x5c7f8` | — |
| 97 | `0x5c6f0` | — |
| 98 | `0x5c6f0` | — |
| 99 | `0x5c7f8` | — |
| 100 | `0x5c7f8` | — |
| 101 | `0x5c7f8` | — |
| 102 | `0x5c7f8` | — |
| 103 | `0x5c7f8` | — |
| 104 | `0x5c7f8` | — |
| 105 | `0x5c6f0` | — |
| 106 | `0x5c6f0` | — |
| 107 | `0x5c68c` | — |
| 108 | `0x5c68c` | — |
| 109 | `0x5c68c` | — |
| 110 | `0x5c68c` | — |
| 111 | `0x5c6f0` | — |
| 112 | `0x5c6f0` | — |
| 113 | `0x5c6f0` | — |
| 114 | `0x5c6f0` | — |
| 115 | `0x5c6f0` | — |
| 116 | `0x5c6f0` | — |
| 117 | `0x5c6f0` | — |
| 118 | `0x5c6f0` | — |
| 119 | `0x5c6f0` | — |
| 120 | `0x5c6f0` | — |
| 121 | `0x5c6f0` | — |
| 122 | `0x5c6f0` | — |
| 123 | `0x5c6f0` | — |
| 124 | `0x5c6f0` | — |
| 125 | `0x5c6f0` | — |
| 126 | `0x5c6f0` | — |
| 127 | `0x5c6f0` | — |
| 128 | `0x5c6f0` | — |
| 129 | `0x5c68c` | — |
| 130 | `0x5c68c` | — |
| 131 | `0x5c6f0` | — |
| 132 | `0x5c6f0` | — |
| 133 | `0x5c6f0` | — |
| 134 | `0x5c6f0` | — |
| 135 | `0x5c6f0` | — |
| 136 | `0x5c6f0` | — |
| 137 | `0x5c6f0` | — |
| 138 | `0x5c6f0` | — |
| 139 | `0x5c6f0` | — |
| 140 | `0x5c6f0` | — |
| 141 | `0x5c68c` | — |
| 142 | `0x5c6f0` | — |
| 143 | `0x5c68c` | — |
| 144 | `0x5c6f0` | — |
| 145 | `0x5c68c` | — |
| 146 | `0x5c6f0` | — |
| 147 | `0x5c6f0` | — |
| 148 | `0x5c6f0` | — |
| 149 | `0x5c6f0` | — |
| 150 | `0x5c6f0` | — |
| 151 | `0x5c6f0` | — |
| 152 | `0x5c6f0` | — |
| 153 | `0x5c6f0` | — |
| 154 | `0x5c6f0` | — |
| 155 | `0x5c6f0` | — |
| 156 | `0x5c6f0` | — |
| 157 | `0x5c6f0` | — |
| 158 | `0x5c6f0` | — |
| 159 | `0x5c6f0` | — |
| 160 | `0x5c7f8` | — |
| 161 | `0x5c7f8` | — |
| 162 | `0x5c6f0` | — |
| 163 | `0x5c6f0` | — |
| 164 | `0x5c6f0` | — |
| 165 | `0x5c6f0` | — |
| 166 | `0x5c6f0` | — |
| 167 | `0x5c6f0` | — |
| 168 | `0x5c68c` | — |
| 169 | `0x5c6f0` | — |
| 170 | `0x5c6f0` | — |
| 171 | `0x5c6f0` | — |
| 172 | `0x5c6f0` | — |
| 173 | `0x5c6f0` | — |
| 174 | `0x5c6f0` | — |
| 175 | `0x5c6f0` | — |
| 176 | `0x5c6f0` | — |
| 177 | `0x5c6f0` | — |
| 178 | `0x5c6f0` | — |
| 179 | `0x5c6f0` | — |
| 180 | `0x5c6f0` | — |
| 181 | `0x5c6f0` | — |
| 182 | `0x5c6f0` | — |
| 183 | `0x5c6f0` | — |
| 184 | `0x5c6f0` | — |
| 185 | `0x5c6f0` | — |
| 186 | `0x5c6f0` | — |
| 187 | `0x5c6f0` | — |
| 188 | `0x5c68c` | — |
| 189 | `0x5c6f0` | — |
| 190 | `0x5c6f0` | — |
| 191 | `0x5c6f0` | — |
| 192 | `0x5c6f0` | — |
| 193 | `0x5c7f8` | — |
| 194 | `0x5c7f8` | — |
| 195 | `0x5c7f8` | — |
| 196 | `0x5c7f8` | — |
| 197 | `0x5c6f0` | — |
| 198 | `0x5c6f0` | — |
| 199 | `0x5c6f0` | — |
| 200 | `0x5c6f0` | — |
| 201 | `0x5c6f0` | — |
| 202 | `0x5c6f0` | — |
| 203 | `0x5c6f0` | — |
| 204 | `0x5c6f0` | — |
| 205 | `0x5c6f0` | — |
| 206 | `0x5c6f0` | — |
| 207 | `0x5c6f0` | — |
| 208 | `0x5c6f0` | — |
| 209 | `0x5c6f0` | — |
| 210 | `0x5c6f0` | — |
| 211 | `0x5c6f0` | — |
| 212 | `0x5c7f8` | — |
| 213 | `0x5c6f0` | — |
| 214 | `0x5c6f0` | — |
| 215 | `0x5c6f0` | — |
| 216 | `0x5c6f0` | — |
| 217 | `0x5c6f0` | — |
| 218 | `0x5c6f0` | — |
| 219 | `0x5c6f0` | — |
| 220 | `0x5c6f0` | — |
| 221 | `0x5c7f8` | — |
| 222 | `0x5c6f0` | — |
| 223 | `0x5c6f0` | — |
| 224 | `0x5c6f0` | — |
| 225 | `0x5c68c` | — |

## 派发器 `0x81ca4` — 状态 0..10，单位 `(unknown)`，有名字的状态 0/11

| state | handler | motion |
|---|---|---|
| 0 | `0x81da8` | — |
| 1 | `0x81d90` | — |
| 2 | `0x81d90` | — |
| 3 | `0x81d90` | — |
| 4 | `0x81da8` | — |
| 5 | `0x81d90` | — |
| 6 | `0x81d90` | — |
| 7 | `0x81d90` | — |
| 8 | `0x81d90` | — |
| 9 | `0x81da8` | — |
| 10 | `0x81d90` | — |

## 派发器 `0xd227d8` — 状态 0..17，单位 `em003_00A`，有名字的状态 4/18

| state | handler | motion |
|---|---|---|
| 0 | `0x53aa70` | — |
| 1 | `0xd14234` | em003_00ActionMove |
| 2 | `0xd151b4` | — |
| 3 | `0xd189e4` | — |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xca114` | — |
| 7 | `0xd1fa94` | — |
| 8 | `0xd22890` | em003_00PreCatchMove / em003_00RevivalMove / em003_00DemoMove |
| 9 | `0xd20c08` | — |
| 10 | `0xd20c74` | — |
| 11 | `0xd21518` | — |
| 12 | `0xd228d0` | em003_00RevivalMove / em003_00DemoMove |
| 13 | `0xd228ec` | em003_00DemoMove |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0xd3137c` — 状态 0..7，单位 `(unknown)`，有名字的状态 0/8

| state | handler | motion |
|---|---|---|
| 0 | `0xd313f8` | — |
| 1 | `0xd314ac` | — |
| 2 | `0xd31480` | — |
| 3 | `0xd314ac` | — |
| 4 | `0xd314ac` | — |
| 5 | `0xd314cc` | — |
| 6 | `0xd314ac` | — |
| 7 | `0xd314ac` | — |

## 派发器 `0xd35e74` — 状态 0..17，单位 `em007_00R`，有名字的状态 16/18

| state | handler | motion |
|---|---|---|
| 0 | `0xd35edc` | em007_00RevivalMove |
| 1 | `0xd35ee8` | em007_00RevivalMove |
| 2 | `0xd35ef4` | em007_00RevivalMove |
| 3 | `0xd35f00` | em007_00RevivalMove |
| 4 | `0xd35f0c` | em007_00RevivalMove |
| 5 | `0xd35f0c` | em007_00RevivalMove |
| 6 | `0xd35f20` | em007_00RevivalMove |
| 7 | `0xd35f2c` | em007_00RevivalMove |
| 8 | `0xd35f0c` | em007_00RevivalMove |
| 9 | `0xd35f0c` | em007_00RevivalMove |
| 10 | `0xd35f38` | em007_00RevivalMove |
| 11 | `0xd35f44` | em007_00RevivalMove |
| 12 | `0xd35f50` | em007_00RevivalMove |
| 13 | `0xd35f74` | — |
| 14 | `0xd35f0c` | em007_00RevivalMove |
| 15 | `0xd35f0c` | em007_00RevivalMove |
| 16 | `0xd35f0c` | em007_00RevivalMove |
| 17 | `0xd35f80` | — |

## 派发器 `0xd52f58` — 状态 0..17，单位 `em008_00F`，有名字的状态 8/18

| state | handler | motion |
|---|---|---|
| 0 | `0xd4a540` | em008_00FwMove |
| 1 | `0xd4b03c` | em008_00ActionMove |
| 2 | `0xd4bc34` | em008_00MoveMove |
| 3 | `0xd4e564` | em008_00FlyMove |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xca114` | — |
| 7 | `0xd51ea4` | em008_00AttackMove |
| 8 | `0xca114` | — |
| 9 | `0xca114` | — |
| 10 | `0xd52638` | — |
| 11 | `0xd52df4` | em008_00RevivalMove / em008_00DemoMove |
| 12 | `0xd53028` | em008_00RevivalMove / em008_00DemoMove |
| 13 | `0xd53044` | em008_00DemoMove |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0xd6d724` — 状态 0..17，单位 `(unknown)`，有名字的状态 18/18

| state | handler | motion |
|---|---|---|
| 0 | `0xd6d78c` | revival_move |
| 1 | `0xd6d798` | revival_move |
| 2 | `0xd6d7a4` | revival_move |
| 3 | `0xd6d7b0` | revival_move |
| 4 | `0xd6d7b0` | revival_move |
| 5 | `0xd6d7b0` | revival_move |
| 6 | `0xd6d7c4` | revival_move |
| 7 | `0xd6d7d0` | revival_move |
| 8 | `0xd6d7b0` | revival_move |
| 9 | `0xd6d7b0` | revival_move |
| 10 | `0xd6d7dc` | revival_move |
| 11 | `0xd6d7e8` | revival_move |
| 12 | `0xd6d7f4` | revival_move |
| 13 | `0xd6d7b0` | revival_move |
| 14 | `0xd6d7b0` | revival_move |
| 15 | `0xd6d7b0` | revival_move |
| 16 | `0xd6d7b0` | revival_move |
| 17 | `0xd6d818` | revival_move |

## 派发器 `0xd76978` — 状态 0..17，单位 `em011_00F`，有名字的状态 6/18

| state | handler | motion |
|---|---|---|
| 0 | `0xd71948` | em011_00FwMove |
| 1 | `0xd71f3c` | em011_00ActionMove |
| 2 | `0xd7349c` | em011_00MoveMove |
| 3 | `0xca114` | — |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xca114` | — |
| 7 | `0xd75bac` | — |
| 8 | `0xca114` | — |
| 9 | `0xca114` | — |
| 10 | `0xd7639c` | — |
| 11 | `0xd76a1c` | em011_00RevivalMove / em011_00DemoMove |
| 12 | `0xd76a50` | em011_00RevivalMove / em011_00DemoMove |
| 13 | `0xd76a6c` | em011_00DemoMove |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0xd8d7b4` — 状态 0..17，单位 `em013_00F`，有名字的状态 5/18

| state | handler | motion |
|---|---|---|
| 0 | `0xd8d820` | em013_00FwMove / em013_00MoveMove / em013_00ActionMove |
| 1 | `0xd8d844` | em013_00ActionMove / em013_00FlyMove |
| 2 | `0xd8d82c` | em013_00MoveMove / em013_00ActionMove / em013_00FlyMove |
| 3 | `0xd8d850` | em013_00FlyMove |
| 4 | `0xd8d85c` | — |
| 5 | `0xd8d868` | — |
| 6 | `0xd8d868` | — |
| 7 | `0xd8d838` | em013_00ActionMove / em013_00FlyMove |
| 8 | `0xd8d868` | — |
| 9 | `0xd8d868` | — |
| 10 | `0xd8d87c` | — |
| 11 | `0xd8d888` | — |
| 12 | `0xd8d868` | — |
| 13 | `0xd8d8a8` | — |
| 14 | `0xd8d868` | — |
| 15 | `0xd8d868` | — |
| 16 | `0xd8d868` | — |
| 17 | `0xd8d8b4` | — |

## 派发器 `0xdb3bac` — 状态 0..17，单位 `em018_00F`，有名字的状态 6/18

| state | handler | motion |
|---|---|---|
| 0 | `0xda9da4` | em018_00FwMove |
| 1 | `0xdaa788` | — |
| 2 | `0xdab670` | em018_00MoveMove |
| 3 | `0xdaeacc` | em018_00FlyMove |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xca114` | — |
| 7 | `0xdb28e8` | — |
| 8 | `0xca114` | — |
| 9 | `0xca114` | — |
| 10 | `0xdb3264` | — |
| 11 | `0xdb3a40` | em018_00RevivalMove / em018_00DemoMove |
| 12 | `0xdb3c7c` | em018_00RevivalMove / em018_00DemoMove |
| 13 | `0xdb3c98` | em018_00DemoMove |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0xdc3908` — 状态 0..17，单位 `em019_00P`，有名字的状态 18/18

| state | handler | motion |
|---|---|---|
| 0 | `0xdc3970` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 1 | `0xdc397c` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 2 | `0xdc3988` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 3 | `0xdc3994` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 4 | `0xdc39bc` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 5 | `0xdc39bc` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 6 | `0xdc39d0` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 7 | `0xdc39dc` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 8 | `0xdc39e8` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 9 | `0xdc39bc` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 10 | `0xdc3a04` | em019_00DemoMove / em019_00FlyMove |
| 11 | `0xdc3a10` | em019_00DemoMove / em019_00FlyMove |
| 12 | `0xdc3a1c` | em019_00DemoMove / em019_00FlyMove |
| 13 | `0xdc3a28` | em019_00DemoMove / em019_00FlyMove |
| 14 | `0xdc39bc` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 15 | `0xdc39bc` | em019_00PreCatchMove / em019_00DemoMove / em019_00FlyMove |
| 16 | `0xdc3a44` | em019_00FlyMove |
| 17 | `0xdc3a50` | em019_00FlyMove |

## 派发器 `0xdc75fc` — 状态 0..17，单位 `(unknown)`，有名字的状态 13/18

| state | handler | motion |
|---|---|---|
| 0 | `0xdc7664` | fw_move / action_move / fly_move |
| 1 | `0xdc7670` | action_move / fly_move / moguri_move |
| 2 | `0xdc767c` | fly_move / moguri_move |
| 3 | `0xdc7688` | fly_move / moguri_move |
| 4 | `0xdc7694` | moguri_move |
| 5 | `0xdc7694` | moguri_move |
| 6 | `0xdc76a8` | moguri_move |
| 7 | `0xdc76b4` | — |
| 8 | `0xdc7694` | moguri_move |
| 9 | `0xdc7694` | moguri_move |
| 10 | `0xdc76c0` | — |
| 11 | `0xdc76cc` | — |
| 12 | `0xdc76d8` | — |
| 13 | `0xdc7694` | moguri_move |
| 14 | `0xdc7694` | moguri_move |
| 15 | `0xdc7694` | moguri_move |
| 16 | `0xdc7694` | moguri_move |
| 17 | `0xdc76e4` | — |

## 派发器 `0xddcfe8` — 状态 0..17，单位 `em022_00F`，有名字的状态 11/18

| state | handler | motion |
|---|---|---|
| 0 | `0xddd050` | em022_00FwMove / em022_00FlyMove / em022_00MoguriMove |
| 1 | `0xddd05c` | em022_00FlyMove / em022_00MoguriMove |
| 2 | `0xddd068` | em022_00FlyMove / em022_00MoguriMove |
| 3 | `0xddd074` | em022_00FlyMove / em022_00MoguriMove |
| 4 | `0xddd080` | em022_00MoguriMove |
| 5 | `0xddd080` | em022_00MoguriMove |
| 6 | `0xddd094` | em022_00MoguriMove |
| 7 | `0xddd0a0` | — |
| 8 | `0xddd080` | em022_00MoguriMove |
| 9 | `0xddd080` | em022_00MoguriMove |
| 10 | `0xddd0ac` | — |
| 11 | `0xddd0b8` | — |
| 12 | `0xddd0c4` | — |
| 13 | `0xddd0d0` | — |
| 14 | `0xddd080` | em022_00MoguriMove |
| 15 | `0xddd0e4` | — |
| 16 | `0xddd080` | em022_00MoguriMove |
| 17 | `0xddd0dc` | — |

## 派发器 `0xdf37dc` — 状态 0..7，单位 `(unknown)`，有名字的状态 0/8

| state | handler | motion |
|---|---|---|
| 0 | `0xdf39c8` | — |
| 1 | `0xdf381c` | — |
| 2 | `0xdf3954` | — |
| 3 | `0xdf417c` | — |
| 4 | `0xdf397c` | — |
| 5 | `0xdf417c` | — |
| 6 | `0xdf417c` | — |
| 7 | `0xdf39ac` | — |

## 派发器 `0xe030c8` — 状态 0..12，单位 `(unknown)`，有名字的状态 0/13

| state | handler | motion |
|---|---|---|
| 0 | `0xe03120` | — |
| 1 | `0xe03138` | — |
| 2 | `0xe03160` | — |
| 3 | `0xe0328c` | — |
| 4 | `0xe0328c` | — |
| 5 | `0xe0328c` | — |
| 6 | `0xe031b4` | — |
| 7 | `0xe0328c` | — |
| 8 | `0xe0328c` | — |
| 9 | `0xe032a4` | — |
| 10 | `0xe0328c` | — |
| 11 | `0xe0328c` | — |
| 12 | `0xe03198` | — |

## 派发器 `0xe65b04` — 状态 0..17，单位 `em038_00F`，有名字的状态 6/18

| state | handler | motion |
|---|---|---|
| 0 | `0xe5f19c` | em038_00FwMove |
| 1 | `0xe5fe54` | em038_00ActionMove |
| 2 | `0xe61070` | em038_00MoveMove |
| 3 | `0xca114` | — |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xe63124` | — |
| 7 | `0xe6508c` | em038_00AttackMove |
| 8 | `0xca114` | — |
| 9 | `0xca114` | — |
| 10 | `0xe653d0` | — |
| 11 | `0xe65bb4` | em038_00DemoMove |
| 12 | `0xca114` | — |
| 13 | `0xe65bdc` | em038_00DemoMove |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0xe73d54` — 状态 0..34，单位 `(unknown)`，有名字的状态 0/35

| state | handler | motion |
|---|---|---|
| 0 | `0xe73e68` | — |
| 1 | `0xe73e68` | — |
| 2 | `0xe73e8c` | — |
| 3 | `0xe73e8c` | — |
| 4 | `0xe73e8c` | — |
| 5 | `0xe73e8c` | — |
| 6 | `0xe73e8c` | — |
| 7 | `0xe73e8c` | — |
| 8 | `0xe73e8c` | — |
| 9 | `0xe73e8c` | — |
| 10 | `0xe73e8c` | — |
| 11 | `0xe73e8c` | — |
| 12 | `0xe73e8c` | — |
| 13 | `0xe73e8c` | — |
| 14 | `0xe73e8c` | — |
| 15 | `0xe73e68` | — |
| 16 | `0xe73e8c` | — |
| 17 | `0xe73e8c` | — |
| 18 | `0xe73e8c` | — |
| 19 | `0xe73e8c` | — |
| 20 | `0xe73e68` | — |
| 21 | `0xe73e8c` | — |
| 22 | `0xe73e8c` | — |
| 23 | `0xe73e8c` | — |
| 24 | `0xe73e8c` | — |
| 25 | `0xe73e8c` | — |
| 26 | `0xe73e8c` | — |
| 27 | `0xe73e8c` | — |
| 28 | `0xe73e68` | — |
| 29 | `0xe73e8c` | — |
| 30 | `0xe73e68` | — |
| 31 | `0xe73e8c` | — |
| 32 | `0xe73e8c` | — |
| 33 | `0xe73e10` | — |
| 34 | `0xe73e10` | — |

## 派发器 `0xe81b54` — 状态 0..17，单位 `em043_00R`，有名字的状态 18/18

| state | handler | motion |
|---|---|---|
| 0 | `0xe81bbc` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 1 | `0xe81bc8` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 2 | `0xe81bd4` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 3 | `0xe81be0` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 4 | `0xe81ce0` | em043_00PreCatchMove / em043_00FlyMove / em043_00CatchMove |
| 5 | `0xe81ce0` | em043_00PreCatchMove / em043_00FlyMove / em043_00CatchMove |
| 6 | `0xe81c10` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 7 | `0xe81c1c` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 8 | `0xe81c28` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 9 | `0xe81c4c` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 10 | `0xe81c88` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 11 | `0xe81c94` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 12 | `0xe81ca0` | em043_00RevivalMove / em043_00PreCatchMove / em043_00FlyMove |
| 13 | `0xe81cbc` | em043_00PreCatchMove / em043_00FlyMove / em043_00CatchMove |
| 14 | `0xe81ce0` | em043_00PreCatchMove / em043_00FlyMove / em043_00CatchMove |
| 15 | `0xe81ce0` | em043_00PreCatchMove / em043_00FlyMove / em043_00CatchMove |
| 16 | `0xe81cc8` | em043_00PreCatchMove / em043_00FlyMove / em043_00CatchMove |
| 17 | `0xe81cd4` | em043_00PreCatchMove / em043_00FlyMove / em043_00CatchMove |

## 派发器 `0xe8f930` — 状态 0..17，单位 `(unknown)`，有名字的状态 17/18

| state | handler | motion |
|---|---|---|
| 0 | `0xe8f998` | revival_move / demo_move |
| 1 | `0xe8f9a4` | revival_move / demo_move |
| 2 | `0xe8f9b0` | revival_move / demo_move |
| 3 | `0xe8f9bc` | revival_move / demo_move |
| 4 | `0xe8f9c8` | revival_move / demo_move |
| 5 | `0xe8f9c8` | revival_move / demo_move |
| 6 | `0xe8f9dc` | revival_move / demo_move |
| 7 | `0xe8f9e8` | revival_move / demo_move |
| 8 | `0xe8f9c8` | revival_move / demo_move |
| 9 | `0xe8f9c8` | revival_move / demo_move |
| 10 | `0xe8f9f4` | revival_move / demo_move |
| 11 | `0xe8fa00` | revival_move / demo_move |
| 12 | `0xe8fa0c` | revival_move / demo_move |
| 13 | `0xe8fa28` | demo_move |
| 14 | `0xe8f9c8` | revival_move / demo_move |
| 15 | `0xe8f9c8` | revival_move / demo_move |
| 16 | `0xe8f9c8` | revival_move / demo_move |
| 17 | `0xe8fa3c` | — |

## 派发器 `0xeabc50` — 状态 0..17，单位 `(unknown)`，有名字的状态 18/18

| state | handler | motion |
|---|---|---|
| 0 | `0xeabcb8` | revival_move |
| 1 | `0xeabcc4` | revival_move |
| 2 | `0xeabcd0` | revival_move |
| 3 | `0xeabd10` | revival_move |
| 4 | `0xeabd10` | revival_move |
| 5 | `0xeabd10` | revival_move |
| 6 | `0xeabd24` | revival_move |
| 7 | `0xeabd30` | revival_move |
| 8 | `0xeabd10` | revival_move |
| 9 | `0xeabd10` | revival_move |
| 10 | `0xeabcdc` | revival_move |
| 11 | `0xeabce8` | revival_move |
| 12 | `0xeabcf4` | revival_move |
| 13 | `0xeabd3c` | revival_move |
| 14 | `0xeabd10` | revival_move |
| 15 | `0xeabd10` | revival_move |
| 16 | `0xeabd10` | revival_move |
| 17 | `0xeabd48` | revival_move |

## 派发器 `0xeb5a94` — 状态 0..17，单位 `em047_00_`，有名字的状态 2/18

| state | handler | motion |
|---|---|---|
| 0 | `0xeb5afc` | em047_00_fw_move / em047_00_action_move |
| 1 | `0xeb5b08` | em047_00_action_move |
| 2 | `0xeb5b14` | — |
| 3 | `0xeb5bd4` | — |
| 4 | `0xeb5bd4` | — |
| 5 | `0xeb5bd4` | — |
| 6 | `0xeb5b20` | — |
| 7 | `0xeb5b2c` | — |
| 8 | `0xeb5bd4` | — |
| 9 | `0xeb5bd4` | — |
| 10 | `0xeb5b38` | — |
| 11 | `0xeb5b44` | — |
| 12 | `0xeb5bbc` | — |
| 13 | `0xeb5bd4` | — |
| 14 | `0xeb5bd4` | — |
| 15 | `0xeb5bd4` | — |
| 16 | `0xeb5bd4` | — |
| 17 | `0xeb5bc8` | — |

## 派发器 `0xed1404` — 状态 0..12，单位 `(unknown)`，有名字的状态 0/13

| state | handler | motion |
|---|---|---|
| 0 | `0xed1618` | — |
| 1 | `0xed1650` | — |
| 2 | `0xed1678` | — |
| 3 | `0xed176c` | — |
| 4 | `0xed15f0` | — |
| 5 | `0xed15f0` | — |
| 6 | `0xed15f0` | — |
| 7 | `0xed15f0` | — |
| 8 | `0xed15f0` | — |
| 9 | `0xed15f0` | — |
| 10 | `0xed15f0` | — |
| 11 | `0xed1470` | — |
| 12 | `0xed1470` | — |

## 派发器 `0xf1b410` — 状态 0..17，单位 `(unknown)`，有名字的状态 11/18

| state | handler | motion |
|---|---|---|
| 0 | `0xf14f3c` | fw_move |
| 1 | `0xf1b484` | pre_catch_move / fly_move / moguri_move |
| 2 | `0xf1b490` | pre_catch_move / fly_move / moguri_move |
| 3 | `0xf1b49c` | pre_catch_move / fly_move / moguri_move |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xf1b4c0` | pre_catch_move / fly_move / moguri_move |
| 7 | `0xf1b4fc` | pre_catch_move / fly_move / moguri_move |
| 8 | `0xf1b508` | pre_catch_move / fly_move / moguri_move |
| 9 | `0xf1b524` | fly_move / moguri_move / revival_move |
| 10 | `0xf1b530` | fly_move / moguri_move / revival_move |
| 11 | `0xf1b564` | fly_move / moguri_move / revival_move |
| 12 | `0xf1b580` | fly_move / moguri_move / revival_move |
| 13 | `0xca114` | — |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0xf35918` — 状态 0..17，单位 `em061_00F`，有名字的状态 6/18

| state | handler | motion |
|---|---|---|
| 0 | `0xf28404` | em061_00FwMove |
| 1 | `0xf294f4` | — |
| 2 | `0xf2e4c0` | — |
| 3 | `0xf359a4` | em061_00RevivalMove / em061_00DemoMove / em061_00FlyMove |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xf359d4` | em061_00RevivalMove / em061_00DemoMove / em061_00FlyMove |
| 7 | `0xf34580` | — |
| 8 | `0xca114` | — |
| 9 | `0xca114` | — |
| 10 | `0xf35134` | — |
| 11 | `0xf35828` | em061_00RevivalMove / em061_00DemoMove / em061_00FlyMove |
| 12 | `0xf35a34` | em061_00RevivalMove / em061_00DemoMove / em061_00FlyMove |
| 13 | `0xf35a50` | em061_00DemoMove / em061_00FlyMove / em061_00MoguriMove |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0xf48ef0` — 状态 0..7，单位 `(unknown)`，有名字的状态 0/8

| state | handler | motion |
|---|---|---|
| 0 | `0xf49180` | — |
| 1 | `0xf4921c` | — |
| 2 | `0xf492b8` | — |
| 3 | `0xf492b8` | — |
| 4 | `0xf492b8` | — |
| 5 | `0xf492b8` | — |
| 6 | `0xf492b8` | — |
| 7 | `0xf492b8` | — |

## 派发器 `0xf588c0` — 状态 0..17，单位 `em065_00R`，有名字的状态 17/18

| state | handler | motion |
|---|---|---|
| 0 | `0xf5892c` | em065_00RevivalMove / em065_00DemoMove |
| 1 | `0xf58938` | em065_00RevivalMove / em065_00DemoMove |
| 2 | `0xf58944` | em065_00RevivalMove / em065_00DemoMove |
| 3 | `0xf58950` | em065_00RevivalMove / em065_00DemoMove |
| 4 | `0xf5895c` | em065_00RevivalMove / em065_00DemoMove |
| 5 | `0xf5895c` | em065_00RevivalMove / em065_00DemoMove |
| 6 | `0xf5895c` | em065_00RevivalMove / em065_00DemoMove |
| 7 | `0xf58970` | em065_00RevivalMove / em065_00DemoMove |
| 8 | `0xf5895c` | em065_00RevivalMove / em065_00DemoMove |
| 9 | `0xf5895c` | em065_00RevivalMove / em065_00DemoMove |
| 10 | `0xf5897c` | em065_00RevivalMove / em065_00DemoMove |
| 11 | `0xf58988` | em065_00RevivalMove / em065_00DemoMove |
| 12 | `0xf58994` | em065_00RevivalMove / em065_00DemoMove |
| 13 | `0xf589b0` | em065_00DemoMove |
| 14 | `0xf5895c` | em065_00RevivalMove / em065_00DemoMove |
| 15 | `0xf5895c` | em065_00RevivalMove / em065_00DemoMove |
| 16 | `0xf5895c` | em065_00RevivalMove / em065_00DemoMove |
| 17 | `0xf589d4` | — |

## 派发器 `0xf663ec` — 状态 0..17，单位 `em066_00_`，有名字的状态 3/18

| state | handler | motion |
|---|---|---|
| 0 | `0xf5c868` | — |
| 1 | `0xf5dacc` | em066_00_ActionMove |
| 2 | `0xf5f8d4` | — |
| 3 | `0xf6086c` | — |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xf6646c` | em066_00_RevivalMove / em066_00_MoguriMove |
| 7 | `0xf64604` | — |
| 8 | `0xca114` | — |
| 9 | `0xca114` | — |
| 10 | `0xf65000` | — |
| 11 | `0xf656d4` | — |
| 12 | `0xf664ec` | em066_00_RevivalMove / em066_00_MoguriMove |
| 13 | `0xf65ec8` | — |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0xf78fe0` — 状态 0..17，单位 `em067_00P`，有名字的状态 16/18

| state | handler | motion |
|---|---|---|
| 0 | `0xf79048` | em067_00PreCatchMove / em067_00RevivalMove |
| 1 | `0xf790b4` | em067_00PreCatchMove / em067_00RevivalMove |
| 2 | `0xf790c0` | em067_00PreCatchMove / em067_00RevivalMove |
| 3 | `0xf790cc` | em067_00PreCatchMove / em067_00RevivalMove |
| 4 | `0xf790cc` | em067_00PreCatchMove / em067_00RevivalMove |
| 5 | `0xf790cc` | em067_00PreCatchMove / em067_00RevivalMove |
| 6 | `0xf790e0` | em067_00PreCatchMove / em067_00RevivalMove |
| 7 | `0xf790ec` | em067_00PreCatchMove / em067_00RevivalMove |
| 8 | `0xf790f8` | em067_00PreCatchMove / em067_00RevivalMove |
| 9 | `0xf790cc` | em067_00PreCatchMove / em067_00RevivalMove |
| 10 | `0xf79114` | em067_00RevivalMove |
| 11 | `0xf79120` | em067_00RevivalMove |
| 12 | `0xf7912c` | em067_00RevivalMove |
| 13 | `0xf79150` | em067_00DemoMove |
| 14 | `0xf790cc` | em067_00PreCatchMove / em067_00RevivalMove |
| 15 | `0xf790cc` | em067_00PreCatchMove / em067_00RevivalMove |
| 16 | `0xf7915c` | — |
| 17 | `0xf79168` | — |

## 派发器 `0xf89044` — 状态 0..17，单位 `em068_00P`，有名字的状态 18/18

| state | handler | motion |
|---|---|---|
| 0 | `0xf890b0` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 1 | `0xf890bc` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 2 | `0xf890c8` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 3 | `0xf890d4` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 4 | `0xf890d4` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 5 | `0xf890d4` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 6 | `0xf890e8` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 7 | `0xf890f4` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 8 | `0xf89100` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 9 | `0xf890d4` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 10 | `0xf8911c` | em068_00RevivalMove / em068_00Catch2Move |
| 11 | `0xf89128` | em068_00RevivalMove / em068_00Catch2Move |
| 12 | `0xf89134` | em068_00RevivalMove / em068_00Catch2Move |
| 13 | `0xf89150` | em068_00Catch2Move |
| 14 | `0xf890d4` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 15 | `0xf890d4` | em068_00PreCatchMove / em068_00RevivalMove / em068_00Catch2Move |
| 16 | `0xf8915c` | em068_00Catch2Move |
| 17 | `0xf8919c` | em068_00Catch2Move |

## 派发器 `0xf9c8bc` — 状态 0..17，单位 `em069_00D`，有名字的状态 18/18

| state | handler | motion |
|---|---|---|
| 0 | `0xf9c924` | em069_00DemoMove / em069_00PreCatchMove / em069_00RevivalMove |
| 1 | `0xf9c9c0` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |
| 2 | `0xf9c9cc` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |
| 3 | `0xf9c9d8` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |
| 4 | `0xf9c930` | em069_00DemoMove / em069_00PreCatchMove / em069_00RevivalMove |
| 5 | `0xf9c9d8` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |
| 6 | `0xf9c93c` | em069_00DemoMove / em069_00PreCatchMove / em069_00RevivalMove |
| 7 | `0xf9c980` | em069_00DemoMove / em069_00PreCatchMove / em069_00RevivalMove |
| 8 | `0xf9c9ec` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |
| 9 | `0xf9c9d8` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |
| 10 | `0xf9ca08` | em069_00RevivalMove / em069_00MoguriMove |
| 11 | `0xf9ca14` | em069_00RevivalMove / em069_00MoguriMove |
| 12 | `0xf9ca20` | em069_00RevivalMove / em069_00MoguriMove |
| 13 | `0xf9c98c` | em069_00DemoMove / em069_00PreCatchMove / em069_00RevivalMove |
| 14 | `0xf9c9d8` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |
| 15 | `0xf9c9d8` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |
| 16 | `0xf9c9a8` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |
| 17 | `0xf9c9b4` | em069_00PreCatchMove / em069_00RevivalMove / em069_00MoguriMove |

## 派发器 `0xf9f734` — 状态 0..26，单位 `(unknown)`，有名字的状态 0/27

| state | handler | motion |
|---|---|---|
| 0 | `0xf9f7d4` | — |
| 1 | `0xf9f810` | — |
| 2 | `0xf9f7f0` | — |
| 3 | `0xf9f810` | — |
| 4 | `0xf9f810` | — |
| 5 | `0xf9f810` | — |
| 6 | `0xf9f810` | — |
| 7 | `0xf9f810` | — |
| 8 | `0xf9f810` | — |
| 9 | `0xf9f810` | — |
| 10 | `0xf9f810` | — |
| 11 | `0xf9f810` | — |
| 12 | `0xf9f810` | — |
| 13 | `0xf9f810` | — |
| 14 | `0xf9f810` | — |
| 15 | `0xf9f810` | — |
| 16 | `0xf9f810` | — |
| 17 | `0xf9f810` | — |
| 18 | `0xf9f810` | — |
| 19 | `0xf9f810` | — |
| 20 | `0xf9f810` | — |
| 21 | `0xf9f810` | — |
| 22 | `0xf9f810` | — |
| 23 | `0xf9f810` | — |
| 24 | `0xf9f7d4` | — |
| 25 | `0xf9f810` | — |
| 26 | `0xf9f7f0` | — |

## 派发器 `0xfd9e74` — 状态 0..16，单位 `(unknown)`，有名字的状态 0/17

| state | handler | motion |
|---|---|---|
| 0 | `0xfd9ed8` | — |
| 1 | `0xfd9f28` | — |
| 2 | `0xfd9f94` | — |
| 3 | `0xfd9fd4` | — |
| 4 | `0xfd9ffc` | — |
| 5 | `0xfda0f8` | — |
| 6 | `0xfda1bc` | — |
| 7 | `0xfda02c` | — |
| 8 | `0xfda274` | — |
| 9 | — | — |
| 10 | — | — |
| 11 | — | — |
| 12 | — | — |
| 13 | — | — |
| 14 | — | — |
| 15 | — | — |
| 16 | — | — |

## 派发器 `0xfdc07c` — 状态 0..17，单位 `em076_00F`，有名字的状态 5/18

| state | handler | motion |
|---|---|---|
| 0 | `0xfcad1c` | em076_00FwMove |
| 1 | `0xfcd01c` | — |
| 2 | `0xfcd938` | — |
| 3 | `0xfd3b5c` | — |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xfd4764` | — |
| 7 | `0xfda2ac` | — |
| 8 | `0xfdc140` | em076_00PreCatchMove / em076_00RevivalMove / em076_00DemoMove |
| 9 | `0xfdc15c` | em076_00RevivalMove / em076_00DemoMove / em076_00CatchMove |
| 10 | `0xfdb3b4` | — |
| 11 | `0xfdbdb0` | — |
| 12 | `0xfdc1b0` | em076_00RevivalMove / em076_00DemoMove / em076_00CatchMove |
| 13 | `0xfdc1dc` | em076_00RevivalMove / em076_00DemoMove / em076_00CatchMove |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0x10148f4` — 状态 0..17，单位 `(unknown)`，有名字的状态 4/18

| state | handler | motion |
|---|---|---|
| 0 | `0x101495c` | fw_move / move_move / fly_move |
| 1 | `0x1014968` | move_move / fly_move |
| 2 | `0x1014974` | move_move / fly_move |
| 3 | `0x1014980` | fly_move |
| 4 | `0x101498c` | — |
| 5 | `0x1014998` | — |
| 6 | `0x1014998` | — |
| 7 | `0x10149ac` | — |
| 8 | `0x10149b8` | — |
| 9 | `0x10149c4` | — |
| 10 | `0x10149d0` | — |
| 11 | `0x10149dc` | — |
| 12 | `0x10149e8` | — |
| 13 | `0x10149f4` | — |
| 14 | `0x1014998` | — |
| 15 | `0x1014a08` | — |
| 16 | `0x1014998` | — |
| 17 | `0x1014a00` | — |

## 派发器 `0x1038ce0` — 状态 0..17，单位 `em082_00F`，有名字的状态 1/18

| state | handler | motion |
|---|---|---|
| 0 | `0x1038d48` | em082_00FwMove |
| 1 | `0x1038d54` | — |
| 2 | `0x1038d60` | — |
| 3 | `0x1038d6c` | — |
| 4 | `0x1038d78` | — |
| 5 | `0x1038d78` | — |
| 6 | `0x1038d78` | — |
| 7 | `0x1038d8c` | — |
| 8 | `0x1038d78` | — |
| 9 | `0x1038d78` | — |
| 10 | `0x1038d98` | — |
| 11 | `0x1038da4` | — |
| 12 | `0x1038db0` | — |
| 13 | `0x1038d78` | — |
| 14 | `0x1038d78` | — |
| 15 | `0x1038dc4` | — |
| 16 | `0x1038d78` | — |
| 17 | `0x1038dbc` | — |

## 派发器 `0x1053ba4` — 状态 0..17，单位 `(unknown)`，有名字的状态 16/18

| state | handler | motion |
|---|---|---|
| 0 | `0x1053c0c` | revival_move / demo_move |
| 1 | `0x1053c18` | revival_move / demo_move |
| 2 | `0x1053c24` | revival_move / demo_move |
| 3 | `0x1053c30` | revival_move / demo_move |
| 4 | `0x1053c30` | revival_move / demo_move |
| 5 | `0x1053c30` | revival_move / demo_move |
| 6 | `0x1053c30` | revival_move / demo_move |
| 7 | `0x1053c44` | revival_move / demo_move |
| 8 | `0x1053c50` | revival_move / demo_move |
| 9 | `0x1053c5c` | revival_move / demo_move |
| 10 | `0x1053c68` | revival_move / demo_move |
| 11 | `0x1053c74` | revival_move / demo_move |
| 12 | `0x1053c80` | revival_move / demo_move |
| 13 | `0x1053c8c` | demo_move |
| 14 | `0x1053c30` | revival_move / demo_move |
| 15 | `0x1053ca0` | — |
| 16 | `0x1053c30` | revival_move / demo_move |
| 17 | `0x1053c98` | — |

## 派发器 `0x106cbec` — 状态 0..17，单位 `(unknown)`，有名字的状态 0/18

| state | handler | motion |
|---|---|---|
| 0 | `0x1072b54` | — |
| 1 | `0x1072d74` | — |
| 2 | `0x1073d74` | — |
| 3 | `0xca114` | — |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0x1076388` | — |
| 7 | `0x1076bbc` | — |
| 8 | `0xca114` | — |
| 9 | `0xca114` | — |
| 10 | `0x107bee4` | — |
| 11 | `0x107d278` | — |
| 12 | `0xca114` | — |
| 13 | `0x107d3c4` | — |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0x1081408` — 状态 0..100，单位 `(unknown)`，有名字的状态 0/101

| state | handler | motion |
|---|---|---|
| 0 | — | — |
| 1 | — | — |
| 2 | `0x1081504` | — |
| 3 | — | — |
| 4 | — | — |
| 5 | — | — |
| 6 | — | — |
| 7 | — | — |
| 8 | — | — |
| 9 | — | — |
| 10 | — | — |
| 11 | — | — |
| 12 | — | — |
| 13 | — | — |
| 14 | — | — |
| 15 | `0x1081514` | — |
| 16 | `0x1081594` | — |
| 17 | `0x1081620` | — |
| 18 | `0x10816b0` | — |
| 19 | — | — |
| 20 | — | — |
| 21 | — | — |
| 22 | — | — |
| 23 | — | — |
| 24 | — | — |
| 25 | — | — |
| 26 | — | — |
| 27 | — | — |
| 28 | — | — |
| 29 | — | — |
| 30 | — | — |
| 31 | — | — |
| 32 | — | — |
| 33 | — | — |
| 34 | — | — |
| 35 | — | — |
| 36 | — | — |
| 37 | — | — |
| 38 | — | — |
| 39 | — | — |
| 40 | — | — |
| 41 | — | — |
| 42 | — | — |
| 43 | — | — |
| 44 | — | — |
| 45 | — | — |
| 46 | — | — |
| 47 | — | — |
| 48 | — | — |
| 49 | — | — |
| 50 | — | — |
| 51 | — | — |
| 52 | — | — |
| 53 | — | — |
| 54 | — | — |
| 55 | — | — |
| 56 | — | — |
| 57 | — | — |
| 58 | — | — |
| 59 | — | — |
| 60 | — | — |
| 61 | — | — |
| 62 | — | — |
| 63 | — | — |
| 64 | — | — |
| 65 | — | — |
| 66 | — | — |
| 67 | — | — |
| 68 | — | — |
| 69 | — | — |
| 70 | — | — |
| 71 | — | — |
| 72 | — | — |
| 73 | — | — |
| 74 | — | — |
| 75 | — | — |
| 76 | — | — |
| 77 | — | — |
| 78 | — | — |
| 79 | — | — |
| 80 | — | — |
| 81 | — | — |
| 82 | — | — |
| 83 | — | — |
| 84 | — | — |
| 85 | — | — |
| 86 | — | — |
| 87 | — | — |
| 88 | — | — |
| 89 | — | — |
| 90 | — | — |
| 91 | — | — |
| 92 | — | — |
| 93 | — | — |
| 94 | — | — |
| 95 | — | — |
| 96 | — | — |
| 97 | — | — |
| 98 | — | — |
| 99 | — | — |
| 100 | — | — |

## 派发器 `0x10cd28c` — 状态 0..11，单位 `ems002_00`，有名字的状态 6/12

| state | handler | motion |
|---|---|---|
| 0 | `0x10cd2f4` | ems002_00ActionMove |
| 1 | `0x539d54` | — |
| 2 | `0x10cd33c` | ems002_00ActionMove |
| 3 | `0x539d54` | — |
| 4 | `0x10cd3b0` | ems002_00ActionMove |
| 5 | `0x10cd424` | ems002_00ActionMove |
| 6 | `0x10cd524` | — |
| 7 | `0x10cdf60` | — |
| 8 | `0x539d54` | — |
| 9 | `0x10cd478` | ems002_00ActionMove |
| 10 | `0x10cd4c4` | ems002_00ActionMove |
| 11 | `0x10cd56c` | — |

## 派发器 `0x10d2280` — 状态 0..17，单位 `ems003_00`，有名字的状态 18/18

| state | handler | motion |
|---|---|---|
| 0 | `0x10d22e8` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 1 | `0x10d2330` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 2 | `0x10d233c` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 3 | `0x10d2348` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 4 | `0x10d2354` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 5 | `0x10d2354` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 6 | `0x10d2354` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 7 | `0x10d22f4` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 8 | `0x10d2354` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 9 | `0x10d2354` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 10 | `0x10d2368` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 11 | `0x10d2374` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 12 | `0x10d2380` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 13 | `0x10d239c` | ems003_00DemoMove / ems003_00AttackMove |
| 14 | `0x10d23b8` | ems003_00AttackMove |
| 15 | `0x10d2354` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 16 | `0x10d2354` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |
| 17 | `0x10d2324` | ems003_00RevivalMove / ems003_00DemoMove / ems003_00AttackMove |

## 派发器 `0x10d2c34` — 状态 0..17，单位 `(unknown)`，有名字的状态 4/18

| state | handler | motion |
|---|---|---|
| 0 | `0x10d2c9c` | action_move / move_move / fly_move |
| 1 | `0x10d2ca8` | action_move / move_move / fly_move |
| 2 | `0x10d2cb4` | move_move / fly_move |
| 3 | `0x10d2cc0` | fly_move |
| 4 | `0x10d2ccc` | — |
| 5 | `0x10d2ccc` | — |
| 6 | `0x10d2ccc` | — |
| 7 | `0x10d2ce0` | — |
| 8 | `0x10d2ccc` | — |
| 9 | `0x10d2ccc` | — |
| 10 | `0x10d2cec` | — |
| 11 | `0x10d2cf8` | — |
| 12 | `0x10d2d04` | — |
| 13 | `0x10d2ccc` | — |
| 14 | `0x10d2ccc` | — |
| 15 | `0x10d2d18` | — |
| 16 | `0x10d2ccc` | — |
| 17 | `0x10d2d10` | — |

## 派发器 `0x10d4a0c` — 状态 0..17，单位 `(unknown)`，有名字的状态 11/18

| state | handler | motion |
|---|---|---|
| 0 | `0x10d4a74` | fw_move / move_move |
| 1 | `0x10d4a80` | move_move |
| 2 | `0x10d4a94` | move_move |
| 3 | `0x10d4aa0` | — |
| 4 | `0x10d4a80` | move_move |
| 5 | `0x10d4a80` | move_move |
| 6 | `0x10d4a80` | move_move |
| 7 | `0x10d4aac` | — |
| 8 | `0x10d4a80` | move_move |
| 9 | `0x10d4a80` | move_move |
| 10 | `0x10d4ab8` | — |
| 11 | `0x10d4ac4` | — |
| 12 | `0x10d4ad0` | — |
| 13 | `0x10d4adc` | — |
| 14 | `0x10d4a80` | move_move |
| 15 | `0x10d4a80` | move_move |
| 16 | `0x10d4a80` | move_move |
| 17 | `0x10d4ae8` | — |

## 派发器 `0x10e8044` — 状态 0..17，单位 `ems016_00`，有名字的状态 18/18

| state | handler | motion |
|---|---|---|
| 0 | `0x10e80ac` | ems016_00RevivalMove / ems016_00DemoMove / ems016_00AttackMove |
| 1 | `0x10e80b8` | ems016_00RevivalMove / ems016_00DemoMove / ems016_00AttackMove |
| 2 | `0x10e80c4` | ems016_00RevivalMove / ems016_00DemoMove / ems016_00AttackMove |
| 3 | `0x10e80d0` | ems016_00RevivalMove / ems016_00DemoMove / ems016_00AttackMove |
| 4 | `0x10e81a0` | ems016_00AttackMove |
| 5 | `0x10e81a0` | ems016_00AttackMove |
| 6 | `0x10e81a0` | ems016_00AttackMove |
| 7 | `0x10e80dc` | ems016_00RevivalMove / ems016_00DemoMove / ems016_00AttackMove |
| 8 | `0x10e81a0` | ems016_00AttackMove |
| 9 | `0x10e81a0` | ems016_00AttackMove |
| 10 | `0x10e811c` | ems016_00RevivalMove / ems016_00DemoMove / ems016_00AttackMove |
| 11 | `0x10e8128` | ems016_00RevivalMove / ems016_00DemoMove / ems016_00AttackMove |
| 12 | `0x10e8134` | ems016_00RevivalMove / ems016_00DemoMove / ems016_00AttackMove |
| 13 | `0x10e8150` | ems016_00DemoMove / ems016_00AttackMove |
| 14 | `0x10e816c` | ems016_00AttackMove |
| 15 | `0x10e81a0` | ems016_00AttackMove |
| 16 | `0x10e81a0` | ems016_00AttackMove |
| 17 | `0x10e8194` | ems016_00AttackMove |

## 派发器 `0x10efeb0` — 状态 0..17，单位 `ems022_00`，有名字的状态 6/18

| state | handler | motion |
|---|---|---|
| 0 | `0x10ee28c` | — |
| 1 | `0x10ee500` | ems022_00ActionMove |
| 2 | `0x10eeab8` | ems022_00MoveMove |
| 3 | `0x10eff3c` | ems022_00RevivalMove / ems022_00FlyMove |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xca114` | — |
| 7 | `0x10ef904` | ems022_00AttackMove |
| 8 | `0xca114` | — |
| 9 | `0xca114` | — |
| 10 | `0x10efa70` | — |
| 11 | `0x10eff80` | ems022_00RevivalMove / ems022_00FlyMove |
| 12 | `0x10effac` | ems022_00RevivalMove / ems022_00FlyMove |
| 13 | `0xca114` | — |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |

## 派发器 `0x10f06c0` — 状态 0..17，单位 `(unknown)`，有名字的状态 15/18

| state | handler | motion |
|---|---|---|
| 0 | `0x10f0728` | move_move / attack_move / revival_move |
| 1 | `0x10f0734` | move_move / attack_move / revival_move |
| 2 | `0x10f0740` | move_move / attack_move / revival_move |
| 3 | `0x10f074c` | attack_move / revival_move |
| 4 | `0x10f0758` | attack_move / revival_move |
| 5 | `0x10f0758` | attack_move / revival_move |
| 6 | `0x10f0758` | attack_move / revival_move |
| 7 | `0x10f076c` | attack_move / revival_move |
| 8 | `0x10f0778` | revival_move |
| 9 | `0x10f0784` | revival_move |
| 10 | `0x10f0790` | revival_move |
| 11 | `0x10f079c` | revival_move |
| 12 | `0x10f07a8` | revival_move |
| 13 | `0x10f07b4` | — |
| 14 | `0x10f0758` | attack_move / revival_move |
| 15 | `0x10f07c8` | — |
| 16 | `0x10f0758` | attack_move / revival_move |
| 17 | `0x10f07c0` | — |

## 派发器 `0x10f440c` — 状态 0..17，单位 `ems025_00`，有名字的状态 16/18

| state | handler | motion |
|---|---|---|
| 0 | `0x10f4474` | ems025_00FwMove / ems025_00ActionMove / ems025_00MoveMove |
| 1 | `0x10f4480` | ems025_00ActionMove / ems025_00MoveMove / ems025_00AttackMove |
| 2 | `0x10f448c` | ems025_00MoveMove / ems025_00AttackMove / ems025_00RevivalMove |
| 3 | `0x10f4498` | ems025_00AttackMove / ems025_00RevivalMove / ems025_00DemoMove |
| 4 | `0x10f4498` | ems025_00AttackMove / ems025_00RevivalMove / ems025_00DemoMove |
| 5 | `0x10f4498` | ems025_00AttackMove / ems025_00RevivalMove / ems025_00DemoMove |
| 6 | `0x10f4498` | ems025_00AttackMove / ems025_00RevivalMove / ems025_00DemoMove |
| 7 | `0x10f44ac` | ems025_00AttackMove / ems025_00RevivalMove / ems025_00DemoMove |
| 8 | `0x10f4498` | ems025_00AttackMove / ems025_00RevivalMove / ems025_00DemoMove |
| 9 | `0x10f4498` | ems025_00AttackMove / ems025_00RevivalMove / ems025_00DemoMove |
| 10 | `0x10f44b8` | ems025_00RevivalMove / ems025_00DemoMove |
| 11 | `0x10f44c4` | ems025_00RevivalMove / ems025_00DemoMove |
| 12 | `0x10f44d0` | ems025_00RevivalMove / ems025_00DemoMove |
| 13 | `0x10f44dc` | ems025_00DemoMove |
| 14 | `0x10f44e8` | — |
| 15 | `0x10f4498` | ems025_00AttackMove / ems025_00RevivalMove / ems025_00DemoMove |
| 16 | `0x10f4498` | ems025_00AttackMove / ems025_00RevivalMove / ems025_00DemoMove |
| 17 | `0x10f4510` | — |

## 派发器 `0x10fd5dc` — 状态 0..17，单位 `ems027_00`，有名字的状态 13/18

| state | handler | motion |
|---|---|---|
| 0 | `0x10fd644` | ems027_00FwMove / ems027_00MoveMove / ems027_00FlyMove |
| 1 | `0x10fd650` | ems027_00MoveMove / ems027_00FlyMove / ems027_00AttackMove |
| 2 | `0x10fd65c` | ems027_00MoveMove / ems027_00FlyMove / ems027_00AttackMove |
| 3 | `0x10fd668` | ems027_00FlyMove / ems027_00AttackMove |
| 4 | `0x10fd674` | ems027_00AttackMove |
| 5 | `0x10fd674` | ems027_00AttackMove |
| 6 | `0x10fd674` | ems027_00AttackMove |
| 7 | `0x10fd688` | ems027_00AttackMove |
| 8 | `0x10fd674` | ems027_00AttackMove |
| 9 | `0x10fd674` | ems027_00AttackMove |
| 10 | `0x10fd694` | — |
| 11 | `0x10fd6a0` | — |
| 12 | `0x10fd6ac` | — |
| 13 | `0x10fd674` | ems027_00AttackMove |
| 14 | `0x10fd6b8` | — |
| 15 | `0x10fd674` | ems027_00AttackMove |
| 16 | `0x10fd674` | ems027_00AttackMove |
| 17 | `0x10fd6dc` | — |

## 派发器 `0x1105b2c` — 状态 0..17，单位 `ems039_00`，有名字的状态 16/18

| state | handler | motion |
|---|---|---|
| 0 | `0x1105b94` | ems039_00_fw_move / ems039_00_zako_action_move / ems039_00_zako_move_move |
| 1 | `0x1105ba0` | ems039_00_zako_action_move / ems039_00_zako_move_move / ems039_00_revival_move |
| 2 | `0x1105be8` | ems039_00_zako_move_move / ems039_00_revival_move |
| 3 | `0x1105bf4` | ems039_00_revival_move |
| 4 | `0x1105c00` | ems039_00_revival_move |
| 5 | `0x1105c58` | — |
| 6 | `0x1105c58` | — |
| 7 | `0x1105bac` | ems039_00_zako_move_move / ems039_00_revival_move |
| 8 | `0x1105c00` | ems039_00_revival_move |
| 9 | `0x1105c00` | ems039_00_revival_move |
| 10 | `0x1105c14` | ems039_00_revival_move |
| 11 | `0x1105bb8` | ems039_00_zako_move_move / ems039_00_revival_move |
| 12 | `0x1105c20` | ems039_00_revival_move |
| 13 | `0x1105c00` | ems039_00_revival_move |
| 14 | `0x1105c00` | ems039_00_revival_move |
| 15 | `0x1105c00` | ems039_00_revival_move |
| 16 | `0x1105c00` | ems039_00_revival_move |
| 17 | `0x1105bdc` | ems039_00_zako_move_move / ems039_00_revival_move |

## 派发器 `0x1108edc` — 状态 0..17，单位 `ems040_00`，有名字的状态 13/18

| state | handler | motion |
|---|---|---|
| 0 | `0x1106bd8` | — |
| 1 | `0x1106e5c` | ems040_00_action_move |
| 2 | `0x1107374` | ems040_00_move_move |
| 3 | `0x1107570` | — |
| 4 | `0x1108f84` | ems040_00_revival_move |
| 5 | `0x1108f84` | ems040_00_revival_move |
| 6 | `0x1107f30` | ems040_00_moguri_move |
| 7 | `0x1108888` | — |
| 8 | `0x1108f84` | ems040_00_revival_move |
| 9 | `0x1108f84` | ems040_00_revival_move |
| 10 | `0x1108a44` | — |
| 11 | `0x1108fcc` | ems040_00_revival_move |
| 12 | `0x1109014` | ems040_00_revival_move |
| 13 | `0x1108f84` | ems040_00_revival_move |
| 14 | `0x1108f84` | ems040_00_revival_move |
| 15 | `0x1108f84` | ems040_00_revival_move |
| 16 | `0x1108f84` | ems040_00_revival_move |
| 17 | `0xaf594` | — |

## 派发器 `0x110c024` — 状态 0..17，单位 `ems042_00`，有名字的状态 18/18

| state | handler | motion |
|---|---|---|
| 0 | `0x110c08c` | ems042_00RevivalMove / ems042_00FlyMove |
| 1 | `0x110c098` | ems042_00RevivalMove / ems042_00FlyMove |
| 2 | `0x110c0a4` | ems042_00RevivalMove / ems042_00FlyMove |
| 3 | `0x110c0b0` | ems042_00RevivalMove / ems042_00FlyMove |
| 4 | `0x110c120` | ems042_00FlyMove |
| 5 | `0x110c120` | ems042_00FlyMove |
| 6 | `0x110c120` | ems042_00FlyMove |
| 7 | `0x110c0d4` | ems042_00RevivalMove / ems042_00FlyMove |
| 8 | `0x110c120` | ems042_00FlyMove |
| 9 | `0x110c120` | ems042_00FlyMove |
| 10 | `0x110c0e0` | ems042_00RevivalMove / ems042_00FlyMove |
| 11 | `0x110c0ec` | ems042_00RevivalMove / ems042_00FlyMove |
| 12 | `0x110c0f8` | ems042_00RevivalMove / ems042_00FlyMove |
| 13 | `0x110c134` | ems042_00FlyMove |
| 14 | `0x110c140` | ems042_00FlyMove |
| 15 | `0x110c120` | ems042_00FlyMove |
| 16 | `0x110c120` | ems042_00FlyMove |
| 17 | `0x110c114` | ems042_00FlyMove |

## 派发器 `0x1116e38` — 状态 0..17，单位 `ems045_00`，有名字的状态 15/18

| state | handler | motion |
|---|---|---|
| 0 | `0x1116ea0` | ems045_00FwMove / ems045_00ActionMove / ems045_00MoveMove |
| 1 | `0x1116eac` | ems045_00ActionMove / ems045_00MoveMove / ems045_00FlyMove |
| 2 | `0x1116eb8` | ems045_00MoveMove / ems045_00FlyMove / ems045_00MoguriMove |
| 3 | `0x1116ec4` | ems045_00FlyMove / ems045_00MoguriMove / ems045_00AttackMove |
| 4 | `0x1116ed0` | ems045_00MoguriMove / ems045_00AttackMove / ems045_00RevivalMove |
| 5 | `0x1116ed0` | ems045_00MoguriMove / ems045_00AttackMove / ems045_00RevivalMove |
| 6 | `0x1116ee4` | ems045_00MoguriMove / ems045_00AttackMove / ems045_00RevivalMove |
| 7 | `0x1116ef0` | ems045_00AttackMove / ems045_00RevivalMove |
| 8 | `0x1116ed0` | ems045_00MoguriMove / ems045_00AttackMove / ems045_00RevivalMove |
| 9 | `0x1116ed0` | ems045_00MoguriMove / ems045_00AttackMove / ems045_00RevivalMove |
| 10 | `0x1116efc` | ems045_00RevivalMove |
| 11 | `0x1116f08` | ems045_00RevivalMove |
| 12 | `0x1116f14` | ems045_00RevivalMove |
| 13 | `0x1116f20` | — |
| 14 | `0x1116f2c` | — |
| 15 | `0x1116ed0` | ems045_00MoguriMove / ems045_00AttackMove / ems045_00RevivalMove |
| 16 | `0x1116ed0` | ems045_00MoguriMove / ems045_00AttackMove / ems045_00RevivalMove |
| 17 | `0x1116f50` | — |

## 派发器 `0x111e744` — 状态 0..17，单位 `ems048_00`，有名字的状态 16/18

| state | handler | motion |
|---|---|---|
| 0 | `0x111e7ac` | ems048_00FwMove / ems048_00ActionMove / ems048_00MoveMove |
| 1 | `0x111e7b8` | ems048_00ActionMove / ems048_00MoveMove / ems048_00FlyMove |
| 2 | `0x111e7c4` | ems048_00MoveMove / ems048_00FlyMove / ems048_00DemoMove |
| 3 | `0x111e7d0` | ems048_00FlyMove / ems048_00DemoMove |
| 4 | `0x111e7dc` | ems048_00DemoMove |
| 5 | `0x111e7dc` | ems048_00DemoMove |
| 6 | `0x111e7dc` | ems048_00DemoMove |
| 7 | `0x111e7f0` | ems048_00DemoMove |
| 8 | `0x111e7dc` | ems048_00DemoMove |
| 9 | `0x111e7dc` | ems048_00DemoMove |
| 10 | `0x111e7fc` | ems048_00DemoMove |
| 11 | `0x111e808` | ems048_00DemoMove |
| 12 | `0x111e814` | ems048_00DemoMove |
| 13 | `0x111e820` | ems048_00DemoMove |
| 14 | `0x111e82c` | — |
| 15 | `0x111e7dc` | ems048_00DemoMove |
| 16 | `0x111e7dc` | ems048_00DemoMove |
| 17 | `0x111e838` | — |

## 派发器 `0x1120ee0` — 状态 0..17，单位 `ems100_00`，有名字的状态 3/18

| state | handler | motion |
|---|---|---|
| 0 | `0x1120e2c` | — |
| 1 | `0xca114` | — |
| 2 | `0xca114` | — |
| 3 | `0xca114` | — |
| 4 | `0xca114` | — |
| 5 | `0xca114` | — |
| 6 | `0xca114` | — |
| 7 | `0xca114` | — |
| 8 | `0xca114` | — |
| 9 | `0xca114` | — |
| 10 | `0x1120f94` | ems100_00DemoMove |
| 11 | `0x1120f68` | ems100_00DemoMove |
| 12 | `0xca114` | — |
| 13 | `0x1120fb8` | ems100_00DemoMove |
| 14 | `0xca114` | — |
| 15 | `0xca114` | — |
| 16 | `0xca114` | — |
| 17 | `0xaf594` | — |
