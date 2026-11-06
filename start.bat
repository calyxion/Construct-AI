@echo off
title CONSTRUCTAI - Complete System Launcher
echo ============================================================
echo      CONSTRUCTAI: Construction Safety & Workforce AI
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"

echo [1/4] Starting FastAPI Backend on port 8000...
start "ConstructAI Backend" cmd /k "cd /d "%ROOT_DIR%" && python -m uvicorn backend.app.main:app --reload --port 8000"

echo [2/4] Waiting for Backend initialization...
timeout /t 3 /nobreak >nul

echo [3/4] Starting AI Camera Vision Engine (main.py)...
start "ConstructAI Vision Camera" cmd /k "cd /d "%ROOT_DIR%ai" && python main.py"

echo [4/4] Starting React Frontend Dashboard on port 5173...
start "ConstructAI Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo ============================================================
echo   ✓ Backend:      http://localhost:8000
echo   ✓ AI Vision:    Live Camera Stream active on CAM-01
echo   ✓ Frontend:     http://localhost:5173
echo ============================================================
echo.
echo Press any key to open the dashboard in your default browser...
pause >nul
start http://localhost:5173
