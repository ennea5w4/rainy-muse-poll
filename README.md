# Rainy Muse Poll v0.1.1

Sleeping Stars v2 の診断結果を、匿名で1票投票できる最小構成のアンケートWebページです。

---

## 1. 概要とゴール

- **Type 1 〜 Type 9** から1つを選択して投票
- 投票内容を保存（Supabase 連携 + ローカルフォールバック対応）
- 投票完了後、ページ遷移なしで同一画面内に最新集計結果（横棒グラフ・総投票数）を表示
- 流入元クエリパラメータ（?source=...）の自動追跡

---

## 2. ファイル構成

``
Rainy_Muse_Poll/
├── index.html       # 画面構成・セマンティックHTML・SEOタグ
├── style.css        # Rainy Museデザインシステム（アイボリー・ネイビー・淡い金・星光ハイライト）
├── app.js           # 投票処理・URLパラメータ解析・Supabase通信・集計描画
├── schema.sql       # Supabase用 テーブル作成・RLSポリシー定義SQL
├── .gitignore       # Git除外設定
└── README.md        # 本仕様・運用手順書
``

---

## 3. 保存データ仕様

- **対象サービス**: Supabase
- **テーブル名**: poll_votes

| カラム名 | 型 | 説明 / 値 |
|---|---|---|
| id | bigint (identity) | 主キー |
| poll_id | text | アンケート識別子: 'sleeping-stars-v2-result' |
| choice | text | 選択タイプ: 'type1' 〜 'type9' |
| source | text | 流入元（URLクエリから取得。未指定時は 'direct'） |
| created_at | timestamptz | 投票日時（
ow()） |

### 流入元クエリの例
- https://.../index.html?source=note -> 
ote
- https://.../index.html?source=medium -> medium
- https://.../index.html?source=sleeping-stars -> sleeping-stars
- パラメータなし -> direct

---

## 4. Supabase セットアップ手順（フェーズB用）

Supabaseダッシュボードの **SQL Editor** にて、プロジェクト直下の schema.sql の内容を実行してください。

`sql
create table if not exists public.poll_votes (
  id bigint generated always as identity primary key,
  poll_id text not null default 'sleeping-stars-v2-result',
  choice text not null check (choice in ('type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7', 'type8', 'type9')),
  source text not null default 'direct',
  created_at timestamptz not null default now()
);

alter table public.poll_votes enable row level security;

create policy "Allow anonymous insert on poll_votes"
  on public.poll_votes for insert with check (true);

create policy "Allow anonymous select on poll_votes"
  on public.poll_votes for select using (true);
`

---

## 5. 公開手順（GitHub Pages）

本プロジェクトはビルド工程を必要としない完全な静的サイトです。

1. GitHub に新規プライベート（またはパブリック）リポジトリを作成します。
2. リモートを追加してプッシュします：
   `ash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   `
3. GitHub リポジトリの **Settings > Pages** を開きます。
4. **Build and deployment > Source** で Deploy from a branch を選択し、main ブランチの / (root) を指定して保存します。
5. 数分で公開URLが発行されます。

---

## 6. ローカル動作確認

`ash
# Python による簡易HTTPサーバー起動
python -m http.server 8080
`
ブラウザで http://localhost:8080 を開いて動作を確認できます。
