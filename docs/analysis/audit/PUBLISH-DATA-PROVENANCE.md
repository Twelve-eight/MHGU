# docs/data/ — provenance and redistribution audit

Audit date: 2026-11-04. Scope: every regular file under `docs/data/` (43 files), plus the git
tracking/ignore state of each. Method: read `docs/data/README.md` and `docs/data/json/README.md`
first, then the generator scripts named in `tools/mhgu/README.md`, then verified each file's shape
(column names, row count) against the claim, and each file's git state with `git ls-files` /
`git check-ignore`.

**Risk legend used in the tables**

| label | meaning |
|---|---|
| `none` | our own text or our own analysis; no third-party expression inside |
| `attribute` | factual extraction (numbers, ids, addresses, short engine identifiers). Publishing is a policy decision; if published it needs an explicit "game-data-derived, Capcom trademark" notice plus upstream credit where applicable |
| `do-not-publish` | verbatim third-party expression — localized game strings, item/quest/skill descriptions, or third-party SDK symbol tables. This is what the project's own rule ("only our own work goes public") excludes |

---

## FACTS

### F1 — Inventory (all 43 files, with on-disk size)

```
$ find docs/data -type f -printf "%s\n" | awk '{s+=$1} END{print s" B = "s/1048576" MiB"}'
57679294 B = 55.0073 MiB

$ git ls-files -s docs/data | awk '{print $4}' | while read f; do stat -c%s "$f"; done | awk '{s+=$1} END{print s" B ... "NR" files"}'
1625749 B = 1.55044 MiB across 11 files

$ find docs/data -type f | while read f; do git ls-files --error-unmatch "$f" >/dev/null 2>&1 || stat -c%s "$f"; done | awk '{s+=$1} END{print s" B ... "NR" files"}'
56053545 B = 53.4568 MiB across 32 files
```

So: **1.55 MiB in 11 tracked files, 53.46 MiB in 32 present-but-ignored files.** 97.2 % of the
directory's bytes are game data or community-scraped data that is already excluded from git.

Three directories exist but are empty (`docs/data/weapons/`, `docs/data/armor/`,
`docs/data/viewer/` — `find ... -type f | wc -l` = 0 each). `docs/data/README.md` lists `weapons/`
and `armor/` as if they held per-weapon-type files; they do not, and git cannot track empty
directories, so a clone gets neither the directories nor the files.

### F2 — What the repository already states about provenance

`docs/data/README.md:3-4` (agroff / Kiranico):

> 来自开源项目 `agroff/mhgu-quest-list`（其 `scraper.js` 从 Kiranico 爬取 MHGU 全量数据成 JSON）。
> **许可**：上游为社区爬虫整理，属卡普空游戏数据的衍生汇编；仓库自用/参考可，正式分发需用户自行获取。

[translation: "from the open-source project agroff/mhgu-quest-list (its scraper.js scrapes all MHGU
data from Kiranico into JSON). **License**: upstream is a community scraper compilation, i.e. a
derivative compilation of Capcom game data; internal/reference use is fine, formal distribution
requires users to obtain it themselves."]

`docs/data/README.md:26` (the database):

> 来源：`gatheringhallstudios/MHGenDatabase` release `mhgu_database_v2.4.0.apk` 内 `assets/databases/mhgu.db`。

`docs/data/README.md:29`:

> 已导出 21 表为 `json/<table>.json`（21 个文件共 36,466,585 B ≈ 34.8 MiB；另有 6 个手工映射 JSON 不在表导出内）

`docs/data/json/README.md:3`:

> 由 `docs/data/mhgu.db`（MHGenDatabase）导出的 21 表 + 手工对拍的映射表。

`docs/data/json/README.md:12` (where the monster names in the mapping file come from):

> 来历：exe `0x1597ea4` 的 137 对 `{emid, slot}` + `resident_chS.arc` 名字表逐条对拍。

`tools/mhgu/README.md:4`:

> **输入不在 repo 内**（体积/版权原因），需自行准备

[translation: "the inputs are not in the repo (size / copyright reasons), prepare them yourself."]

