@echo off
echo Starting CalorAI Backend...
cd /d d:\Chat_Bot\backend
start "CalorAI Backend" python -m uvicorn main:app --reload --port 8000
echo Backend started on http://localhost:8000
echo.
echo Starting CalorAI Frontend...
cd /d d:\Chat_Bot\frontend
timeout /t 2 /nobreak >nul
start "CalorAI Frontend" npm run dev
echo Frontend starting on http://localhost:5173
echo.
echo Both servers are running!
echo Open your browser to: http://localhost:5173
pause
