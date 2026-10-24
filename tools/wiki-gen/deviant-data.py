# Throwaway: build per-deviant permit-quest table from romfs quest scan (questreq.csv) + mhgu.db.
# HR rule (quest-requirements.md section 2): req1 1..18 -> HR(req1+1), 19 -> HR100, 0 -> none.
import csv, sqlite3
db = sqlite3.connect('G:/omp works/MHGU/docs/data/mhgu.db')
req = {int(r['id']): r for r in csv.DictReader(open('G:/omp works/.tmp/mhgu/questreq.csv', encoding='utf8'))}
def hr(v):
    v = int(v)
    return '' if v == 0 else ('HR100' if v == 19 else f'HR{v + 1}' if v <= 18 else f'?{v}')
rows = db.execute("""
  SELECT q._id, q.stars, q.name, q.goal, q.hrp, q.reward, l.name,
         (SELECT group_concat(m.name, ';') FROM monster_to_quest mq JOIN monsters m ON m._id = mq.monster_id
           WHERE mq.quest_id = q._id) AS mons
  FROM quests q JOIN locations l ON l._id = q.location_id
  WHERE q.hub = 'Permit' ORDER BY q._id""").fetchall()
out = csv.writer(open('G:/omp works/.tmp/deviant-quests.tsv', 'w', encoding='utf8', newline=''), delimiter='\t')
out.writerow(['quest_id', 'db_stars', 'name', 'goal', 'monsters', 'location', 'reward', 'hrp',
              'romfs_rank', 'romfs_stars', 'req1', 'accept_HR', 'req2', 'in_romfs'])
miss = 0
for qid, st, name, goal, hrp, rew, loc, mons in rows:
    r = req.get(qid)
    if not r: miss += 1
    out.writerow([qid, st, name, goal, mons, loc, rew, hrp,
                  r['rank'] if r else '', r['stars'] if r else '', r['req1'] if r else '',
                  hr(r['req1']) if r else '', r['req2'] if r else '', 'yes' if r else 'no'])
print('permit quests', len(rows), 'missing in romfs scan', miss)
# Deviant materials -> weapons/armor needing them (db components).
mats = db.execute("""SELECT _id, name FROM items WHERE type = 'Materials' AND
  (name LIKE '%Soul%' OR name LIKE '%Hide' OR name LIKE '%Spirit%') ORDER BY _id""").fetchall()
cols = [r[1] for r in db.execute('pragma table_info(components)')]
print('components cols', cols)
