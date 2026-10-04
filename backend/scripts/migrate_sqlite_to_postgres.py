"""SQLite (todo.db) のデータを PostgreSQL へコピーする一回限りの移行スクリプト。

使い方（backend/ で実行）:
    .venv\\Scripts\\python scripts/migrate_sqlite_to_postgres.py [--sqlite todo.db] --postgres postgresql://user:pass@host/db

- 移行先は空のDB（またはテーブル未作成）である必要があります。既にデータがあれば中止します。
- id をそのまま保持し、コピー後にシーケンスを進めます（以降の採番が衝突しないように）。
- 移行元の SQLite ファイルは変更しません。
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, func, select, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app import models  # noqa: E402
from app.database import Base, normalize_database_url  # noqa: E402

TABLES = [models.User, models.Tab, models.Task]  # 外部キーの依存順


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sqlite", default=str(Path(__file__).resolve().parent.parent / "todo.db"))
    ap.add_argument("--postgres", required=True, help="移行先の PostgreSQL 接続URL")
    args = ap.parse_args()

    src_path = Path(args.sqlite)
    if not src_path.exists():
        print(f"移行元が見つかりません: {src_path}")
        return 1

    src_engine = create_engine(f"sqlite:///{src_path}")
    dst_engine = create_engine(normalize_database_url(args.postgres))
    if dst_engine.dialect.name != "postgresql":
        print("--postgres には PostgreSQL の接続URLを指定してください")
        return 1

    # 認証導入前のSQLiteには users テーブルや tabs.user_id が無いことがある
    with src_engine.connect() as c:
        tables = {r[0] for r in c.execute(text("select name from sqlite_master where type='table'"))}
        tab_cols = {r[1] for r in c.execute(text("pragma table_info(tabs)"))} if "tabs" in tables else set()

    Base.metadata.create_all(dst_engine)

    with Session(src_engine) as src, Session(dst_engine) as dst:
        for model in TABLES:
            if dst.scalar(select(func.count()).select_from(model)):
                print(f"移行先の {model.__tablename__} に既にデータがあるため中止します")
                return 1

        copied: dict[str, int] = {}
        for model in TABLES:
            name = model.__tablename__
            if name not in tables:
                copied[name] = 0
                continue
            cols = [c.key for c in model.__table__.columns]
            if model is models.Tab and "user_id" not in tab_cols:
                cols.remove("user_id")  # 既存タブは所有者なし（最初に登録したユーザーが引き継ぐ）
            rows = src.execute(select(*[model.__table__.c[k] for k in cols])).mappings().all()
            if rows:
                dst.execute(model.__table__.insert(), [dict(r) for r in rows])
            copied[name] = len(rows)

        # 明示的にidを入れたのでシーケンスを最大値まで進める
        for model in TABLES:
            t = model.__tablename__
            dst.execute(
                text(f"select setval(pg_get_serial_sequence('{t}', 'id'), coalesce((select max(id) from {t}), 1), "
                     f"(select count(*) > 0 from {t}))")
            )
        dst.commit()

    for name, n in copied.items():
        print(f"{name}: {n} 行をコピーしました")
    print("完了。DATABASE_URL を PostgreSQL に向けてバックエンドを再起動してください。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
