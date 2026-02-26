import os
from datetime import datetime, date, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import init_db, get_connection
from models import (
    UserRegister, UserLogin, Token,
    FoodLogRequest, FoodLogResponse, DailyReport,
    HistoryEntry, HistoryReport,
)
from auth import hash_password, verify_password, create_access_token, get_current_user_id
from gemini import fetch_calories

app = FastAPI(title="Calorie Tracker API", version="1.0.0")

# CORS – allow the Vite dev server and any production origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def register(body: UserRegister):
    conn = get_connection()
    try:
        # Check uniqueness
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ? OR username = ?",
            (body.email.lower(), body.username.lower())
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email or username already registered")

        password_hash = hash_password(body.password)
        cursor = conn.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (body.username.strip(), body.email.lower().strip(), password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid
    finally:
        conn.close()

    token = create_access_token({"sub": str(user_id)})
    return Token(access_token=token, user_id=user_id, username=body.username.strip())


@app.post("/auth/login", response_model=Token, tags=["Auth"])
def login(body: UserLogin):
    conn = get_connection()
    try:
        user = conn.execute(
            "SELECT id, username, password_hash FROM users WHERE email = ?",
            (body.email.lower().strip(),)
        ).fetchone()
    finally:
        conn.close()

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["id"])})
    return Token(access_token=token, user_id=user["id"], username=user["username"])


# ── Food Logging ──────────────────────────────────────────────────────────────

@app.post("/food/log", response_model=FoodLogResponse, status_code=status.HTTP_201_CREATED, tags=["Food"])
def log_food(body: FoodLogRequest, user_id: int = Depends(get_current_user_id)):
    # Fetch calorie info from Gemini
    calorie_data = fetch_calories(body.food_item)

    conn = get_connection()
    try:
        cursor = conn.execute(
            """INSERT INTO calorie_logs (user_id, food_item, calories, serving_size, notes)
               VALUES (?, ?, ?, ?, ?)""",
            (
                user_id,
                body.food_item,
                calorie_data["calories"],
                calorie_data["serving_size"],
                calorie_data["notes"],
            )
        )
        conn.commit()
        log_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM calorie_logs WHERE id = ?", (log_id,)).fetchone()
    finally:
        conn.close()

    return FoodLogResponse(
        id=row["id"],
        food_item=row["food_item"],
        calories=row["calories"],
        serving_size=row["serving_size"],
        notes=row["notes"],
        logged_at=row["logged_at"],
    )


@app.get("/food/today", response_model=DailyReport, tags=["Food"])
def get_today(user_id: int = Depends(get_current_user_id)):
    today = date.today().isoformat()
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT * FROM calorie_logs
               WHERE user_id = ? AND date(logged_at) = ?
               ORDER BY logged_at DESC""",
            (user_id, today)
        ).fetchall()
    finally:
        conn.close()

    logs = [
        FoodLogResponse(
            id=r["id"],
            food_item=r["food_item"],
            calories=r["calories"],
            serving_size=r["serving_size"],
            notes=r["notes"],
            logged_at=r["logged_at"],
        )
        for r in rows
    ]
    total = sum(l.calories for l in logs)
    return DailyReport(date=today, logs=logs, total_calories=total)


@app.delete("/food/log/{log_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Food"])
def delete_log(log_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM calorie_logs WHERE id = ? AND user_id = ?",
            (log_id, user_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Log entry not found")
        conn.execute("DELETE FROM calorie_logs WHERE id = ?", (log_id,))
        conn.commit()
    finally:
        conn.close()


# ── History / Reports ─────────────────────────────────────────────────────────

@app.get("/food/history", response_model=HistoryReport, tags=["Food"])
def get_history(period: str = "weekly", user_id: int = Depends(get_current_user_id)):
    if period not in ("weekly", "monthly", "yearly"):
        raise HTTPException(status_code=400, detail="period must be weekly, monthly, or yearly")

    today = date.today()
    conn = get_connection()

    entries: list[HistoryEntry] = []

    try:
        if period == "weekly":
            # Last 7 days
            for i in range(6, -1, -1):
                d = today - timedelta(days=i)
                row = conn.execute(
                    """SELECT COALESCE(SUM(calories), 0) as total
                       FROM calorie_logs
                       WHERE user_id = ? AND date(logged_at) = ?""",
                    (user_id, d.isoformat())
                ).fetchone()
                entries.append(HistoryEntry(
                    label=d.strftime("%a"),
                    date=d.isoformat(),
                    total_calories=row["total"]
                ))

        elif period == "monthly":
            # Last 30 days grouped by week
            for week in range(3, -1, -1):
                week_end = today - timedelta(days=week * 7)
                week_start = week_end - timedelta(days=6)
                row = conn.execute(
                    """SELECT COALESCE(SUM(calories), 0) as total
                       FROM calorie_logs
                       WHERE user_id = ?
                         AND date(logged_at) BETWEEN ? AND ?""",
                    (user_id, week_start.isoformat(), week_end.isoformat())
                ).fetchone()
                entries.append(HistoryEntry(
                    label=f"Week {4 - week}",
                    date=week_start.isoformat(),
                    total_calories=row["total"]
                ))

        elif period == "yearly":
            # Last 12 months
            for m in range(11, -1, -1):
                # Calculate month offset
                target_month = today.month - m
                target_year = today.year
                while target_month <= 0:
                    target_month += 12
                    target_year -= 1
                month_str = f"{target_year}-{target_month:02d}"
                row = conn.execute(
                    """SELECT COALESCE(SUM(calories), 0) as total
                       FROM calorie_logs
                       WHERE user_id = ?
                         AND strftime('%Y-%m', logged_at) = ?""",
                    (user_id, month_str)
                ).fetchone()
                entries.append(HistoryEntry(
                    label=datetime.strptime(month_str, "%Y-%m").strftime("%b"),
                    date=f"{month_str}-01",
                    total_calories=row["total"]
                ))
    finally:
        conn.close()

    return HistoryReport(period=period, entries=entries)
