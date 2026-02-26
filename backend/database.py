import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "calorie_tracker.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT    NOT NULL UNIQUE,
            email       TEXT    NOT NULL UNIQUE,
            password_hash TEXT  NOT NULL,
            calorie_goal INTEGER NOT NULL DEFAULT 2000,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # Add calorie_goal column if it doesn't exist (migration)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN calorie_goal INTEGER NOT NULL DEFAULT 2000")
    except:
        pass  # Column already exists

    # Calorie logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS calorie_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            food_item   TEXT    NOT NULL,
            calories    REAL    NOT NULL,
            protein     REAL    NOT NULL DEFAULT 0,
            carbs       REAL    NOT NULL DEFAULT 0,
            fats        REAL    NOT NULL DEFAULT 0,
            serving_size TEXT   NOT NULL DEFAULT '',
            notes       TEXT    NOT NULL DEFAULT '',
            logged_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # Add macro columns if they don't exist (migration)
    for col in ['protein', 'carbs', 'fats']:
        try:
            cursor.execute(f"ALTER TABLE calorie_logs ADD COLUMN {col} REAL NOT NULL DEFAULT 0")
        except:
            pass  # Column already exists

    conn.commit()
    conn.close()
