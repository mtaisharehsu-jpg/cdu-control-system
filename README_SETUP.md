# CDU 控制系統安裝與執行指南

## 📋 目錄結構

```
CDU_cid_v00/
├── 📁 config/                    # 配置目錄
│   ├── logging_config.json       # 日誌配置
│   ├── security_config.json      # 安全配置
│   ├── touchscreen_config.json   # 觸控螢幕配置
│   ├── fault_knowledge_base.json # 故障診斷知識庫
│   └── system_config.json        # 系統配置
├── 📁 scripts/                   # 啟動腳本目錄
│   ├── start_cdu.sh              # Linux/Mac 啟動腳本
│   ├── stop_cdu.sh               # Linux/Mac 停止腳本
│   ├── start_cdu.bat             # Windows 啟動腳本
│   └── stop_cdu.bat              # Windows 停止腳本
├── 📁 cdu-config-ui/             # React 前端界面
├── 📁 hal/                       # 硬體抽象層
├── 📁 blocks/                    # 功能塊
├── 📁 logs/                      # 日誌目錄 (自動創建)
├── 📁 backup/                    # 備份目錄 (自動創建)
├── 📁 certs/                     # SSL 證書目錄 (自動創建)
└── 🐍 *.py                       # Python 後端程序
```

## 🚀 快速啟動

### Windows 系統

```batch
# 1. 雙擊執行啟動腳本
scripts\start_cdu.bat

# 2. 或使用命令行
cd /d "您的專案路徑"
scripts\start_cdu.bat
```

### Linux/Mac 系統

```bash
# 1. 執行啟動腳本
./scripts/start_cdu.sh

# 2. 或者使用 Docker
docker-compose up -d --build
```

## 🌐 存取界面

啟動成功後，可以通過以下方式存取系統：

| 服務 | URL | 描述 |
|------|-----|------|
| **主控制台** | http://localhost:5173 | React 前端界面 |
| **API 文檔** | http://localhost:8000/docs | FastAPI 自動生成文檔 |
| **警報 API** | http://localhost:8001/docs | 警報管理 API |
| **觸控介面** | ws://localhost:8765 | WebSocket 觸控通訊 |

## 🔐 預設登入資訊

```
使用者名稱: admin
密碼: admin123
⚠️ 首次登入後請立即更改密碼！
```

## 📊 功能模塊

### 1. 主控制台 (7個功能標籤)

- **Status** - 即時狀態監控
- **Alert Setting** - 警報閾值設定
- **Network Setting** - 網路配置
- **System Setting** - 系統設定
- **Control** - 運行模式控制
- **FW Status** - 韌體狀態
- **FW Update** - 韌體更新

### 2. 控制模式

#### 自動模式：
- **差壓控制** (50-150 KPA)
- **流量控制** (10-200 LPM)
- **溫度控制** (20-60°C)

#### 手動模式：
- 泵浦負載控制 (0-100%)
- 閥門開度控制
- 統一泵浦控制

### 3. 警報系統

- **60+ 種警報類型**
- **SNMP Trap 支援**
- **兩級警報** (Warning/Alert)
- **自動發送間隔** (Warning: 30s, Alert: 10s)

## ⚙️ 系統需求

### 最低配置

- **作業系統**: Windows 10/11, Ubuntu 18.04+, macOS 10.15+
- **Python**: 3.8 或以上
- **Node.js**: 16 或以上
- **記憶體**: 4GB RAM
- **硬碟**: 10GB 可用空間

### 推薦配置

- **作業系統**: Windows 11, Ubuntu 20.04+, macOS 12+
- **Python**: 3.10 或以上
- **Node.js**: 18 或以上
- **記憶體**: 8GB RAM
- **硬碟**: 50GB 可用空間

## 🔧 安裝步驟

### 1. 環境準備

```bash
# 檢查 Python 版本
python --version  # 需要 3.8+

# 檢查 Node.js 版本
node --version     # 需要 16+

# 檢查 npm 版本
npm --version
```

### 2. 安裝依賴

```bash
# Python 後端依賴
pip install -r requirements.txt
pip install bcrypt pyotp qrcode cryptography websockets

# 前端依賴
cd cdu-config-ui
npm install
cd ..
```

