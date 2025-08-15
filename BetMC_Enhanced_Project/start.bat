@echo off
echo ========================================
echo   BetMC Texture Generator Pro Enhanced
echo ========================================
echo.
echo กำลังตรวจสอบ Node.js...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ไม่พบ Node.js กรุณาติดตั้ง Node.js ก่อน
    echo 📥 ดาวน์โหลดได้ที่: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ พบ Node.js แล้ว
node --version
echo.

echo กำลังตรวจสอบ dependencies...
if not exist node_modules (
    echo 📦 กำลังติดตั้ง dependencies...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ การติดตั้ง dependencies ล้มเหลว
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies พร้อมแล้ว
)

echo.
echo กำลังตรวจสอบ Python...
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  ไม่พบ Python (ไม่บังคับ แต่แนะนำให้ติดตั้ง)
    echo 📥 ดาวน์โหลดได้ที่: https://www.python.org/
) else (
    echo ✅ พบ Python แล้ว
    python --version
    echo กำลังติดตั้ง Python dependencies...
    pip install -r requirements.txt >nul 2>nul
)

echo.
echo 🚀 เริ่มเซิร์ฟเวอร์...
echo 🌐 URL: http://localhost:5000
echo 📱 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์
echo.

node server.js