`README.md:8` (root, the project's public claim):

> **No game code, keys, game files, or save files are in this repository.**

`README.md:21-23` (root):

> - Documentation under `docs/`: CC BY 4.0 (`docs/LICENSE`).
> - Monster Hunter is a trademark of Capcom. Not affiliated with Capcom or Nintendo. Game data
>   facts (addresses, field layouts) are described for interoperability.

### F3 — The database (`docs/data/mhgu.db`, 18,333,696 B = 17.5 MiB, 39 tables)

```
$ bun -e 'const {Database}=require("bun:sqlite"); const d=new Database("docs/data/mhgu.db",{readonly:true});
  for(const t of d.query("select name from sqlite_master where type=\"table\" order by name").all())
    console.log(d.query(`select count(*) c from "${t.name}"`).get().c, t.name)'
      0 android_metadata
   5637 armor
   1242 armor_families
      0 asb_sets
      0 charms
    183 combining
  73187 components
    242 decorations
      0 felyne_skills
      0 food_combos
  15414 gathering
    278 horn_melodies
   8044 hunting_rewards
      0 ingredients
   2675 item_to_material
     93 item_to_quest
  14510 item_to_skill_tree
  21153 items
     31 locations
      6 meow_locations
   1168 meow_rewards
    233 monster_ailment
    893 monster_damage
    303 monster_habitat
    728 monster_status
   2305 monster_to_quest
    108 monster_weakness
    129 monsters
   1001 palico_armor
    495 palico_weapons
  37370 quest_rewards
   1355 quests
    205 skill_trees
    326 skills
     27 sqlite_sequence
  10877 weapons
      0 wishlist
      0 wishlist_component
      0 wishlist_data
```

Only **21 of the 37 content tables** are exported to `json/`. Ten non-empty tables have no JSON
export at all: `armor_families` (1,242), `components` (73,187), `hunting_rewards` (8,044),
`item_to_material` (2,675), `item_to_quest` (93), `item_to_skill_tree` (14,510),
`monster_ailment` (233), `monster_habitat` (303), `meow_locations` (6), `meow_rewards` (1,168).
Consequence: `docs/data/json/` **cannot** be used
to rebuild `mhgu.db`; the authoritative base exists only as the ignored 17.5 MiB binary.

No exporter from `mhgu.db` to `json/` exists in the repo:
`grep -rln "sqlite_master" --include=*.mjs --include=*.py .` → no output; the only scripts that open
the database are consumers (`tools/mhgu/dttune.mjs`, `dttune-all.mjs`, `export-item-table.mjs`,
`export-dlc-table.mjs`, `quest-ext.mjs`, `tools/audit/check.mjs`, `tools/wiki-gen/*.py`). The 21 exports are one-off
artifacts; nothing in the tree regenerates them.

### F4 — Git state

```
$ git ls-files docs/data
docs/data/README.md
docs/data/class-inventory.tsv
docs/data/functions-retile.csv.gz
docs/data/functions.csv.gz
docs/data/json/README.md
docs/data/json/monster-slot-map-137.json
docs/data/json/monster-slot-map.json
docs/data/member-offsets.tsv
docs/data/resource-registry.tsv
docs/data/romfs-tables.md
docs/data/tierb-labels.csv
```

`.gitignore` mechanics worth knowing (line numbers from `.gitignore`):

| line | rule | effect on docs/data |
|---|---|---|
| 11 | `docs/data/json/*` | ignores the whole export folder |
| 28-49 | one explicit line per export | same, pinned individually (so the wildcard negation cannot be added in bulk) |
| 51-57 | `mhgu.db`, `quests.json`, `skills.json`, `skillMeta.json`, `decorations.json`, `hammer.json`, `weapons.json` | ignores the database and the 6 agroff files |
| 58-60 | `!docs/data/json/README.md`, `!.../monster-slot-map.json`, `!.../monster-slot-map-137.json` | the only three exceptions inside `json/` |
| 66 | `.tmp/` | the whole scratch tree (analysis evidence files cited by tracked tables live here) |
| 69-70 | `MHGU_item(uni).txt`, `MHGU_DLC.txt` | the two editor runtime tables generated from the db |

`git check-ignore` per file confirms every ignored file resolves to one of those rules; the three
mapping JSONs `monster-dttune-index.json`, `monster-names-chs.json`, `motion-values.json` are caught
**only** by the wildcard on line 11, so they are neither tracked nor individually protected.

History contains no private blob:

```
$ for p in docs/data/mhgu.db docs/data/json/items.json docs/data/quests.json main.140.flat.bin; do git log --oneline -- "$p" | wc -l; done
0
0
0
0
$ git log --oneline -- docs/data/functions.csv.gz | wc -l
1        # ac1cf8d 2026-10-23
```

Largest blobs in history are our own TSVs (5.4 MB `docs/analysis/code/inventory/function-labels.tsv`,
2.7 MB `function-forms.tsv`) plus a vendored npm sourcemap (5.6 MB
`tools/mhgu/vendor/node_modules/ogg-opus-decoder/...map`). No game image, no save, no database ever
entered the object graph.

### F5 — Acceptance table

"Naming" column abbreviations used in evidence cells: **DB** = `assets/databases/mhgu.db` from
`gatheringhallstudios/MHGenDatabase` v2.4.0 APK (`docs/data/README.md:26`); **AG** = `agroff/mhgu-quest-list`
Kiranico scrape (`docs/data/README.md:3`); **IMG** = `main.140.flat.bin`, the 25,472,632 B decrypted
image at the repo root (flat = vaddr + 0x100); **ROMFS** = parsed game archives.

| path | rows / size | provenance (evidence) | tracked | risk | what would have to change |
|---|---|---|---|---|---|
| `docs/data/README.md` | 14,255 B | our own doc; declares both upstreams and the "formal distribution requires users to obtain it themselves" position (lines 3-4) | **yes** | none | nothing |
| `docs/data/json/README.md` | 3,117 B | our own doc; states the 21 exports are db-derived and that slot-map names come from `resident_chS.arc` (lines 3, 12) | **yes** | none (contains 2 monster names as examples) | drop the monster-name examples if the name rule tightens |
| `docs/data/romfs-tables.md` | 17,946 B | our own format analysis; header self-declares "只描述容器格式与字段语义，不含游戏数据表（每表示例 ≤ 3 值）" | **yes** | none | nothing |
| `docs/data/tierb-labels.csv` | 378 rows + header, 42,137 B | our own labels; `src` column cites `.tmp/reports-mhgu/tierB-slice-*.md`, generated by `tools/mhgu/tierb-merge.py` | **yes** | none (values are vaddrs + our prose) | the cited evidence files live in untracked `.tmp/` — publish them or drop the `src` column |
| `docs/data/class-inventory.tsv` | 3,201 rows + header, 150,183 B | IMG: `mon/mon-final.py` — every `bl 0x7AEDCC` site, `r3` = class size, pc-relative class name from `.rodata` (columns `family,name,size,registrar_fn,registrar_site,suspect`) | **yes** | attribute (3,201 engine type names) | keep, or move the `name` column to `*-private` if extracted identifiers are treated as asset text |
| `docs/data/member-offsets.tsv` | 110 rows + header, 4,222 B | IMG: `mon/mon-offsets.py` — inline property builders; `member_name` is a `.rodata` string (`mTimer`, `mUniqueId`, `mPriority`), `offset`/`type` are code immediates | **yes** | attribute (110 engine member names) | same as above |
| `docs/data/resource-registry.tsv` | 448 rows, 14,903 B | IMG: `decode-registry.py` — 448 × 8 B records at `0x15dca00..0x15dd800`; names are printable runs from the image matched by raw CRC32. Resolved rows (`$3` not starting with `?`) = **176**, unresolved 272 | **yes** | attribute (176 verbatim engine resource names, e.g. `rHitSize`, `rPlayerManyAttacks`) | publish only `offset` + crc32 (drop the resolved names), or relocate the resolved block to `*-private` |
| `docs/data/functions.csv.gz` | 23,885 rows + header, 479,325 B (1,793,666 B uncompressed) | IMG: `func-inventory5.mjs` (`tools/mhgu/README.md:21`); columns `start,end,insns,callers,callees,strings` | **yes** | **do-not-publish as-is** — the `strings` column is text lifted from the binary and includes third-party SDK symbols | strip the `strings` column, or filter SDK-prefixed entries before publishing |
| `docs/data/functions-retile.csv.gz` | 52,692 rows + header, 852,259 B (4,171,818 B uncompressed) | IMG: `tools/mhgu/coverage/retile.mjs`; its own header comment says the string column is "carried over from the old table by containment, never re-extracted, because the old string column is known to contain ~754 false positives" | **yes** | **do-not-publish as-is** (same SDK strings) | same as `functions.csv.gz` |
| `docs/data/mhgu.db` | 39 tables, 18,333,696 B | DB, per `docs/data/README.md:26` | no (`gitignore:51`) | **do-not-publish** (whole-game dump: 38 tables, 5 languages) | keep ignored; never include in a release zip; document "obtain the upstream db yourself" |
| `docs/data/json/items.json` | 21,153 rows, 16,710,025 B | DB export; columns `name` (21,057 distinct), `description` (7,626 EN) + DE/FR/ES/IT, `icon_name`, stats | no (`gitignore:35`) | **do-not-publish** (largest block of localized text in the repo: 16.7 MB) | keep ignored; the docs must not embed the export |
| `docs/data/json/quests.json` | 1,355 rows, 2,765,861 B | DB export; `name` 1,243 distinct, `goal` 498, `flavor` 1,291 distinct ×5 languages (max string 289 chars) | no (`gitignore:46`) | **do-not-publish** (quest names, objectives, flavor text) | keep ignored |
| `docs/data/json/monsters.json` | 129 rows, 37,258 B | DB export; `name`/`name_de`/`name_fr`/`name_es`/`name_it`/`name_ja` all 127-129 distinct, `base_hp` | no (`gitignore:42`) | **do-not-publish** (localized monster names) | keep ignored |
| `docs/data/json/skills.json` | 326 rows, 223,477 B | DB export; `name` + `description` in 5 languages, 326/326 populated | no (`gitignore:48`) | **do-not-publish** (skill descriptions are game text) | keep ignored |
| `docs/data/json/skill_trees.json` | 205 rows, 31,927 B | DB export; `name` ×5 languages, 205/205 | no (`gitignore:47`) | **do-not-publish** | keep ignored |
| `docs/data/json/horn_melodies.json` | 278 rows, 206,721 B | DB export; `name` and `effect1`/`effect2` ×5 languages (49 distinct each) | no (`gitignore:34`) | **do-not-publish** | keep ignored |
| `docs/data/json/locations.json` | 31 rows, 5,984 B | DB export; `name` ×5 languages, 31/31 | no (`gitignore:36`) | **do-not-publish** (area names) | keep ignored |
| `docs/data/json/armor.json` | 5,637 rows, 1,293,410 B | DB export; **no name column** — only `_id,slot,defense,…,family`; one text column `slot` with 5 labels | no (`gitignore:28`) | attribute (numeric + 5 slot labels) | only a "Capcom game data" notice is needed if published |
| `docs/data/json/weapons.json` | 10,877 rows, 7,178,788 B | DB export; no name column; `wtype` 14 labels, `sharpness` is a digit string (`"9.4.2.0.0.0.0 9.4.4.0.0.0.0 …"`), `affinity` numeric-as-string | no (`gitignore:49`) | attribute (numeric) | same |
| `docs/data/json/palico_armor.json` | 1,001 rows, 142,495 B | DB export; no text columns at all | no (`gitignore:43`) | attribute (numeric) | same |
| `docs/data/json/palico_weapons.json` | 495 rows, 129,344 B | DB export; no text columns | no (`gitignore:44`) | attribute (numeric) | same |
| `docs/data/json/monster_damage.json` | 893 rows, 163,748 B | DB export; numeric hitzones + `body_part` 245 labels (`Head`, `Tail Tip`) | no (`gitignore:38`) | attribute | same |
| `docs/data/json/monster_weakness.json` | 108 rows, 29,125 B | DB export; numeric + `state` 15 labels | no (`gitignore:41`) | attribute | same |
| `docs/data/json/monster_status.json` | 728 rows, 99,087 B | DB export; numeric + `status` 8 labels | no (`gitignore:39`) | attribute | same |
| `docs/data/json/monster_to_quest.json` | 2,305 rows, 206,415 B | DB export; ids + `unstable`/`hyper` flags | no (`gitignore:40`) | attribute | same |
| `docs/data/json/quest_rewards.json` | 37,370 rows, 4,339,488 B | DB export; ids/percent + `reward_slot` 41 labels (`A`, `Sub`, `Hunt 20`) | no (`gitignore:45`) | attribute | same |
| `docs/data/json/gathering.json` | 15,414 rows, 2,867,774 B | DB export; ids + `area`/`site`/`rank` labels (`Area 1`, `Bug`, `Fishing (Goldenfish Bait)`, `G`/`HR`/`LR`) | no (`gitignore:33`) | attribute | same |
| `docs/data/json/combining.json` | 183 rows, 26,697 B | DB export; numeric only | no (`gitignore:29`) | attribute | same |
| `docs/data/json/decorations.json` | 242 rows, 8,957 B | DB export; `_id,num_slots` only | no (`gitignore:30`) | attribute | same |
| `docs/data/json/felyne_skills.json` | 0 rows, 2 B (`[]`) | DB empty table | no (`gitignore:31`) | none | nothing (could be dropped) |
| `docs/data/json/food_combos.json` | 0 rows, 2 B (`[]`) | DB empty table | no (`gitignore:32`) | none | nothing (could be dropped) |
| `docs/data/quests.json` | 944 rows, 265,123 B | **AG**: record shape `{title,location,monster,questType,keyType,huntType,rank}` = the agroff scraper's Kiranico fields; `docs/data/README.md:3` | no (`gitignore:52`) | **do-not-publish** (Kiranico-scraped names and classification) | keep ignored |
| `docs/data/skills.json` | 204 trees / 326 skills, 78,960 B | **AG**: keyed `1..204`, `{id,name,category,rating,skills:[{name,description,points}]}` — Kiranico skill-tree page shape; 326 inner skills counted | no (`gitignore:53`) | **do-not-publish** (skill descriptions) | keep ignored |
| `docs/data/skillMeta.json` | 202 keys, 18,804 B | **AG**: `{name,category,rating}` per skill key | no (`gitignore:54`) | **do-not-publish** (202 names; categories/ratings are Kiranico's) | keep ignored |
| `docs/data/decorations.json` | 242 rows, 49,696 B | **AG**: `{_id,num_slots,name,description,skills:{skillId:points}}`; descriptions like "A Decoration that boosts Poison skills." | no (`gitignore:55`) | **do-not-publish** | keep ignored |
| `docs/data/hammer.json` | 885 rows, 711,438 B | **AG**: `{type,name:"Petrified Hammer LV1",damage,affinity,slots,rare,sharpness:{normal,sharper,sharpest},defense,elemental}` — the `LV<n>` naming is the agroff dialect the README documents (line 21: `LV<n>`→`<n>` conversion) | no (`gitignore:56`) | **do-not-publish** (885 weapon names) | keep ignored |
| `docs/data/weapons.json` | 14 names, 289 B | **AG**: `{"types":["Bow",…]}` — the same 14 labels as the db `wtype` | no (`gitignore:57`) | none (14 generic English words) | nothing |
| `docs/data/json/monster-slot-map.json` | 137 rows, 26,505 B | IMG + ROMFS: `{slot,emid,cn,cn_src,en,kind,ro}`; `emid@slot` read from exe `0x1597EA4`; `cn_src` spells out the source of each name, e.g. `chS/arc/resident_chS.arc :: monsterName_chS #0 (Lioleia)`; 137/137 `cn` non-empty; kinds `big:94, small:43` | **yes** | **do-not-publish as-is** — 137 Chinese strings copied verbatim from Capcom's `chS` message archives, 4 of them from `chS/table/itemData_chS.gmd` | drop `cn` and `cn_src` (keep `slot/emid/en/kind/ro`), or replace `cn` with our own translations marked as ours; also remove the name examples from `json/README.md` |
| `docs/data/json/monster-slot-map-137.json` | 137 rows, 20,897 B | same, minus `kind`/`ro`; produced by `mon/em-units.py` (`tools/mhgu/README.md:31`) | **yes** | **do-not-publish as-is** | same as above |
| `docs/data/json/monster-names-chs.json` | 137 rows, 20,073 B | ROMFS: `{slot,emid,en,chs,source}`; `source` = `resident_chS.arc::GUI/06_msg/monsterName_chS #0 (Lioleia)`; 125 of 137 `chs` values are byte-identical to the tracked slot map, 12 differ (not recorded why) | no (`gitignore:11` wildcard only) | **do-not-publish** | keep ignored; add an explicit ignore line so it cannot slip in via `git add docs/data/json` |
| `docs/data/json/monster-name-map.json` | 129 keys, 12,660 B | DB: `{id,ja,base_hp,sort}`; `name_ja` is 129/129 filled in the db (`json/README.md:20`) | no (`gitignore:37`) | **do-not-publish** (129 Japanese names) | keep ignored |
| `docs/data/json/monster-dttune-index.json` | 137 rows, 47,230 B | mixed: `arc/emid/slot` + `offsets{hp,meat,status}` (IMG layout), `hp`/`meat_rows`/`status_records`/`db_match` (DB), `chs` (ROMFS, 137/137 present) | no (`gitignore:11` wildcard only) | **do-not-publish** (`chs` strings + db-derived values) | drop `chs`; add explicit ignore line |
| `docs/data/json/motion-values.json` | 14 records / 870 moves, 48,991 B | ROMFS: `tools/mhgu/hitdata.mjs json` decodes hit data (`docs/wiki/motion-values.md:5`); `{weapon,zh,count,records:[{i,mv,hitType,hitsize}]}` | no (`gitignore:11` wildcard only) | attribute (870 numeric motion values; no game text) | add explicit ignore line if it must stay out; publishable as a derived fact table with a Capcom notice |

### F6 — How the risk classes were measured, not assumed

* Localized-text exposure is counted, not estimated: `items.json` has 21,057 distinct `name` values
  and 7,626 distinct EN `description` values, with the five language columns populated for
  20,997-21,053 items — ~16.7 MB of game text. `quests.json` has 1,291 distinct EN `flavor` values.
* SDK symbols inside the tracked CSVs:

  ```
  $ bun -e '... zlib.gunzipSync ... lines.filter(l=>/Nex|nn::|Nintendo/.test(l)) ...'
  docs/data/functions.csv.gz          rows 23885  rows with SDK tokens 51
  docs/data/functions-retile.csv.gz   rows 52692  rows with SDK tokens 51
  ```

  Token counts across the whole file: `Nex` 178, `nn::` 15, `Nintendo` 17 (identical in both files,
  because the retile carries the column over verbatim). Example row:
  `0x17cf40,...,"t30NexMatchClearSystemPasswordJobE"` — Nintendo's NEX matchmaking SDK, library
  symbol names, not Capcom content and not ours.
* The "names in the tracked slot map" claim is checkable in one line: comparing
  `monster-slot-map.json[i].cn` with `monster-names-chs.json[i].chs` gives **125 identical of 137**,
  and 137/137 `cn` are non-empty.
* The 21 JSON exports are exactly the db's rows (self-consistent, per `docs/data/README.md:73`, which
  itself warns this is not independent validation): items 21,153, quests 1,355, quest_rewards 37,370,
  gathering 15,414, weapons 10,877, armor 5,637, monsters 129 — all 21 tables equal their db count.
  Sum of the 21 exports = 36,466,585 B = 34.78 MiB, matching `docs/data/README.md:29` exactly; the
  whole `json/` directory is 36,646,058 B = 34.95 MiB, which includes the 6 mapping files.
* Text vs numeric was decided per column, not per file: `armor.json` and `weapons.json` (1.29 MB and
  7.18 MB) have **no name column at all**, so they are numeric; `items.json` is prose.

---

## RISK — ranked

### R1 (highest) — Two **tracked** files contain 137 verbatim Capcom localized strings

`docs/data/json/monster-slot-map.json` and `docs/data/json/monster-slot-map-137.json` are the only
tracked files inside `json/`, because `.gitignore:59-60` un-ignores them. Both carry `cn` and
`cn_src`, and `cn_src` records that every name was read out of `chS/arc/resident_chS.arc ::
monsterName_chS #N` (4 rows name `chS/table/itemData_chS.gmd`). 137/137 rows have a non-empty `cn`.
This is the exact category the project says it excludes: game asset text published as our own. It is
also the one risk class that survives the ignore rules — a clean clone of this repo would contain the
137 names.

What would have to change: delete the `cn`/`cn_src` columns (keep `slot/emid/en/kind/ro` — the
emid@slot table is our own exe measurement, verified 137/137 against `0x1597EA4`), or substitute our
own translations labelled as ours. `json/README.md:8,12` repeats two of the names as examples and
should follow.

### R2 — Nintendo NEX SDK symbol names inside the two tracked function inventories

`functions.csv.gz` and `functions-retile.csv.gz` are tracked (`git ls-files`), and their `strings`
column holds text lifted from the image. 51 rows per file contain `Nex*` / `nn::*` / `Nintendo`
tokens (178 + 15 + 17 occurrences). Those are a third party's (Nintendo's) internal API symbol
names — not Capcom content, not our analysis. The retile tool documents that it copies this column
verbatim, so the exposure doubles with every regeneration.

