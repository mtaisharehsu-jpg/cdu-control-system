#!/bin/bash

# CDU Control System Stop Script
# CDU 控制系統停止腳本

echo "=========================================="
echo "  正在停止 CDU Control System..."
echo "=========================================="

# 設定顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 進入專案目錄
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# 讀取 PID 檔案
if [ -f "cdu_pids.txt" ]; then
    echo -e "${YELLOW}從 PID 檔案讀取程序資訊...${NC}"
    source cdu_pids.txt
    
    # 停止主 API 服務
    if [ ! -z "$MAIN_API_PID" ] && kill -0 $MAIN_API_PID 2>/dev/null; then
        echo -e "${YELLOW}停止主 API 服務 (PID: $MAIN_API_PID)...${NC}"
        kill $MAIN_API_PID
        sleep 2
        if kill -0 $MAIN_API_PID 2>/dev/null; then
            echo -e "${RED}強制停止主 API 服務${NC}"
            kill -9 $MAIN_API_PID
        fi
        echo -e "${GREEN}✓ 主 API 服務已停止${NC}"
    fi
    
    # 停止警報 API 服務
    if [ ! -z "$ALARM_API_PID" ] && kill -0 $ALARM_API_PID 2>/dev/null; then
        echo -e "${YELLOW}停止警報 API 服務 (PID: $ALARM_API_PID)...${NC}"
        kill $ALARM_API_PID
        sleep 2
        if kill -0 $ALARM_API_PID 2>/dev/null; then
            echo -e "${RED}強制停止警報 API 服務${NC}"
            kill -9 $ALARM_API_PID
        fi
        echo -e "${GREEN}✓ 警報 API 服務已停止${NC}"
    fi
    
    # 停止觸控介面服務
    if [ ! -z "$TOUCH_PID" ] && kill -0 $TOUCH_PID 2>/dev/null; then
        echo -e "${YELLOW}停止觸控介面服務 (PID: $TOUCH_PID)...${NC}"
        kill $TOUCH_PID
        sleep 2
        if kill -0 $TOUCH_PID 2>/dev/null; then
            echo -e "${RED}強制停止觸控介面服務${NC}"
            kill -9 $TOUCH_PID
        fi
        echo -e "${GREEN}✓ 觸控介面服務已停止${NC}"
    fi
    
    # 停止前端服務
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${YELLOW}停止前端服務 (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID
        sleep 2
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "${RED}強制停止前端服務${NC}"
            kill -9 $FRONTEND_PID
        fi
        echo -e "${GREEN}✓ 前端服務已停止${NC}"
    fi
    
    # 清理 PID 檔案
    rm -f cdu_pids.txt
    echo -e "${GREEN}✓ PID 檔案已清理${NC}"
    
else
    echo -e "${YELLOW}未找到 PID 檔案，嘗試按端口停止服務...${NC}"
    
    # 按端口查找並停止程序
    PORTS=(8000 8001 5173 8765)
    
    for port in "${PORTS[@]}"; do
        echo -e "${YELLOW}檢查端口 $port...${NC}"
        PID=$(lsof -ti:$port 2>/dev/null)
        
        if [ ! -z "$PID" ]; then
            echo -e "${YELLOW}停止端口 $port 上的程序 (PID: $PID)...${NC}"
            kill $PID
            sleep 2
            
            # 檢查是否還在運行
            if kill -0 $PID 2>/dev/null; then
                echo -e "${RED}強制停止端口 $port 上的程序${NC}"
                kill -9 $PID
            fi
            echo -e "${GREEN}✓ 端口 $port 上的服務已停止${NC}"
        else
            echo -e "${GREEN}✓ 端口 $port 沒有運行的服務${NC}"
        fi
    done
fi

# 停止可能的 Python 程序
echo -e "${YELLOW}檢查其他相關程序...${NC}"
PYTHON_PROCS=$(pgrep -f "python.*main_api.py\|python.*integrated_alarm_api.py\|python.*touchscreen_interface.py" 2>/dev/null)

if [ ! -z "$PYTHON_PROCS" ]; then
    echo -e "${YELLOW}發現相關 Python 程序，正在停止...${NC}"
    echo "$PYTHON_PROCS" | xargs kill 2>/dev/null
    sleep 2
    
    # 檢查是否還有程序運行
    REMAINING_PROCS=$(pgrep -f "python.*main_api.py\|python.*integrated_alarm_api.py\|python.*touchscreen_interface.py" 2>/dev/null)
    if [ ! -z "$REMAINING_PROCS" ]; then
        echo -e "${RED}強制停止剩餘程序${NC}"
        echo "$REMAINING_PROCS" | xargs kill -9 2>/dev/null
    fi
    echo -e "${GREEN}✓ Python 相關程序已停止${NC}"
fi

# 停止可能的 Node.js 程序
NODE_PROCS=$(pgrep -f "node.*vite\|npm.*dev" 2>/dev/null)

if [ ! -z "$NODE_PROCS" ]; then
    echo -e "${YELLOW}發現相關 Node.js 程序，正在停止...${NC}"
    echo "$NODE_PROCS" | xargs kill 2>/dev/null
    sleep 2
    
    # 檢查是否還有程序運行
    REMAINING_NODE_PROCS=$(pgrep -f "node.*vite\|npm.*dev" 2>/dev/null)
    if [ ! -z "$REMAINING_NODE_PROCS" ]; then
        echo -e "${RED}強制停止剩餘 Node.js 程序${NC}"
        echo "$REMAINING_NODE_PROCS" | xargs kill -9 2>/dev/null
    fi
    echo -e "${GREEN}✓ Node.js 相關程序已停止${NC}"
fi

# 清理臨時檔案
echo -e "${YELLOW}清理臨時檔案...${NC}"
rm -f *.pyc
rm -rf __pycache__
rm -f .env.local

# 檢查端口是否已釋放
echo -e "${YELLOW}驗證端口釋放狀態...${NC}"
PORTS_TO_CHECK=(8000 8001 5173 8765)
ALL_CLEAN=true

for port in "${PORTS_TO_CHECK[@]}"; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo -e "${RED}✗ 端口 $port 仍被佔用${NC}"
        ALL_CLEAN=false
    else
        echo -e "${GREEN}✓ 端口 $port 已釋放${NC}"
    fi
done

echo ""
if [ "$ALL_CLEAN" = true ]; then
    echo -e "${GREEN}=========================================="
    echo -e "  CDU Control System 已完全停止！"
    echo -e "==========================================${NC}"
    echo ""
    echo -e "${BLUE}所有服務已停止，端口已釋放${NC}"
    echo -e "${BLUE}可以使用 ./scripts/start_cdu.sh 重新啟動系統${NC}"
else
    echo -e "${YELLOW}=========================================="
    echo -e "  CDU Control System 停止完成"  
    echo -e "  (部分端口可能仍被其他程序佔用)"
    echo -e "==========================================${NC}"
    echo ""
    echo -e "${YELLOW}如果需要強制釋放端口，請手動檢查：${NC}"
    echo -e "${BLUE}lsof -ti:8000 | xargs kill -9${NC}"
fi

exit 0