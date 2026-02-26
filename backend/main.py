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
    FoodLogRequest, FoodLogResponse, DailyReport, MacroTotals,
    HistoryEntry, HistoryReport, UserSettings, UserSettingsUpdate,
    OnboardingData, OnboardingResponse,
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
    return Token(access_token=token, user_id=user_id, username=body.username.strip(), calorie_goal=2000, onboarding_completed=False)


@app.post("/auth/login", response_model=Token, tags=["Auth"])
def login(body: UserLogin):
    conn = get_connection()
    try:
        user = conn.execute(
            "SELECT id, username, password_hash, calorie_goal, onboarding_completed FROM users WHERE username = ?",
            (body.username.strip(),)
        ).fetchone()
    finally:
        conn.close()

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": str(user["id"])})
    return Token(
        access_token=token, 
        user_id=user["id"], 
        username=user["username"], 
        calorie_goal=user["calorie_goal"],
        onboarding_completed=bool(user["onboarding_completed"])
    )


# ── Food Logging ──────────────────────────────────────────────────────────────

@app.post("/food/log", response_model=FoodLogResponse, status_code=status.HTTP_201_CREATED, tags=["Food"])
def log_food(body: FoodLogRequest, user_id: int = Depends(get_current_user_id)):
    # Fetch calorie info from Gemini
    calorie_data = fetch_calories(body.food_item)

    conn = get_connection()
    try:
        cursor = conn.execute(
            """INSERT INTO calorie_logs (user_id, food_item, calories, protein, carbs, fats, serving_size, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                body.food_item,
                calorie_data["calories"],
                calorie_data["protein"],
                calorie_data["carbs"],
                calorie_data["fats"],
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
        protein=row["protein"],
        carbs=row["carbs"],
        fats=row["fats"],
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
            protein=r["protein"] if "protein" in r.keys() else 0,
            carbs=r["carbs"] if "carbs" in r.keys() else 0,
            fats=r["fats"] if "fats" in r.keys() else 0,
            serving_size=r["serving_size"],
            notes=r["notes"],
            logged_at=r["logged_at"],
        )
        for r in rows
    ]
    total_calories = sum(l.calories for l in logs)
    total_macros = MacroTotals(
        protein=sum(l.protein for l in logs),
        carbs=sum(l.carbs for l in logs),
        fats=sum(l.fats for l in logs)
    )
    return DailyReport(date=today, logs=logs, total_calories=total_calories, total_macros=total_macros)


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
                    """SELECT COALESCE(SUM(calories), 0) as total,
                              COALESCE(SUM(protein), 0) as protein,
                              COALESCE(SUM(carbs), 0) as carbs,
                              COALESCE(SUM(fats), 0) as fats
                       FROM calorie_logs
                       WHERE user_id = ? AND date(logged_at) = ?""",
                    (user_id, d.isoformat())
                ).fetchone()
                entries.append(HistoryEntry(
                    label=d.strftime("%a"),
                    date=d.isoformat(),
                    total_calories=row["total"],
                    total_macros=MacroTotals(protein=row["protein"], carbs=row["carbs"], fats=row["fats"])
                ))

        elif period == "monthly":
            # Last 30 days grouped by week
            for week in range(3, -1, -1):
                week_end = today - timedelta(days=week * 7)
                week_start = week_end - timedelta(days=6)
                row = conn.execute(
                    """SELECT COALESCE(SUM(calories), 0) as total,
                              COALESCE(SUM(protein), 0) as protein,
                              COALESCE(SUM(carbs), 0) as carbs,
                              COALESCE(SUM(fats), 0) as fats
                       FROM calorie_logs
                       WHERE user_id = ?
                         AND date(logged_at) BETWEEN ? AND ?""",
                    (user_id, week_start.isoformat(), week_end.isoformat())
                ).fetchone()
                entries.append(HistoryEntry(
                    label=f"Week {4 - week}",
                    date=week_start.isoformat(),
                    total_calories=row["total"],
                    total_macros=MacroTotals(protein=row["protein"], carbs=row["carbs"], fats=row["fats"])
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
                    """SELECT COALESCE(SUM(calories), 0) as total,
                              COALESCE(SUM(protein), 0) as protein,
                              COALESCE(SUM(carbs), 0) as carbs,
                              COALESCE(SUM(fats), 0) as fats
                       FROM calorie_logs
                       WHERE user_id = ?
                         AND strftime('%Y-%m', logged_at) = ?""",
                    (user_id, month_str)
                ).fetchone()
                entries.append(HistoryEntry(
                    label=datetime.strptime(month_str, "%Y-%m").strftime("%b"),
                    date=f"{month_str}-01",
                    total_calories=row["total"],
                    total_macros=MacroTotals(protein=row["protein"], carbs=row["carbs"], fats=row["fats"])
                ))
    finally:
        conn.close()

    return HistoryReport(period=period, entries=entries)


# ── User Settings ─────────────────────────────────────────────────────────────

@app.get("/user/settings", response_model=UserSettings, tags=["User"])
def get_user_settings(user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT calorie_goal FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return UserSettings(calorie_goal=row["calorie_goal"])
    finally:
        conn.close()


@app.put("/user/settings", response_model=UserSettings, tags=["User"])
def update_user_settings(body: UserSettingsUpdate, user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE users SET calorie_goal = ? WHERE id = ?",
            (body.calorie_goal, user_id)
        )
        conn.commit()
        return UserSettings(calorie_goal=body.calorie_goal)
    finally:
        conn.close()


# ── Onboarding ────────────────────────────────────────────────────────────────

def calculate_maintenance_calories(gender: str, age: int, height: float, weight: float, activity_level: str) -> int:
    """Calculate maintenance calories using Mifflin-St Jeor equation"""
    if gender.lower() == 'male':
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    
    activity_multipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very_active': 1.9
    }
    multiplier = activity_multipliers.get(activity_level.lower(), 1.55)
    return int(bmr * multiplier)


@app.post("/user/onboarding", response_model=OnboardingResponse, tags=["User"])
def complete_onboarding(body: OnboardingData, user_id: int = Depends(get_current_user_id)):
    maintenance = calculate_maintenance_calories(
        body.gender, body.age, body.height, body.weight, body.activity_level
    )
    
    # Calculate calorie adjustment based on weekly weight change target
    # 1 kg of body fat ≈ 7700 calories
    weekly_change = body.weight_change_per_week or 0.5
    
    if body.goal.lower() == 'lose':
        daily_deficit = (weekly_change * 7700) / 7  # Convert to daily
        recommended_goal = max(1200, int(maintenance - daily_deficit))  # Minimum 1200
    elif body.goal.lower() == 'gain':
        daily_surplus = (weekly_change * 7700) / 7
        recommended_goal = int(maintenance + min(daily_surplus, 1000))  # Cap surplus at 1000
    else:  # maintain
        weekly_change = 0
        recommended_goal = maintenance
    
    conn = get_connection()
    try:
        conn.execute(
            """UPDATE users SET 
               gender = ?, age = ?, height = ?, weight = ?, 
               activity_level = ?, calorie_goal = ?, onboarding_completed = 1
               WHERE id = ?""",
            (body.gender, body.age, body.height, body.weight, 
             body.activity_level, recommended_goal, user_id)
        )
        conn.commit()
    finally:
        conn.close()
    
    return OnboardingResponse(
        maintenance_calories=maintenance,
        recommended_goal=recommended_goal,
        calorie_goal=recommended_goal,
        weekly_change=weekly_change
    )