What would have to change: drop the `strings` column from the published artifact (addresses, sizes,
insn counts, callers/callees are our measurements and carry no expression), or filter rows/tokens
matching the SDK prefixes.

### R3 — 53.46 MiB of third-party game data and web scrapes sit in the working tree, protected only by `.gitignore`

Present but ignored: `mhgu.db` (17.5 MiB), 21 exports (34.78 MiB), 6 agroff/Kiranico files
(1.07 MiB), 6 mapping files. `git log` shows zero commits for any of them, so git history is clean.
The exposure is therefore not git but packaging: any release zip, docs build, `git add -f`, archive
of the folder, or `cp -r docs/data` into a publishing step would ship 53 MiB of Capcom text and
Kiranico content in one step. `items.json` alone is 16.7 MB of localized item text.

What would have to change: nothing in git; the release/build path must explicitly exclude
`docs/data/**` (or use an allowlist), and the docs must point readers at obtaining the upstream db.

### R4 — The root README's "no game files" claim is false for the working tree

`README.md:8` says "No game code, keys, game files, or save files are in this repository", but
`main.140.flat.bin` (25,472,632 B, mtime 2026-10-22) is in the repo root and is the declared input of
7 of the 11 tracked `docs/data` files (class-inventory, member-offsets,
resource-registry, both function inventories, both slot maps) — while `tools/mhgu/README.md:4` says the inputs are
deliberately *not* in the repo. The file is gitignored (`.gitignore:7,50`), so the sentence is true
of the published tree and false of the directory anyone would zip. It is the same mechanism as R3:
the private working tree and the publishable tree are the same folder.

