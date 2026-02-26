from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    calorie_goal: int
    onboarding_completed: bool


# ── Onboarding ────────────────────────────────────────────────────────────

class OnboardingData(BaseModel):
    gender: str  # 'male' or 'female'
    age: int
    height: float  # in cm
    weight: float  # in kg
    activity_level: str  # 'sedentary', 'light', 'moderate', 'active', 'very_active'
    goal: str  # 'lose', 'maintain', 'gain'
    weight_change_per_week: Optional[float] = 0.5  # kg per week (positive for both lose/gain)


class OnboardingResponse(BaseModel):
    maintenance_calories: int
    recommended_goal: int
    calorie_goal: int
    weekly_change: float  # kg per week
    time_to_goal: Optional[str] = None  # estimated time to reach target


# ── Food ──────────────────────────────────────────────────────────────────────

class FoodLogRequest(BaseModel):
    food_item: str

    @field_validator("food_item")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("food_item cannot be empty")
        return v.strip()


class FoodLogResponse(BaseModel):
    id: int
    food_item: str
    calories: float
    protein: float
    carbs: float
    fats: float
    serving_size: str
    notes: str
    logged_at: str


class MacroTotals(BaseModel):
    protein: float
    carbs: float
    fats: float


class DailyReport(BaseModel):
    date: str
    logs: List[FoodLogResponse]
    total_calories: float
    total_macros: MacroTotals


class HistoryEntry(BaseModel):
    label: str       # e.g. "Mon", "Week 1", "Jan"
    date: str        # ISO date of the period start
    total_calories: float
    total_macros: MacroTotals


class HistoryReport(BaseModel):
    period: str      # weekly | monthly | yearly
    entries: List[HistoryEntry]


# ── User Settings ─────────────────────────────────────────────────────────────

class UserSettings(BaseModel):
    calorie_goal: int


class UserSettingsUpdate(BaseModel):
    calorie_goal: int


# ── Exercise ──────────────────────────────────────────────────────────────────

class ExerciseInfo(BaseModel):
    name: str
    calories_per_kg_per_hour: float


class ExerciseLogRequest(BaseModel):
    exercise_name: str
    duration_minutes: float

    @field_validator("exercise_name")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("exercise_name cannot be empty")
        return v.strip()

    @field_validator("duration_minutes")
    @classmethod
    def positive_duration(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("duration_minutes must be positive")
        return v


class ExerciseLogResponse(BaseModel):
    id: int
    exercise_name: str
    duration_minutes: float
    calories_burnt: float
    logged_at: str


class DailyExerciseReport(BaseModel):
    date: str
    logs: List[ExerciseLogResponse]
    total_calories_burnt: float
