@echo off
REM Suq Web — Deploy to Vercel Production
REM Usage: Run from the suq directory after making changes

echo ========================================
echo  Suq Web Deploy
echo ========================================
echo.

cd /d "%~dp0\web"

echo Deploying to Vercel...
call npx vercel --prod --yes
if %errorlevel% neq 0 (
    echo ERROR: Vercel deploy failed
    exit /b %errorlevel%
)

echo.
echo ========================================
echo  Done! souk.et is live.
echo ========================================