What would have to change: keep the image outside the repo root, or make the packaging step explicit
about what it copies.

### R5 — The docs license cannot cover the data attached to it

`README.md:21` licenses `docs/` as CC BY 4.0, and CC BY grants rights in "the Work".
`docs/data/README.md:4` states, in the same tree, that the agroff set is "属卡普空游戏数据的衍生汇编 …
正式分发需用户自行获取", and the db is a Capcom-data extract. A CC BY grant over `docs/` therefore
over-reaches: it purports to license third-party content under terms its owners never gave. This is
a statement-level risk (nothing physically ships) but it is what an outsider reads first.

What would have to change: scope the `docs/` license to exclude `docs/data/`, or add an explicit
"third-party derived data, not covered by the CC BY grant" notice next to it.

### R6 — `json/` cannot rebuild the authoritative database, so a reader who honours the rules hits a dead end

21 tables are exported; 10 non-empty tables (73,187-row `components`, 14,510-row
`item_to_skill_tree`, 8,044-row `hunting_rewards`, 1,168-row `meow_rewards`, …) have no export, and
the exporter script itself is not in the repo (F3). Anyone who takes only the tracked files cannot reconstruct the db, and
nobody inside the repo can regenerate the 21 exports either.

What would have to change: either add the exporter and the missing 8 tables' exports (still ignored,
so the public surface does not change), or state in `docs/data/README.md` that the exports are
one-off snapshots with no in-repo regeneration path.

