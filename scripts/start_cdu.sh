#!/bin/bash

# CDU Control System Startup Script
# CDU 控制系統啟動腳本

echo "=========================================="
echo "  CDU Control System v2.2 啟動中..."
echo "=========================================="

# 設定顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查 Python 是否安裝
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}錯誤: Python3 未安裝${NC}"
    exit 1
fi

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo -e "${RED}錯誤: Node.js 未安裝${NC}"
    exit 1
fi

# 進入專案目錄
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}專案目錄: $PROJECT_DIR${NC}"

# 檢查必要的目錄是否存在
echo -e "${YELLOW}檢查目錄結構...${NC}"
mkdir -p logs/{system,api,sensors,plc,errors,security}
mkdir -p backup
mkdir -p certs

# 檢查 HAL 庫是否存在
echo -e "${YELLOW}檢查 HAL 庫...${NC}"
if [ -f "hal/lib-cdu-hal.so" ] || [ -f "hal/lib-cdu-hal.dll" ]; then
    echo -e "${GREEN}✓ HAL 庫已找到${NC}"
else
    echo -e "${YELLOW}⚠ HAL 庫未找到，將使用模擬模式${NC}"
fi

# 檢查配置檔案
echo -e "${YELLOW}檢查配置檔案...${NC}"
CONFIG_FILES=(
    "cdu_config.yaml"
    "snmp_alarm_config.json"
    "config/security_config.json"
    "config/logging_config.json"
    "config/touchscreen_config.json"
)

for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$config_file" ]; then
        echo -e "${GREEN}✓ $config_file${NC}"
    else
        echo -e "${RED}✗ $config_file 不存在${NC}"
    fi
done

# 檢查 Python 依賴
echo -e "${YELLOW}檢查 Python 依賴...${NC}"
pip3 list | grep -E "(fastapi|uvicorn|pydantic|bcrypt|pyotp)" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Python 依賴已安裝${NC}"
else
    echo -e "${YELLOW}⚠ 安裝 Python 依賴...${NC}"
    pip3 install -r requirements.txt
    pip3 install bcrypt pyotp qrcode cryptography websockets
fi

# 啟動後端服務
echo -e "${BLUE}啟動後端服務...${NC}"

# 主 API 服務
echo -e "${YELLOW}啟動主 API 服務 (端口 8000)...${NC}"
python3 main_api.py > logs/main_api.log 2>&1 &
MAIN_API_PID=$!
echo "Main API PID: $MAIN_API_PID"

# 等待主 API 啟動
sleep 3

# 整合警報 API
echo -e "${YELLOW}啟動警報 API 服務 (端口 8001)...${NC}"
python3 integrated_alarm_api.py > logs/alarm_api.log 2>&1 &
ALARM_API_PID=$!
echo "Alarm API PID: $ALARM_API_PID"

# 觸控螢幕介面 (可選)
if [ -f "touchscreen_interface.py" ]; then
    echo -e "${YELLOW}啟動觸控螢幕介面 (端口 8765)...${NC}"
    python3 touchscreen_interface.py > logs/touchscreen.log 2>&1 &
    TOUCH_PID=$!
    echo "Touchscreen Interface PID: $TOUCH_PID"
fi

# 等待服務啟動
sleep 5

# 檢查服務是否正常運行
echo -e "${YELLOW}檢查服務狀態...${NC}"

# 檢查主 API
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 主 API 服務運行正常${NC}"
else
    echo -e "${RED}✗ 主 API 服務啟動失敗${NC}"
fi

# 檢查警報 API
if curl -s http://localhost:8001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 警報 API 服務運行正常${NC}"
else
    echo -e "${RED}✗ 警報 API 服務啟動失敗${NC}"
fi

# 啟動前端服務
if [ -d "cdu-config-ui" ]; then
    echo -e "${BLUE}啟動前端服務...${NC}"
    cd cdu-config-ui
    
    # 檢查是否已安裝依賴
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}安裝前端依賴...${NC}"
        npm install
    fi
    
    echo -e "${YELLOW}啟動前端開發服務器 (端口 5173)...${NC}"
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    
    cd ..
fi

# 等待前端啟動
sleep 5

# 儲存 PID 到檔案
cat > cdu_pids.txt << EOF
MAIN_API_PID=$MAIN_API_PID
ALARM_API_PID=$ALARM_API_PID
TOUCH_PID=$TOUCH_PID
FRONTEND_PID=$FRONTEND_PID
EOF

echo -e "${GREEN}=========================================="
echo -e "  CDU Control System 啟動完成！"
echo -e "==========================================${NC}"
echo ""
echo -e "${BLUE}存取方式:${NC}"
echo -e "  🌐 Web 介面:     ${GREEN}http://localhost:5173${NC}"
echo -e "  📚 API 文檔:     ${GREEN}http://localhost:8000/docs${NC}"
echo -e "  🚨 警報 API:     ${GREEN}http://localhost:8001/docs${NC}"
echo -e "  📱 觸控介面:     ${GREEN}ws://localhost:8765${NC}"
echo ""
echo -e "${BLUE}預設登入:${NC}"
echo -e "  👤 使用者名稱:   ${YELLOW}admin${NC}"
echo -e "  🔑 密碼:         ${YELLOW}admin123${NC}"
echo -e "  ⚠️  ${RED}請立即更改預設密碼${NC}"
echo ""
echo -e "${BLUE}日誌檔案位置:    ${GREEN}logs/${NC}"
echo -e "${BLUE}停止系統:        ${GREEN}./scripts/stop_cdu.sh${NC}"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服務${NC}"

# 建立信號處理函數
cleanup() {
    echo -e "\n${YELLOW}正在停止 CDU 服務...${NC}"
    
    # 終止所有背景程序
    if [ ! -z "$MAIN_API_PID" ]; then
        kill $MAIN_API_PID 2>/dev/null
        echo "停止主 API 服務"
    fi
    
    if [ ! -z "$ALARM_API_PID" ]; then
        kill $ALARM_API_PID 2>/dev/null
        echo "停止警報 API 服務"
    fi
    
    if [ ! -z "$TOUCH_PID" ]; then
        kill $TOUCH_PID 2>/dev/null
        echo "停止觸控介面服務"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "停止前端服務"
    fi
    
    # 清理 PID 檔案
    rm -f cdu_pids.txt
    
    echo -e "${GREEN}CDU Control System 已停止${NC}"
    exit 0
}

# 註冊信號處理
trap cleanup SIGINT SIGTERM

# 保持腳本運行
while true; do
    sleep 1
done