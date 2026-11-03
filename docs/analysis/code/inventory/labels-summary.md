# 子系统归属总览（自动生成，勿手改）

由 `node tools/mhgu/coverage/labels-summary.mjs` 从 `tiers-merged.csv` 与 `sources.json` 列出的证据表生成。
`直接证据` 指该函数自己有一行 conf=A 的依据；没有直接证据的计数来自传播或推断。

分母：5,228,277 条指令。

| 子系统 | 函数 | 指令 | 指令占比 | 直接证据 | 主要证据来源 |
|---|---:|---:|---:|---:|---|
| monster-em | 9,529 | 1,382,244 | 26.4% | 2,038（21%） | fingerprint 1839, vtable-fixed 360, class 122 |
| render-gfx | 5,789 | 1,039,332 | 19.9% | 2,109（36%） | vtable-unknown 1071, blocks 885, class2 285 |
| ui | 8,818 | 910,021 | 17.4% | 2,897（33%） | uifamily 1556, blocks 1336, vtable-unknown 1306 |
| online-nex | 6,645 | 558,095 | 10.7% | 2,164（33%） | vtable-rtti2 1595, vtable-ns 1305, vtable-unknown 522 |
| quest | 1,705 | 183,050 | 3.5% | 464（27%） | vtable-fixed 169, class2 167, class 166 |
| physics-math | 1,075 | 117,442 | 2.2% | 613（57%） | vtable-unknown 359, class 178, class2 167 |
| weapon-wp | 1,252 | 73,139 | 1.4% | 949（76%） | vtable-fixed 674, class2 485, class 387 |
| otomo-ot | 919 | 67,620 | 1.3% | 780（85%） | vtable-fixed 459, class2 328, class 235 |
| player-pl | 390 | 41,632 | 0.8% | 201（52%） | vtable-fixed 134, class2 54, class 39 |
| audio | 405 | 40,250 | 0.8% | 275（68%） | class2 161, vtable-fixed 155, class 82 |
| save-data | 240 | 35,400 | 0.7% | 62（26%） | vtable-fixed 21, xref 18, class 13 |
| item | 459 | 26,577 | 0.5% | 360（78%） | vtable-fixed 178, class 128, class2 115 |
| kernel-os | 221 | 15,593 | 0.3% | 129（58%） | vtable-unknown 83, vtable-rtti2 78, vtable-fixed 38 |
| filesystem | 22 | 1,302 | 0.0% | 19（86%） | vtable-fixed 11, class 7, xref 2 |

## 每个子系统的一个直接证据样例

| 子系统 | 函数 | 证据 |
|---|---|---|
| monster-em | `0xcb0` | ctor: rAngleLimitData |
| render-gfx | `0x16984` | rStageCameraData registrar 0x17b5c vtable 0x1730b6c slot 2 (class-record vtable written by str at 0x17e20) [classprefix-map rStageCamera -> render-gfx, basis: r |
| ui | `0x8914` | cUIOResultClearing::cRewardListDispParam registrar 0x8674 vtable 0x172fcc4 slot 2 (class-record vtable written by str at 0x9308) [classprefix-map cUI -> ui, bas |
| online-nex | `0x1168` | string "_ZN2nn3ldn16GetNetworkConfigEPNS0_13NetworkConfigE" |
| quest | `0x5bd8` | aQuest class consensus: 3/3 of the class's evidence-bearing members are quest |
| physics-math | `0x360` | 3 of 4 referenced strings are collision/math parameter names: mPointPos \| mRadius \| mMinRadius |
| weapon-wp | `0xe0e8` | rWeapon14MsgData class-record slot [classprefix-map rWeapon -> weapon-wp, basis: rWeapon00BaseData; rWeaponMsgData; rWeaponCreateData] |
| otomo-ot | `0x9cb8` | nPastMonNyan::cMonNyanAdventEnemy registrar 0xb450 vtable 0x172ff14 slot 2 (class-record vtable written by str at 0xbf74) [relabelled monster-em -> otomo-ot by  |
| player-pl | `0x9f74` | nPastPlayer::cPlayerParam registrar 0xb450 vtable 0x172feec slot 2 (class-record vtable written by str at 0xc0fc) |
| audio | `0x34f4` | string "_ZN2nn5audio17AcquireMemoryPoolEPNS0_19AudioRendererConfigEPNS0_14Memo" |
| save-data | `0x9eac` | nPastMonNyan::cPastSaveDataMember registrar 0xb450 vtable 0x172ff78 slot 2 (class-record vtable written by str at 0xc08c) |
| item | `0x9d1c` | nPastMonNyan::cPastMonNyanAdventItemData registrar 0xb450 vtable 0x172ff28 slot 2 (class-record vtable written by str at 0xbfac) |
| kernel-os | `0x690` | MtArray registrar 0x7cb8c8 vtable 0x1786fd0 slot 0 (instance vtable installed by create 0x7ca7bc @ install 0x7cbc78) [relabelled render-gfx -> kernel-os by clas |
| filesystem | `0x837f64` | MtFileStream registrar 0x8394d0 vtable 0x1787f34 slot 2 (class-record vtable written by str at 0x839d9c) [relabelled render-gfx -> filesystem by class name] |
