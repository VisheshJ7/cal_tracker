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
            gender      TEXT    DEFAULT NULL,
            age         INTEGER DEFAULT NULL,
            height      REAL    DEFAULT NULL,
            weight      REAL    DEFAULT NULL,
            activity_level TEXT DEFAULT NULL,
            onboarding_completed INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # Add new columns if they don't exist (migration)
    for col, col_type, default in [
        ('calorie_goal', 'INTEGER', '2000'),
        ('gender', 'TEXT', 'NULL'),
        ('age', 'INTEGER', 'NULL'),
        ('height', 'REAL', 'NULL'),
        ('weight', 'REAL', 'NULL'),
        ('activity_level', 'TEXT', 'NULL'),
        ('onboarding_completed', 'INTEGER', '0'),
    ]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type} DEFAULT {default}")
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

    # Exercise logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS exercise_logs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            exercise_name   TEXT    NOT NULL,
            duration_minutes REAL   NOT NULL,
            calories_burnt  REAL    NOT NULL,
            logged_at       TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    conn.commit()
    conn.close()
