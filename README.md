# CalorAI - Calorie Tracker

A calorie tracking application powered by Google Gemini AI. Simply log what you eat and the AI will automatically fetch nutritional information including calories, serving size, and notes about your food.

## Features

- User authentication (register/login)
- AI-powered food logging with automatic calorie detection
- Daily calorie tracking and reports
- History of logged meals

## Tech Stack

- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite
- **AI:** Google Gemini API

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Google Gemini API key

### Environment Variables

Create a `.env` file in the `backend/` folder with your API key:

```
GEMINI_API_KEY=your_api_key_here
```

### Installation

1. **Install backend dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

**Option 1: Using start script (Windows)**
```bash
start.bat
```

**Option 2: Manual start**

1. Start the backend:
   ```bash
   cd backend
   python -m uvicorn main:app --reload --port 8000
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open http://localhost:5173 in your browser.

## API Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login
- `POST /food/log` - Log a food item
- `GET /food/today` - Get today's food logs
- `GET /health` - Health check
