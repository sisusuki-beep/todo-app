# ToDo アプリ

タブ（リスト）単位でタスクを管理する ToDo Web アプリ。FastAPI + PostgreSQL（開発用にSQLiteも可） / React + TypeScript。

## 起動方法

### バックエンド（http://localhost:8000）

```bash
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt   # 初回のみ
.venv\Scripts\python -m uvicorn app.main:app --reload
```

API ドキュメント: http://localhost:8000/docs ／ テスト: `.venv\Scripts\python -m pytest`

### フロントエンド（http://localhost:5173）

Node.js 20+ が必要です。

```bash
cd frontend
npm install   # 初回のみ
npm run dev
```

開発時、`/api` は Vite のプロキシ経由でバックエンド（8000番）へ転送されます。
別のAPIを使う場合は `VITE_API_URL` を設定してください。

## データベース（PostgreSQL）

`DATABASE_URL` に PostgreSQL の接続URLを指定すると PostgreSQL を使います。未設定の場合は開発用の SQLite（`backend/todo.db`）です。

1. `backend/.env.example` を `backend/.env` にコピーし、`DATABASE_URL` を設定します。
   - 例: `DATABASE_URL=postgresql://user:password@localhost:5432/todo`
   - Neon / Supabase / Render などが発行する `postgres://...` 形式もそのまま使えます。
2. バックエンドを起動すると、テーブルが自動で作成されます。

### 既存の SQLite データを PostgreSQL へ移す

移行先に**空のDB**を用意してから、`backend/` で1回だけ実行します（`todo.db` は変更されません）。

```bash
.venv\Scripts\python scripts/migrate_sqlite_to_postgres.py --postgres postgresql://user:password@host:5432/todo
```

### テストを PostgreSQL で実行する

```bash
$env:TEST_DATABASE_URL = "postgresql://user:password@localhost:5432/todo_test"   # 空のテスト用DB
.venv\Scripts\python -m pytest
```

## アカウントと認証

- 初回アクセス時に「新規登録」でアカウントを作成します。
  - メールアドレス + パスワード（**半角英小文字と数字の両方を含む8文字以上**、72文字まで）
  - パスワードは bcrypt でハッシュ化して DB（`users` テーブル）に保存します。
- ログイン後は JWT（有効期限7日）を発行し、以降のAPI呼び出しに付与します。
- タブ・タスクはユーザーごとに分かれ、他のユーザーのデータは見えません。
- 認証導入前に作ったタブは、**最初に登録したユーザー**に引き継がれます。

### 公開（本番）時の環境変数

| 変数 | 説明 |
| --- | --- |
| `SECRET_KEY` | **必須**。JWT署名用のランダムな長い文字列（例: `python -c "import secrets;print(secrets.token_urlsafe(48))"`）。未設定だと開発用に `backend/.secret_key` を自動生成します |
| `DATABASE_URL` | **本番は PostgreSQL の接続URLを指定**（未設定だと開発用の `backend/todo.db`＝SQLite になります） |
| `CORS_ORIGINS` | フロントエンドのオリジン（カンマ区切り） |

公開する場合は必ず HTTPS で配信してください（パスワードとトークンが平文で流れるのを防ぐため）。

## 構成

- `backend/` — FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL（psycopg 3）/ SQLite
- `frontend/` — React, Vite, Tailwind CSS v3, Radix UI, TanStack Query, dnd-kit, lucide-react

## 操作

- タブ: 追加（＋）、名前変更・移動・削除（選択中タブの「…」メニュー）、ドラッグで並び替え（スマホは長押し）
- タスク: 追加・編集・削除、チェックで完了、右端のハンドルをドラッグして並び替え
- 「すべて/未完了/完了済み」フィルタ、並び順の切替、キーワード検索（「全タブ」で横断検索）
- ダークモードは右上のボタンで切替
