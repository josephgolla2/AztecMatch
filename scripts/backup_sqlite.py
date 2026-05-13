#!/usr/bin/env python3
"""
Copy the SQLite database file for offline backup / restore drills (R3 mitigation).

Usage (from repo root): python scripts/backup_sqlite.py

Defaults to aztecmatch.db in the project root unless AZTECMATCH_DATABASE_URL is set
to a sqlite file path (file component used).
"""

from __future__ import annotations

import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path


def _sqlite_file_from_url(url: str | None) -> Path | None:
    if not url or not url.startswith("sqlite"):
        return None
    m = re.match(r"sqlite:///(.*)", url)
    if not m:
        return None
    raw = m.group(1)
    if raw.startswith(":memory:") or "mode=memory" in raw:
        return None
    return Path(raw)


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    url = os.environ.get("AZTECMATCH_DATABASE_URL", "sqlite:///aztecmatch.db")
    db_path = _sqlite_file_from_url(url)
    if db_path is None:
        print("AZTECMATCH_DATABASE_URL does not point at a file-based SQLite database; nothing to copy.")
        return 1
    if not db_path.is_file():
        print(f"Database file not found: {db_path}")
        return 1

    backup_dir = root / "backups"
    backup_dir.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dest = backup_dir / f"aztecmatch_{stamp}.db"
    shutil.copy2(db_path, dest)
    print(f"Backed up {db_path} -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