### R7 — Provenance of the six hand-built mappings is split: three are untracked

`json/README.md` presents 6 mapping files as knowledge-base assets, but only
`monster-slot-map.json` / `monster-slot-map-137.json` are tracked; `monster-names-chs.json`,
`monster-dttune-index.json` and `motion-values.json` are ignored only by the `docs/data/json/*`
wildcard, and `monster-name-map.json` by its own line. A public clone loses three of the six, so
documents that cite them (`docs/wiki/motion-values.md` cites the 870 motion values,
`docs/mechanics/monsters.md` cites the name map) point at files the reader does not have. Their size
is small and the numeric part is our own measurement; what keeps them local is the embedded `chs`/`ja`
name columns (see R1).

What would have to change: publish the numeric/offset part of those three with the name columns
removed, plus explicit ignore lines so they cannot be committed accidentally.

### R8 — Evidence chain for the tracked labels points outside the repository

`tierb-labels.csv` (tracked, 378 rows) carries a `src` column naming
`.tmp/reports-mhgu/tierB-slice-03.md` etc. `.tmp/` is excluded by `.gitignore:66`, so the evidence
backing 378 labels is deliberately local-only. Same pattern for `functions-retile.csv.gz`, whose
guard comment references invariants (46,087 prologues, ≈1,937 string-bearing functions) that no
tracked report recomputes. A reader can check the numbers only by re-running the tools against his
own image.