### 3. 編譯 HAL 層 (可選)

```bash
# Linux/Mac
cd hal
make

# Windows (需要 MinGW 或 Visual Studio)
cd hal
mingw32-make
```

### 4. 啟動系統

使用對應平台的啟動腳本：

```bash
# Linux/Mac
./scripts/start_cdu.sh

# Windows
scripts\start_cdu.bat
```

## 🛑 停止系統

```bash
# Linux/Mac
./scripts/stop_cdu.sh

# Windows  
scripts\stop_cdu.bat

# 或按 Ctrl+C 停止
```

## 📝 日誌檢查

```bash
# 查看系統日誌
tail -f logs/cdu_system.log

# 查看 API 日誌
tail -f logs/main_api.log

# 查看警報日誌
tail -f logs/alarm_api.log

# 查看觸控日誌
tail -f logs/touchscreen.log
```

## 🔍 故障排除

### 常見問題

#### 1. 端口被佔用

```bash
# 檢查端口佔用
netstat -tulpn | grep :8000

# 強制釋放端口 (Linux/Mac)
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /f /pid [PID]
```

#### 2. Python 依賴問題

```bash
# 重新安裝依賴
pip install --force-reinstall -r requirements.txt

# 檢查已安裝套件
pip list | grep fastapi
```

#### 3. 前端無法啟動

```bash
# 清除快取
cd cdu-config-ui
rm -rf node_modules package-lock.json
npm install

# 檢查 Node.js 版本
node --version  # 需要 16+
```

#### 4. HAL 庫問題

```bash
# Linux: 安裝編譯工具
sudo apt-get install build-essential

# 檢查庫文件
ls hal/lib-cdu-hal.*
```

## 🐳 Docker 部署

```bash
# 使用 Docker Compose
docker-compose up -d --build

# 查看服務狀態
docker-compose ps

# 查看日誌
docker logs cdu_service

# 停止服務
docker-compose down
```

## 🔒 安全設定

### 1. 更改預設密碼

1. 登入系統 (admin/admin123)
2. 前往 "System Setting" 標籤
3. 點擊 "變更管理員密碼"
4. 設定強密碼

### 2. 啟用雙因素認證

1. 前往安全設定頁面
2. 掃描 QR Code
3. 輸入 TOTP 驗證碼
4. 確認啟用

### 3. IP 白名單設定

編輯 `config/security_config.json`:

```json
{
  "ip_whitelist": [
    "192.168.100.0/24",
    "10.0.0.0/8"
  ]
}
```

## 📈 效能監控

### 系統監控端點

```bash
# 健康檢查
curl http://localhost:8000/health

# 系統統計
curl http://localhost:8001/redfish/v1/Chassis/CDU_Main/Alarms/Statistics

# 觸控統計
curl http://localhost:8765/stats
```

### 日誌監控

系統自動記錄以下日誌類型：

- **系統日誌** (保留 2 年)
- **API 請求日誌** (保留 30 天)
- **安全事件日誌** (保留 3 年)
- **感測器數據日誌** (保留 3 個月)
- **警報事件日誌** (保留 1 年)

## 🔄 備份與恢復

### 自動備份

系統會自動備份：
- 配置文件
- 使用者數據
- 警報設定
- 日誌文件

備份位置: `backup/` 目錄

### 手動備份

```bash
# 建立完整備份
tar -czf cdu_backup_$(date +%Y%m%d).tar.gz config/ logs/ *.json *.yaml

# 恢復備份
tar -xzf cdu_backup_YYYYMMDD.tar.gz
```

## 📞 技術支援

如需技術支援或遇到問題：

1. 檢查日誌文件: `logs/` 目錄
2. 查看系統狀態: http://localhost:8000/health
3. 檢查配置文件: `config/` 目錄
4. 參考故障排除章節

---

## 🎯 快速測試

啟動系統後，可進行以下測試：

1. **Web 界面測試**: 開啟 http://localhost:5173
2. **API 測試**: 存取 http://localhost:8000/docs
3. **警報測試**: 觸發測試警報
4. **控制測試**: 切換運行模式
5. **日誌測試**: 查看 `logs/` 目錄

享受您的 CDU 控制系統體驗！ 🎉