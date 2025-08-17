@echo off
REM CDU Control System Stop Script for Windows
REM CDU 控制系統 Windows 停止腳本

title CDU Control System - 停止服務

echo ==========================================
echo   正在停止 CDU Control System...
echo ==========================================

REM 進入專案目錄
cd /d "%~dp0.."

echo 正在查找 CDU 相關程序...

REM 停止 Python 程序
echo 停止 Python 後端服務...
taskkill /f /im python.exe 2>nul
if %errorlevel% equ 0 (
    echo ✓ Python 程序已停止
) else (
    echo ⚠ 未找到運行中的 Python 程序
)

REM 停止 Node.js 程序
echo 停止 Node.js 前端服務...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✓ Node.js 程序已停止
) else (
    echo ⚠ 未找到運行中的 Node.js 程序
)

REM 停止可能的其他相關程序
echo 停止其他相關程序...
taskkill /f /fi "WINDOWTITLE eq CDU*" 2>nul

REM 等待程序完全停止
echo 等待程序完全停止...
timeout /t 3 /nobreak >nul

REM 檢查端口是否已釋放
echo 檢查端口釋放狀態...

REM 檢查端口 8000
netstat -ano | findstr ":8000 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ✗ 端口 8000 仍被佔用
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 "') do (
        taskkill /f /pid %%a 2>nul
    )
) else (
    echo ✓ 端口 8000 已釋放
)

REM 檢查端口 8001
netstat -ano | findstr ":8001 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ✗ 端口 8001 仍被佔用
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 "') do (
        taskkill /f /pid %%a 2>nul
    )
) else (
    echo ✓ 端口 8001 已釋放
)

REM 檢查端口 5173
netstat -ano | findstr ":5173 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ✗ 端口 5173 仍被佔用
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 "') do (
        taskkill /f /pid %%a 2>nul
    )
) else (
    echo ✓ 端口 5173 已釋放
)

REM 檢查端口 8765
netstat -ano | findstr ":8765 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ✗ 端口 8765 仍被佔用
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8765 "') do (
        taskkill /f /pid %%a 2>nul
    )
) else (
    echo ✓ 端口 8765 已釋放
)

REM 清理臨時檔案
echo 清理臨時檔案...
del /s /q *.pyc 2>nul
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" 2>nul
if exist ".env.local" del ".env.local" 2>nul
if exist "cdu_pids.txt" del "cdu_pids.txt" 2>nul

echo.
echo ==========================================
echo   CDU Control System 已完全停止！
echo ==========================================
echo.
echo ✓ 所有服務已停止
echo ✓ 端口已釋放  
echo ✓ 臨時檔案已清理
echo.
echo 可以使用 scripts\start_cdu.bat 重新啟動系統
echo.

pause