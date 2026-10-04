# ToDoアプリ 仕様書

2026-09-20 · @Someone

## 概要

本アプリは、PC・スマートフォンの両方で利用できるモダンなToDo管理Webアプリケーション。タスクを「タブ」単位（カテゴリやプロジェクトごと）で分類・管理でき、バックエンドはFastAPI、データベースはSQLiteで構築する。デザインは有償プロダクトとして通用する洗練度を目指す。

## 要求事項一覧

| # | 要求 | 詳細 |
| --- | --- | --- |
| 1 | マルチデバイス対応 | PCブラウザ・スマートフォンブラウザの両方で快適に操作できるレスポンシブデザイン |
| 2 | バックエンド | FastAPI（Python） |
| 3 | フロントエンド | 指定なし（本書ではReact + TypeScriptを採用。詳細は技術スタック節を参照） |
| 4 | デザイン品質 | 販売可能なレベルのモダンなUI/UX |
| 5 | データ永続化 | データベースに記録（初期段階はSQLite） |
| 6 | タブ管理 | タスクをタブ（カテゴリ／リスト）単位で分けて管理できる |

## 技術スタック

### バックエンド

- Python 3.11+
- FastAPI（REST API）
- SQLAlchemy 2.0（ORM）
- Pydantic v2（スキーマ・バリデーション）
- SQLite（開発・初期運用用DB。将来的にPostgreSQLへ移行可能な設計とする）
- Uvicorn（ASGIサーバー）

### フロントエンド（おまかせのため以下を提案）

- React 18 + TypeScript
- Vite（ビルドツール）
- Tailwind CSS（スタイリング）
- shadcn/ui + Radix UI（モダンで洗練されたUIコンポーネント）
- TanStack Query（React Query）（API通信・キャッシュ管理）
- Lucide React（アイコン）

選定理由: shadcn/ui + Tailwindの組み合わせは近年のSaaS製品でも多用される構成で、「販売レベル」の見た目を短期間で実現しやすく、レスポンシブ対応・ダークモード対応も容易。

## 機能要件

### タブ（カテゴリ）管理

- タブの新規作成・名称変更・削除・並び替え（ドラッグ&ドロップ）
- 各タブは独立したToDoリストを保持する
- 最低1つのタブは常に存在する（全削除不可）

### タスク管理（各タブ内）

- タスクの新規作成（タイトル必須、詳細メモ・期限日・優先度は任意）
- タスクの編集・削除
- 完了／未完了の切り替え（チェックボックス）
- 優先度設定（高・中・低）と色分け表示
- 期限日の設定と期限超過タスクの視覚的な強調表示
- タスクの並び替え（ドラッグ&ドロップ、または期限日・優先度でのソート）
- フィルタ表示（すべて／未完了／完了済み）
- タブ内でのキーワート検索

### その他

- 全タブ横断のキーワード検索（任意機能）
- タブごとの未完了タスク件数バッジ表示

## 画面構成・UI設計

### レイアウト方針

- デスクトップ（幅768px以上）: 左サイドバーにタブ一覧、右側にタスクリストを表示する2カラムレイアウト
- スマートフォン（幅768px未満）: 上部に横スクロール可能なタブバー、下にタスクリストを表示する1カラユト
- Tailwind CSSのブレークポイント（`md:`）でレイアウトを切り替える

### デザイン方針

- ミニマルでフラットなモダンデザイン、余白を活かしたカード型UI
- アクセントカラー1色＋ニュートラルなグレースケールを基調（例: インディゴ／エメラルド系）
- ダークモード対応（`prefers-color-scheme`または手動トグル）
- タスク完了時はチェックアイコン＋取り消し線のアニメーション
- 優先度はカード左端の色バーで表示（高=赤、中=黄、低9グレー）
- タスク0件の空状態にはイラスト風プレースホルダーとメッセージを表示
- データ取得中はスケルトンローディングを表示

### 主要画面

1. メイン画面（タブ一覧＋選択中タブのタスクリスト）
2. タスク追加／編集モーダル（またはスライドインパネル）
3. タブ追加／編集モーダル

## データベース設計（SQLite）

### tabs テーブル

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | INTEGER PK | タブID（自動採番） |
| name | VARCHAR(50) | タブ名 |
| order | INTEGER | 表示順 |
| created\_at | DATETIME | 作成日時 |

### tasks テーブル

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | INTEGER PK | タスクID（自動採番） |
| tab\_id | INTEGER FK → tabs.id | 所属タブ |
| title | VARCHAR(200) | タスクタイトル（必須） |
| description | TEXT | 詳細メモ（任意） |
| is\_completed | BOOLEAN | 完了フラグ（デフォルトfalse） |
| priority | VARCHAR(10) | high / medium / low |
| due\_date | DATE | 期限日（任意） |
| order | INTEGER | タブ内の表示順 |
| created\_at | DATETIME | 作成日時 |
| updated\_at | DATETIME | 更新日時 |

