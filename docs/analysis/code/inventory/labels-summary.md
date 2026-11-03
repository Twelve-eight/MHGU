# 子系统归属总览（自动生成，勿手改）

由 `node tools/mhgu/coverage/labels-summary.mjs` **直接读 `function-labels.tsv`** 汇总，不再自己重跑合并逻辑——
所以本页的合计与那份逐函数答案必然相等（重写前两套实现差 3 个函数）。
`直接证据` 指该行的 provenance 是 `evidence:`（自己有一行可引用的 A 级依据）；其余来自传播、推断或切片裁定。

分母：5,228,277 条指令；已归属函数 **40,374** 个。

| 子系统 | 函数 | 指令 | 指令占比 | 直接证据 | 主要证据来源 |
|---|---:|---:|---:|---:|---|
| monster-em | 9,769 | 1,303,148 | 24.9% | 2,038（21%） | fingerprint 1513, vtable-fixed 357, class 49 |
| render-gfx | 6,821 | 1,215,787 | 23.3% | 2,109（31%） | vtable-unknown 1043, blocks 586, xref 129 |
| ui | 9,245 | 987,436 | 18.9% | 2,898（31%） | vtable-unknown 1306, blocks 736, vtable-fixed 390 |
| online-nex | 7,058 | 556,701 | 10.6% | 2,164（31%） | vtable-ns 1272, vtable-rtti2 402, xref 335 |
| quest | 2,062 | 206,509 | 3.9% | 464（23%） | vtable-fixed 152, vtable-unknown 133, xref 70 |
| physics-math | 1,094 | 111,219 | 2.1% | 613（56%） | vtable-unknown 357, vtable-fixed 103, prefix 57 |
| weapon-wp | 1,388 | 83,087 | 1.6% | 949（68%） | vtable-fixed 673, prefix 124, vtable-unknown 63 |
| otomo-ot | 1,071 | 78,608 | 1.5% | 780（73%） | vtable-fixed 454, vtable-unknown 169, prefix 65 |
| audio | 434 | 41,153 | 0.8% | 275（63%） | vtable-fixed 154, class2 78, prefix 27 |
| player-pl | 412 | 41,111 | 0.8% | 201（49%） | vtable-fixed 134, prefix 26, class2 20 |
| save-data | 227 | 30,643 | 0.6% | 62（27%） | vtable-fixed 21, xref 18, vtable-unknown 13 |
| item | 509 | 26,752 | 0.5% | 360（71%） | vtable-fixed 178, vtable-unknown 75, prefix 30 |
| kernel-os | 243 | 16,093 | 0.3% | 129（53%） | vtable-rtti2 78, vtable-fixed 37, xref 9 |
| filesystem | 41 | 5,887 | 0.1% | 19（46%） | vtable-fixed 11, class 6, xref 2 |

## 每个子系统的一个直接证据样例

| 子系统 | 函数 | 证据 |
|---|---|---|
| monster-em | `0x459e0` | cEmDouMouKa_PartsAuraData_Element registrar 0x479a0 vtable 0x1731b20 slot 2 (class-record vtable written by str at 0x48308) |
| render-gfx | `0x16984` | rStageCameraData registrar 0x17b5c vtable 0x1730b6c slot 2 (class-record vtable written by str at 0x17e20) [classprefix-map rStageCamera -> render-gfx, basis: r |
| ui | `0x8914` | cUIOResultClearing::cRewardListDispParam registrar 0x8674 vtable 0x172fcc4 slot 2 (class-record vtable written by str at 0x9308) [classprefix-map cUI -> ui, bas |
| online-nex | `0x17c540` | 4 of 4 referenced strings are RendezVous/NEX/PIA symbols and net_* member paths: N2nn3pia5local23LocalNetworkDescriptionE \| N2nn3pia5local14LdnSessionInfoE \|  |
| quest | `0x2bd0c` | rPastQuestGroup registrar 0x2bc10 vtable 0x1730f80 slot 2 (class-record vtable written by str at 0x2c13c) |
| physics-math | `0x360` | 3 of 4 referenced strings are collision/math parameter names: mPointPos \| mRadius \| mMinRadius |
| weapon-wp | `0xd9b94` | cBowgunShellData registrar 0xd9de8 vtable 0x1736304 slot 2 (class-record vtable written by str at 0xda014) [classprefix-map cBowgun -> weapon-wp, basis: cBowgun |
| otomo-ot | `0x9cb8` | nPastMonNyan::cMonNyanAdventEnemy registrar 0xb450 vtable 0x172ff14 slot 2 (class-record vtable written by str at 0xbf74) [relabelled monster-em -> otomo-ot by  |
| audio | `0x4d3c2c` | cFestaSoundEmitter registrar 0x4d54a0 vtable 0x17694c4 slot 2 (class-record vtable written by str at 0x4d5714) [relabelled monster-em -> audio by class name] |
| player-pl | `0x9f74` | nPastPlayer::cPlayerParam registrar 0xb450 vtable 0x172feec slot 2 (class-record vtable written by str at 0xc0fc) |
| save-data | `0x9eac` | nPastMonNyan::cPastSaveDataMember registrar 0xb450 vtable 0x172ff78 slot 2 (class-record vtable written by str at 0xc08c) |
| item | `0x9d1c` | nPastMonNyan::cPastMonNyanAdventItemData registrar 0xb450 vtable 0x172ff28 slot 2 (class-record vtable written by str at 0xbfac) |
| kernel-os | `0x690` | MtArray registrar 0x7cb8c8 vtable 0x1786fd0 slot 0 (instance vtable installed by create 0x7ca7bc @ install 0x7cbc78) [relabelled render-gfx -> kernel-os by clas |
| filesystem | `0x837f64` | MtFileStream registrar 0x8394d0 vtable 0x1787f34 slot 2 (class-record vtable written by str at 0x839d9c) [relabelled render-gfx -> filesystem by class name] |
