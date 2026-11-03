# 覆盖度计量器（2026-11-03 起可复算）

此前 `code-metrics.md` 的 72.8% / 52.2% 等数字来自一次性脚本与 `.tmp` 中间表，重跑不出来。现在整条链路在仓库内：

```
node tools/mhgu/coverage/recompute.mjs            # functions.csv.gz → 字符串种子 → 调用图传播 → 地址预测 → 分层
node tools/mhgu/coverage/merge.mjs                # 把 inventory/attr-*.tsv 当额外种子重跑，报每次的增量
node tools/mhgu/coverage/report.mjs [--source f]  # 统一计量（分母 23,885 函数 / 5,228,277 指令）
node tools/mhgu/coverage/cluster.mjs              # 调用图社区（当前退化为 1 个巨块，见下）
```

- 口径：**tier A = 地址预测与传播标签一致**，只有 A 计入"已解释"；tier B 是"有标签、未验证"。B 一律不计入。
- 种子文件契约：`start<TAB>label<TAB>conf<TAB>evidence`；`conf=A` 才算种子；`unknown`/`unmatched` 被加载器拒收并计数并按文件报告。
- 每次运行 `merge.mjs` 会打印每个种子文件的 accept/reject 数——加载器坏掉时数字会说话，而不是静默中性。

## 当前进度

比例以**重切后的真实函数表**为分母（见 `docs/analysis/code/inventory/RETILE.md`：旧表 23,885 是区域平铺，真实函数 52,692）。

| 阶段 | tier A 指令 | tier A 函数 | tier B（未验证） |
|---|---:|---:|---:|
| 旧表（平铺，23,885）基线 | 52.3% | 38.5% | 46.8% |
| 旧表 + 三份证据 | 62.1% | 46.5% | 37.8% |
| **重切后（52,692）基线** | **45.6%** | 35.8% | 60.0% |
| **重切后 + 三份证据** | **49.1%** | 42.0% | 48.8% |

重切把被合并的函数拆开后，同一份证据覆盖的比例下降——这是分母修正，不是退步。旧表的 62.1% 与重切后的 49.1% 不可直接比较。

## 必须带着读的前提：按标签的精度不均匀

`code-metrics.md` 末尾记录了对 Tier A `otomo-ot` 的 20 行抽样：**20 行里只有 1 行真是随从猫**，其余是 UI/save-data/未分类函数的传播误标。也就是说 "Tier A 精度 94.7%" 不适用于 `otomo-ot` 这一类。

因此上表的 62.1% 是**按同一口径算出的机器结果，不等于同比例的正确率**。要给出可信的"已解释 90%"，还需要：

1. 每个标签抽 20 行 A，逐行判定（SAMPLE 表：`docs/analysis/code/coverage/samples-<label>.tsv`）；
2. 用抽样精度给每个标签加权，得到**加权已解释率**；
3. 精度低于阈值的标签整体降级为 B，不计入。

在这三步做完之前，报告里只能说"按双预测一致口径，当前 62.1%"，不能说"已解释 62.1%"。
