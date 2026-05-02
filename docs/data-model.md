# データモデル（MVP）

## cats
猫プロフィール

| column | type | notes |
|---|---|---|
| id | uuid (pk) | 猫ID |
| owner_user_id | uuid | 登録ユーザー |
| display_name | text | 表示名 |
| real_name | text | 実名（非公開可） |
| age_years | int | 年齢 |
| sex | text | male/female/unknown |
| region_prefecture | text | 都道府県 |
| region_city | text | 市区町村 |
| photo_url | text | 写真URL |
| visibility | text | public/anonymous/private |
| created_at | timestamptz | 作成日時 |

## daily_logs
日次記録

| column | type | notes |
|---|---|---|
| id | uuid (pk) | ログID |
| cat_id | uuid (fk -> cats.id) | 対象の猫 |
| log_date | date | 記録日 |
| food_total_g | numeric(6,2) | 総エサ量 |
| dry_ratio_pct | numeric(5,2) | カリカリ比率 |
| wet_ratio_pct | numeric(5,2) | ウェット比率 |
| snack_g | numeric(6,2) | おやつ量 |
| poop_count | int | うんち回数 |
| pee_count | int | おしっこ回数 |
| memo | text | メモ |
| created_at | timestamptz | 作成日時 |

## 統計ビュー

### regional_daily_stats
- 集計キー: `log_date`, `region_prefecture`, `region_city`
- 指標:
  - avg_food_total_g
  - avg_dry_ratio_pct
  - avg_wet_ratio_pct
  - avg_snack_g
  - avg_poop_count
  - avg_pee_count
  - sample_size

### national_daily_stats
- 集計キー: `log_date`
- 指標は regional と同じ

## バリデーション
- `dry_ratio_pct + wet_ratio_pct = 100`（許容誤差±0.5）
- `food_total_g >= 0`
- `snack_g >= 0`
- `poop_count, pee_count >= 0`

## 匿名化ルール
- `visibility = anonymous` の場合
  - 一覧APIで `display_name` のみ返却
  - `real_name` は owner のみ参照可能
- `visibility = private` の場合
  - 一覧APIに表示しない
  - 統計集計には含める（最低サンプル数閾値あり）
