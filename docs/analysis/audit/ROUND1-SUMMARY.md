# MHGU 文档补审总账（2026-11-03）

分母：`docs/analysis/audit/MANIFEST.tsv` 的 212 篇；已有裁决 **212** 篇，未覆盖 **0** 篇。

| 切片 | OK | WRONG | UNVERIFIABLE | STALE | MISSING |
|---|---:|---:|---:|---:|---:|
| EXTERNAL | 28 | 7 | 1 | 0 | 0 |
| MECHANICS | 30 | 19 | 7 | 5 | 0 |
| REFERENCE-DATA | 61 | 10 | 1 | 7 | 3 |
| REST | 93 | 21 | 9 | 20 | 0 |
| WIKI | 46 | 2 | 0 | 0 | 0 |
| analysis-code-half1 | 6 | 2 | 0 | 11 | 6 |
| analysis-code-half2 | 28 | 13 | 3 | 0 | 1 |
| analysis-coverage-new | 21 | 0 | 2 | 0 | 0 |
| **合计（行）** | 313 | 74 | 23 | 43 | 10 |

## 未覆盖的文档

（无）

## 说明

- 行级裁决可能多于文档数（一个文档多个条目）；上面的"已有裁决"按文档计。
- 每个非 OK 裁决在对应切片 TSV 里带命令证据；本表只做汇总，不替代证据。
- **43 条 STALE 已于 2026-11-04 全部关闭**：逐条处置见 `STALE-FIXES.tsv`（其中 5 条实测后发现文档已先行修正）。STALE 列是 round-1 的历史记录，不是待办。
- **WRONG 74 行，74 行有处置记录，0 行没有**（处置表：CODEDOCS-FIXES.tsv、MECHANICS-FIXES.tsv、REST-FIXES.tsv）。
- **STALE 43 行，43 行有处置记录，0 行没有**（处置表：STALE-FIXES.tsv）。
- **MISSING 10 行，10 行有处置记录，0 行没有**（处置表：MISSING-FIXES.tsv）。
- **UNVERIFIABLE 23 行**：按定义不作处置（静态不可核验，例如依赖外部页面或已删除的会话工件），逐行证据仍在对应切片 TSV 里。