What would have to change: copy the cited slice reports into `docs/analysis/code/tierb-pass2/` (the
directory already exists and is tracked) or drop the `src` column.

### R9 (low) — Two listed directories are empty; one README count is off by one

`docs/data/README.md` lists `weapons/` and `armor/` as containing per-weapon-type files; both are
empty, as is `viewer/`. Separately, `docs/data/README.md:29` counts "38 张用户表（计入 sqlite_sequence 共
39 个表）", while the file has 39 tables including `sqlite_sequence` **and** `android_metadata` (the
APK's own table), i.e. 37 content tables + 2 metadata tables. Neither is a rights problem; both are
facts a reviewer will notice.

---

## UNKNOWN

Cannot be determined from inside this repository:

1. **The actual license of MHGenDatabase v2.4.0.** The repo records only the release name
   (`docs/data/README.md:26`). Neither the APK nor its `LICENSE`/README is present (the only
   `LICENSE` in the tree is the root GPL-3.0 for our code). Whether the upstream permits
   redistribution of `mhgu.db` is unverifiable here.
2. **Kiranico's terms.** The agroff files are described as Kiranico scrapes (`docs/data/README.md:3`);
   no upstream license or ToS text is in the tree, and the scraping was upstream's, not ours.
3. **Whether short factual extractions are protectable at all.** Monster names, hitzone numbers and
   motion values are facts; per-item descriptions and quest flavor are prose. The line between R1
   (`do-not-publish`) and the `attribute` rows is a legal judgment, not a measurement — this audit
   only reports which file contains which kind of content.
