import logging
import sqlite3
from pathlib import Path
from typing import Optional

import aiosqlite

from app.core.config import settings

logger = logging.getLogger(__name__)

_db_path: Optional[str] = None
_init_done: bool = False

CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    current_level INTEGER NOT NULL DEFAULT 1 CHECK(current_level BETWEEN 1 AND 10),
    trend TEXT DEFAULT 'new_user',
    last_analysis TEXT,
    challenge_state TEXT DEFAULT 'optimal',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""

CREATE_SCORES = """
CREATE TABLE IF NOT EXISTS game_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    game_type TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
    level_played INTEGER NOT NULL CHECK(level_played BETWEEN 1 AND 10),
    accuracy REAL,
    response_time REAL,
    mistakes INTEGER,
    hints_used INTEGER,
    session_duration REAL,
    cognitive_domain TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);
"""

CREATE_LOGS = """
CREATE TABLE IF NOT EXISTS adaptation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    trend TEXT,
    challenge_state TEXT,
    decision TEXT,
    recommended_level INTEGER,
    current_level INTEGER,
    average_score REAL,
    latest_score INTEGER,
    confidence REAL,
    analysis TEXT,
    decision_source TEXT,
    created_at TEXT NOT NULL
);
"""

CREATE_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_scores_user_time ON game_scores(user_id, timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_scores_user ON game_scores(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_logs_user ON adaptation_logs(user_id, created_at DESC);",
]


def get_db_path() -> str:
    return settings.get_sqlite_path()


async def init_db(db_path: Optional[str] = None) -> None:
    global _init_done, _db_path
    path = db_path or get_db_path()
    _db_path = path
    # Ensure directory exists for file DB
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(path) as db:
        await db.execute("PRAGMA journal_mode=WAL;")
        await db.execute("PRAGMA foreign_keys=ON;")
        await db.execute(CREATE_USERS)
        await db.execute(CREATE_SCORES)
        await db.execute(CREATE_LOGS)
        for idx_sql in CREATE_INDEXES:
            await db.execute(idx_sql)
        await db.commit()
    _init_done = True
    logger.info(f"SQLite ready at {path}")


async def close_db() -> None:
    pass


def is_db_available() -> bool:
    # SQLite local is always available after init; check file or memory
    if _init_done:
        return True
    # For tests with :memory:, init is done via init_db
    path = get_db_path()
    if path == ":memory:":
        return _init_done
    # File-based: if we haven't inited, we will on next connect
    return True  # local file is always considered available


from contextlib import asynccontextmanager


@asynccontextmanager
async def get_connection():
    path = get_db_path()
    conn = await aiosqlite.connect(path)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys=ON;")
    await conn.execute("PRAGMA busy_timeout = 5000;")
    try:
        yield conn
    finally:
        await conn.close()
