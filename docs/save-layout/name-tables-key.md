# MHGU 关键成员名字表（flat.bin 提取原文，vaddr）

## 1) sUserInfo / 任务风格记录块  @0x1569180..0x1569300
```
sUserInfo
mUserData.rank_quest[no]
rabbitNo
rabbitRecordNo
cTrialArts
mGuild[0] mGuild[1] mGuild[2]
mOld[0]   mOld[1]   mOld[2]
mAirhike[0..2]   mBushi[0..2]   mKizuna[0..2]   mTatsujin[0..2]
```
→ **288B 族 = 6 组任务/风格完成位图**（mGuild=A 槽 / mOld=B 槽 / 另四组对应 mAirhike,mBushi,mKizuna,mTatsujin）

## 2) cAcPlayerEquipXML / 玩家装备+狩技  @0x15606b0..0x1560900
```
cAcPlayerEquipXML
mSupperArtsX1[0..4]  mSupperArtsX2[0..4]  mSupperArtsX3[0..4]   ← 狩技三组×5
mEmType
mHeadType[0..10+]    mHeadItemNum[0..10+]                        ← 头部装备 类型+数量 交错
```
→ 对应 obj+0xD24/0xD3C/0xD54（狩技 24B×3）与装备栏

## 3) cQuestDaily / 日常委托  @0x15626c0..0x1562900
```
cQuestDaily
mTargetEmType | mZenny | mItemID[0..5]
cQuestDailyXML
mQuestType | mRequestVillage | mQuestLv | mMonsterLv | mStartType
mQuestTime | mQuestLife | mAcEquipSetNo | mBGMType
mEntryType_1 | mEntryType_2 | mEntryType_Combo
mClearType | mGekitaiHp
mIsClearParam_1 | mClearID_1 | mClearNum_1
mIsClearParam_2 | mClearID_2 | mClearNum_2
mSubClearType | mClearID_Sub | mClearNum_Sub
mHagiLv | mPickLv | mFishingLv
mVillagePoint | mRemMoney | mSubRemMoney
mClearRemVillagePoint | mFailedRemVillagePoint | mSubRemVillagePoint
mListData[79].num | mListData[79].itemId
```
→ 委托任务的完整字段集（含报酬 mItemID[0..5]、条件 mClearID/Num、村庄点数）

## 4) 护石  @0x155364c..0x15536ec
```
cAmuletBase | cAmuletSkillBase | cAmuletSkillBaseXML | cAmuletSlotBaseXML
mRare | mMinValue
```

## 用法
完整字典：`.tmp/reports-mhgu/name-dictionary.txt`（106 块 / 4782 标识符 / 118KB）
→ 任何匿名族都可在此查候选名：按「族在 obj 中的相邻字段」反查同块成员名。
