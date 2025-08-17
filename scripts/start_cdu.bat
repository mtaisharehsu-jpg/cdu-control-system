@echo off
REM CDU Control System Startup Script for Windows
REM CDU 控制系統 Windows 啟動腳本

title CDU Control System v2.2

echo ==========================================
echo   CDU Control System v2.2 啟動中...
echo ==========================================

REM 檢查 Python 是否安裝
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 錯誤: Python 未安裝或不在 PATH 中
    pause
    exit /b 1
)

REM 檢查 Node.js 是否安裝  
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 錯誤: Node.js 未安裝或不在 PATH 中
    pause
    exit /b 1
)

REM 進入專案目錄
cd /d "%~dp0.."
set PROJECT_DIR=%cd%

echo 專案目錄: %PROJECT_DIR%

REM 檢查必要的目錄是否存在
echo 檢查目錄結構...
if not exist "logs" mkdir logs
if not exist "logs\system" mkdir logs\system
if not exist "logs\api" mkdir logs\api
if not exist "logs\sensors" mkdir logs\sensors  
if not exist "logs\plc" mkdir logs\plc
if not exist "logs\errors" mkdir logs\errors
if not exist "logs\security" mkdir logs\security
if not exist "backup" mkdir backup
if not exist "certs" mkdir certs

REM 檢查 HAL 庫是否存在
echo 檢查 HAL 庫...
if exist "hal\lib-cdu-hal.dll" (
    echo ✓ HAL 庫已找到
) else (
    echo ⚠ HAL 庫未找到，將使用模擬模式
)

REM 檢查配置檔案
echo 檢查配置檔案...
set CONFIG_FILES=cdu_config.yaml snmp_alarm_config.json config\security_config.json config\logging_config.json config\touchscreen_config.json

for %%f in (%CONFIG_FILES%) do (
    if exist "%%f" (
        echo ✓ %%f
    ) else (
        echo ✗ %%f 不存在
    )
)

REM 檢查 Python 依賴
echo 檢查 Python 依賴...
pip list | findstr "fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ 安裝 Python 依賴...
    pip install -r requirements.txt
    pip install bcrypt pyotp qrcode cryptography websockets
) else (
    echo ✓ Python 依賴已安裝
)

REM 啟動後端服務
echo 啟動後端服務...

REM 主 API 服務
echo 啟動主 API 服務 (端口 8000)...
start "CDU Main API" /min python main_api.py
timeout /t 3 /nobreak >nul

REM 整合警報 API
echo 啟動警報 API 服務 (端口 8001)...
start "CDU Alarm API" /min python integrated_alarm_api.py
timeout /t 2 /nobreak >nul

REM 觸控螢幕介面 (可選)
if exist "touchscreen_interface.py" (
    echo 啟動觸控螢幕介面 (端口 8765)...
    start "CDU Touchscreen" /min python touchscreen_interface.py
)

REM 等待服務啟動
echo 等待服務啟動...
timeout /t 5 /nobreak >nul

REM 檢查服務是否正常運行
echo 檢查服務狀態...

REM 檢查主 API
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 主 API 服務運行正常
) else (
    echo ✗ 主 API 服務啟動失敗
)

REM 檢查警報 API
curl -s http://localhost:8001/ >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 警報 API 服務運行正常
) else (
    echo ✗ 警報 API 服務啟動失敗
)

REM 啟動前端服務
if exist "cdu-config-ui" (
    echo 啟動前端服務...
    cd cdu-config-ui
    
    REM 檢查是否已安裝依賴
    if not exist "node_modules" (
        echo 安裝前端依賴...
        npm install
    )
    
    echo 啟動前端開發服務器 (端口 5173)...
    start "CDU Frontend" /min npm run dev
    
    cd ..
)

REM 等待前端啟動
timeout /t 5 /nobreak >nul

echo ==========================================
echo   CDU Control System 啟動完成！
echo ==========================================
echo.
echo 存取方式:
echo   🌐 Web 介面:     http://localhost:5173
echo   📚 API 文檔:     http://localhost:8000/docs  
echo   🚨 警報 API:     http://localhost:8001/docs
echo   📱 觸控介面:     ws://localhost:8765
echo.
echo 預設登入:
echo   👤 使用者名稱:   admin
echo   🔑 密碼:         admin123
echo   ⚠️  請立即更改預設密碼
echo.
echo 日誌檔案位置:    logs\
echo 停止系統:        scripts\stop_cdu.bat
echo.
echo 按任意鍵開啟 Web 介面...
pause >nul

REM 開啟瀏覽器
start http://localhost:5173

echo.
echo CDU Control System 正在運行中...
echo 按 Ctrl+C 或關閉此視窗停止系統
echo.

REM 保持視窗開啟
:loop
timeout /t 10 /nobreak >nul
goto loop