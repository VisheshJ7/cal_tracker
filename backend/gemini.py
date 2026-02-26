import os
import json
import re
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

from google import genai

API_KEY = os.getenv("GEMINI_API_KEY", "")


def fetch_calories(food_item: str) -> dict:
    """
    Ask Gemini for calorie info about a food item.
    Returns: { "calories": float, "serving_size": str, "notes": str }
    """
    if not API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")

    prompt = (
        f"You are a precise nutrition expert database. "
        f"For the food item: \"{food_item}\", return ONLY a valid JSON object with these exact keys:\n"
        f"  - \"calories\": a number (kcal for a standard/common serving)\n"
        f"  - \"serving_size\": a string describing the serving (e.g. \"1 medium apple (182g)\")\n"
        f"  - \"notes\": a single-sentence note about the food\n\n"
        f"Return ONLY the JSON object, no markdown, no explanation, no extra text."
    )

    try:
        client = genai.Client(api_key=API_KEY)
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config={"temperature": 0.1}
        )
        raw = response.text.strip()

        # Strip possible markdown code fences
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        data = json.loads(raw)

        calories = float(data.get("calories", 0))
        serving_size = str(data.get("serving_size", "1 serving"))
        notes = str(data.get("notes", ""))

        if calories <= 0:
            raise ValueError("calories must be positive")

        return {"calories": calories, "serving_size": serving_size, "notes": notes}

    except (json.JSONDecodeError, ValueError, KeyError) as e:
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse calorie data for '{food_item}'. Please try a more specific food name."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API error: {str(e)}"
        )