tabs : tasks = 1 : N（タブ削除時はタスクもカスケード削除する）

## API設計（REST, JSON, prefix: /api）

### タブ

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | /api/tabs | タブ一覧取得（表示順） |
| POST | /api/tabs | タブ新規作成 `{name}` |
| PUT | /api/tabs/{tab\_id} | タブ更新（名称・order） |
| DELETE | /api/tabs/{tab\_id} | タブ削除 |

### タスク

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | /api/tabs/{tab\_id}/tasks | 指定タブのタスク一覧（`status`, `sort`クエリ対応） |
| POST | /api/tasks | タスク新規作成 |
| GET | /api/tasks/{task\_id} | タスク詳細取得 |
| PUT | /api/tasks/{task\_id} | タスク更新 |
| PATCH | /api/tasks/{task\_id}/toggle | 完了／未完了の切り替え |
| DELETE | /api/tasks/{task\_id} | タスク削除 |

レスポンスは全てJSON。エラー時はFastAPI標準の`HTTPException`（404, 422など）を返す。CORSミドルウェアでフロントエンド（別ポート）からのアクセスを許可する。

## ディレクトリ構成

```
todo-app/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPIエントリポイント、CORS設定
│   │   ├── database.py      # SQLite接続・セッション管理
│   │   ├── models.py        # SQLAlchemyモデル（Tab, Task）
│   │   ├── schemas.py       # Pydanticスキーマ
│   │   ├── crud.py          # DB操作ロジック
│   │   └── routers/
│   │       ├── tabs.py
│   │       └── tasks.py
│   ├── requirements.txt
│   └── todo.db              # 実行時に自動生成
├── frontend/
│   ├── src/
│   │   ├── api/            # APIクライ゠ント（fetch/axios）
│   │   ├── components/      # TabBar, TaskList, TaskItem, TaskModal など）をe�'
   ゜   ゜    hooks/           # React Queryカスタムフック
│   │   ├── types/           # TypeScript型定義
│   │   └── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   └── vite.config.ts
└── README.md
```

## 非機能要件

- **パフォーマンス**: SQLiteはローカル用途を想定し、通常のCRUD操作は100ms以内を目標とする
- **セキュリティ**: 全入力値はPydanticでバリデーション、CORSは開発時のフロントエンドオリジンのみ許可、SQLインジェクション対策はSQLAlchemyのORM利用で担保
- **アクセシビリティ**: キーボード操作対応、フォーム要素への適切なラベル付け、十分なコントラスト比
- **拡張性**: DBアクセス層を抽象化し、将来的なSQLite→PostgreSQL移行を容易にする
- **保守性**: バックエンド・フロントエンド共に型付け（Pydantic / TypeScript）を徹底し、責務ごとにファイルを分割

## Claude Codeへの実装指示

以下の順序で実装を進めること。

1. **バックエンド初期構築**: `backend/`配下にFastAPIプロジェクトを作成し、`requirements.txt`に`fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`を記載する
2. **DBモデル定義**: `models.py`にTab/Taskモデルを定義し、`database.py`でSQLite接続とテーブル自動作成処理を実装する
3. **スキーマ・CRUD実装**: `schemas.py`と`crud.py`を作成し、`routers/tabs.py`・`routers/tasks.py`にエンドポイントを実装する
4. **CORS設定**: `main.py`でCORSMiddlewareを追加し、フロントエンド（例: `http://localhost:5173`）からのアクセスを許可する
5. **フロントエンド初期構築**: `npm create vite@latest frontend -- --template react-ts`でプロジェクトを作成し、TailwindCSSとshadcn/uiをセットアップする
6. **APIクライアント実装**: `src/api/`にfetchラッパーを作成し、TanStack Queryのカスタムフック（`useTabs`, `useTasks`など）を実装する
7. **UIコンポーネント実装**: タブバー、タスクリスト、タスクカード、追加／編集モーダルを技術スタック・UI設計節に沿って実装する
8. **レスポンシブ対応**: Tailwindのブレークポイントでデスクトップ／スマートフォンのレイアウトを切り替える
9. **仕上げ**: ローディングスケルトン、空状態表示、完了アニメーション、ダークモード対応を追加する
10. **動作確認**: バックエンドを`uvicorn app.main:app --reload`、フロントエンドを`npm run dev`で起動し、一連のCRUD操作が正しく動作することを確認する