4. **Why 12 of the 137 `cn` values differ** between `monster-slot-map.json` and
   `monster-names-chs.json`. The difference is measured (125/137 identical) but the cause is not
   recorded: hand correction, a different archive, or a later edit. It decides whether the tracked
   file is a pure copy or partly our own work.
5. **Whether the archives are read from the user's own dump.** The tools read
   `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin` (a fixed local path, `tools/mhgu/README.md:6`)
   and the root image exists; the provenance of that dump (own cartridge vs. downloaded) is outside
   the repo.
6. **Whether any of the 21 exports was hand-edited after export.** Row counts match the db exactly
   (F6), which rules out added/deleted rows but not in-place edits of field values.

---

## Difficulties

* `zcat` is not available in this shell (`error: command not found: zcat`). Decompression and row
  counting for the two `.csv.gz` files were done with `bun -e 'zlib.gunzipSync(...)'`; cost two extra
  round-trips.
* There is **no exporter script** for `docs/data/json/` anywhere in the tree
  (`grep -rln "sqlite_master" --include=*.mjs --include=*.py .` → empty; the two `export-*.mjs` tools
  write the editor's `MHGU_item(uni).txt` / `MHGU_DLC.txt`, not the JSON exports). I could therefore
  not reproduce an export and had to settle for a row-count comparison against the db, which proves
  consistency but not fidelity of field values. Suspected cause: the exports were made ad hoc when
  the db landed, and the script stayed in the session that produced it.
* `.gitignore` needed per-file `git check-ignore -v`: line 11 (`docs/data/json/*`), the per-file
  rules on lines 28-49 and the three negations on lines 58-60 interact, and `git status` shows
  nothing for ignored files.
* Deciding "expression vs. fact" required opening a sample of each export rather than trusting the
  README's one-line description: `armor.json` and `weapons.json` turned out to have **no name column
  at all** (numeric-only), while `items.json` is ~16.7 MB of prose. The README's table does not
  distinguish these cases.
* `resource-registry.tsv` has no header and mixes resolved names with `?crc32` placeholders, so a
  naive `grep -c '?'` counts all 448; the real resolved count (176) needs the third field only.
