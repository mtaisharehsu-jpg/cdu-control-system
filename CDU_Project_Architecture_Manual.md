# CDU控制系統專案架構說明手冊
*Coolant Distribution Unit Control System - Project Architecture Manual*

## 版本資訊
- **版本**: 2.0
- **最後更新**: 2025-08-05
- **專案狀態**: 生產就緒
- **主要開發語言**: Python 3.8+, TypeScript/React, C

---

## 1. 專案概覽

### 1.1 系統簡介
CDU控制系統是一個工業級冷卻液分配單元控制平台，採用現代化三層架構設計，支援分散式部署和高可用性。系統主要用於控制工業環境中的冷卻設備，包括泵浦、感測器、閥門等硬體設備。

### 1.2 核心特色
- **三層架構**: 表示層(API)、邏輯層(Engine)、硬體抽象層(HAL)
- **分散式設計**: 支援多節點集群部署，具備自動故障轉移
- **即時監控**: 提供即時感測器數據監控和警報系統
- **Web界面**: 現代化React前端界面，支援響應式設計
- **多協議支援**: Modbus TCP/RTU、RS-485、MQTT、RESTful API
- **容器化部署**: 支援Docker容器化部署

---

## 2. 系統架構

### 2.1 整體架構圖
```
┌─────────────────────────────────────────────────────────────┐
│                    CDU Control System                       │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer (表示層)                               │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  React Web UI   │  │  FastAPI Server │                  │
│  │  (TypeScript)   │  │  (Python)       │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Logic Layer (邏輯層)                                      │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Engine.py      │  │  Function       │                  │
│  │  (Control Loop) │  │  Blocks         │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Hardware Abstraction Layer (硬體抽象層)                   │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  HAL C Library  │  │  Communication  │                  │
│  │  (hal/*.c)      │  │  Protocols      │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 三層架構詳解

#### 2.2.1 表示層 (Presentation Layer)
**主要檔案**: `main_api.py`, `simple_distributed_main.py`, `cdu-config-ui/`

**功能**:
- **FastAPI REST Server**: 提供RESTful API服務
- **React Web Interface**: 現代化Web用戶界面
- **API路由管理**: 統一的API端點管理
- **認證與授權**: 用戶認證和權限控制
- **即時數據展示**: WebSocket/HTTP長輪詢支援

**關鍵組件**:
```python
# API服務器入口點
simple_distributed_main.py → SimplifiedDistributedCDUAPI
├── FastAPI應用初始化
├── CORS中間件配置  
├── API路由註冊
└── 背景服務啟動
```

#### 2.2.2 邏輯層 (Logic Layer)
**主要檔案**: `engine.py`, `distributed_engine.py`, `blocks/`

**功能**:
- **控制引擎**: 核心控制循環和狀態管理
- **功能區塊**: 模組化的設備控制邏輯
- **數據處理**: 感測器數據處理和計算
- **警報管理**: 故障檢測和警報處理
- **負載均衡**: 分散式系統負載分配

**功能區塊架構**:
```
blocks/
├── base_block.py          # 抽象基類
├── temp_sensor.py         # 溫度感測器
├── press_sensor.py        # 壓力感測器  
├── pump_vfd.py           # 變頻器控制
├── mitsubishi_plc.py      # 三菱PLC通信
├── liquid_level_sensor.py # 液位感測器
└── plc_connection_pool.py # PLC連接池管理
```

#### 2.2.3 硬體抽象層 (Hardware Abstraction Layer)
**主要檔案**: `hal/`

**功能**:
- **硬體通信**: 統一的硬體通信接口
- **協議支援**: Modbus、RS-485等協議實現
- **設備驅動**: 各種工業設備的驅動程式
- **錯誤處理**: 硬體通信錯誤處理和重試機制

**HAL結構**:
```
hal/
├── hal_modbus.c/.h        # Modbus通信實現
├── hal_uart.c/.h          # UART/RS485通信
├── lib-cdu-hal.dll        # Windows動態庫
├── lib-cdu-hal.so         # Linux共享庫
└── Makefile              # 編譯配置
```

---

## 3. 核心模組詳解

### 3.1 分散式引擎 (Distributed Engine)

#### 主要檔案
- `distributed_engine.py`: 分散式控制引擎
- `distributed_cdu_config.yaml`: 系統配置檔案

#### 核心功能
1. **集群管理**: 支援多節點CDU集群
2. **Raft共識**: 實現分散式一致性算法
3. **負載均衡**: 動態負載分配和調度
4. **故障轉移**: 自動故障檢測和恢復

#### 配置結構
```yaml
CDU_System:
  cluster_id: "CDU_CLUSTER_01"
  node_id: "CDU_01"
  total_nodes: 6
  max_capacity_kw: 50

Raft:
  heartbeat_interval_ms: 50
  election_timeout_ms: 150
  log_replication_timeout_ms: 100

Communication:
  can_bus: {...}
  modbus_tcp: {...}
  mqtt: {...}
  api: {...}
```

### 3.2 PLC通信系統

#### 連接池架構
**檔案**: `blocks/plc_connection_pool.py`

**特色**:
- **單例模式**: 全局統一的連接池管理
- **連接限制**: 每個PLC主機最多3個連接
- **批量讀取**: 優化的批量暫存器讀取
- **自動清理**: 閒置連接自動回收

```python
class PLCConnectionPool:
    def __init__(self):
        self.connections: Dict[str, ModbusTcpClient] = {}
        self.connection_locks: Dict[str, Lock] = {}
        self.max_connections_per_host = 3
        
    def batch_read_registers(self, ip_address, port, unit_id, register_list):
        # 批量讀取邏輯
        pass
```

#### 三菱PLC整合
**檔案**: `blocks/mitsubishi_plc.py`

**功能**:
- **自動類型檢測**: 根據區塊ID自動判斷感測器類型
- **多界面兼容**: temperature、pressure、flow輸出屬性
- **暫存器管理**: R/D暫存器讀寫操作
- **連接池整合**: 使用連接池優化通信效率

### 3.3 前端界面系統

#### 技術棧
- **React 18**: 現代化前端框架
- **TypeScript**: 類型安全的JavaScript
- **Material-UI**: 企業級UI組件庫
- **Vite**: 高效能建構工具

#### 目錄結構
```
cdu-config-ui/
├── src/
│   ├── components/        # 可重用組件
│   │   ├── tabs/         # 功能頁籤組件
│   │   └── layout/       # 版面配置組件
│   ├── contexts/         # React Context狀態管理
│   ├── features/         # 功能模組
│   ├── api/             # API服務層
│   └── services/        # 業務邏輯服務
```

#### 關鍵功能
1. **即時監控**: StatusTab - 感測器即時數據顯示
2. **機種管理**: ModelList - 機種配置增刪改查
3. **系統設定**: 各種系統參數配置
4. **數據視覺化**: 圖表和儀表板展示

---

## 4. 通信協議與接口

### 4.1 支援的通信協議

#### Modbus TCP/RTU
- **用途**: PLC設備通信
- **端口**: 502 (TCP)
- **設備**: 三菱F5U PLC
- **功能碼**: 03(讀取)、06(單寫)、16(批寫)

#### RS-485
- **用途**: 感測器通信
- **波特率**: 9600/19200 bps
- **設備**: 溫度/壓力感測器
- **協議**: Custom或標準Modbus RTU

#### MQTT
- **Broker**: mqtt.cdu.local:8883
- **用途**: 分散式節點間通信
- **主題**:
  - `cdu/status`: 狀態發佈
  - `cdu/commands`: 命令分發
  - `cdu/metrics`: 效能指標

#### RESTful API
- **端口**: 8001
- **協議**: HTTP/HTTPS
- **格式**: JSON
- **認證**: Bearer Token (可選)

### 4.2 API端點架構

#### 核心API端點
```
GET  /health                    # 健康檢查
GET  /status                    # 系統狀態
GET  /sensors                   # 所有感測器
GET  /sensors/{id}              # 特定感測器
GET  /plc                       # PLC數據
POST /plc/{id}/write_register   # 寫入暫存器
```

#### 前端整合API
```
GET  /api/v1/test                    # 連接測試
GET  /api/v1/sensors/readings       # 感測器讀數
GET  /api/v1/function-blocks/config # 功能區塊配置
```

---

## 5. 配置系統

### 5.1 系統配置檔案

#### distributed_cdu_config.yaml
```yaml
# 系統級配置
CDU_System:
  cluster_id: "CDU_CLUSTER_01"
  node_id: "CDU_01"
  total_nodes: 6

# 功能區塊配置
FunctionBlocks:
  - id: PLC1-Temp1
    type: MitsubishiPLCBlock
    ip_address: "10.10.40.8"
    register: 111
```

#### cdu_config.yaml
```yaml
# 單機版配置
system:
  name: "CDU Control System"
  version: "2.0"

blocks:
  - id: Temp1
    type: TempSensorBlock
    device: COM7
    modbus_address: 4
```

### 5.2 機種配置系統

#### 檔案位置
- `cdu_machine_configs.json`: 機種配置數據
- `cdu_current_machine.json`: 當前選擇的機種

#### 配置結構
```json
{
  "machine_configs": {
    "distributed_model": {
      "machine_name": "分散式模型",
      "description": "支援分散式功能區塊",
      "sensor_config": {
        "temperature": {
          "sensors": {...}
        },
        "pressure": {
          "sensors": {...}
        }
      }
    }
  }
}
```

---

## 6. 部署與運維

### 6.1 Docker容器化

#### 核心檔案
- `Dockerfile`: 容器映像定義
- `docker-compose.yml`: 服務編排配置

#### 容器服務
```yaml
version: '3.8'
services:
  cdu-service:
    build: .
    ports:
      - "8001:8001"
    volumes:
      - ./logs:/app/logs
    environment:
      - CDU_NODE_ID=CDU_01
```

### 6.2 啟動腳本

#### Windows
```batch
# scripts/start_cdu.bat
@echo off
echo Starting CDU Control System...
docker-compose up -d --build
```

#### Linux
```bash
# scripts/start_cdu.sh
#!/bin/bash
echo "Starting CDU Control System..."
docker-compose up -d --build
```

### 6.3 日誌系統

#### 日誌結構
```
logs/
├── system/           # 系統日誌
├── api/             # API請求日誌
├── plc/             # PLC通信日誌
├── sensors/         # 感測器數據日誌
└── errors/          # 錯誤日誌
```

#### 日誌管理
- **自動輪轉**: 按日期自動輪轉日誌檔案
- **結構化記錄**: JSON格式結構化日誌
- **等級分類**: DEBUG/INFO/WARNING/ERROR/CRITICAL

---

## 7. 開發指南

### 7.1 開發環境設置

#### 後端環境
```bash
# Python環境
python -m venv venv
source venv/bin/activate  # Linux
# 或 venv\Scripts\activate.bat  # Windows

# 安裝依賴
pip install -r requirements.txt
```

#### 前端環境
```bash
cd cdu-config-ui/
npm install
npm run dev  # 開發服務器
```

#### HAL編譯
```bash
cd hal/
make  # Linux
# 或使用Visual Studio編譯 (Windows)
```

### 7.2 新增功能區塊

#### 步驟
1. **繼承BaseBlock**: 創建新的功能區塊類
2. **實現interface**: 實現必要的方法和屬性
3. **配置註冊**: 在配置檔案中添加區塊定義
4. **API整合**: 在API層添加對應端點

#### 範例
```python
from blocks.base_block import BaseBlock

class NewSensorBlock(BaseBlock):
    def __init__(self, block_id, config):
        super().__init__(block_id, config)
        # 初始化邏輯
        
    def update(self):
        # 更新邏輯
        pass
        
    @property
    def output_value(self):
        # 輸出屬性
        return self._value
```

### 7.3 測試框架

#### 測試檔案
```
test_*.py檔案:
├── test_cdu_status.py      # 狀態測試
├── test_plc_connection.py  # PLC連接測試
├── test_sensors.py         # 感測器測試
└── test_api.py            # API測試
```

#### 執行測試
```bash
# 運行所有測試
python -m pytest test_*.py -v

# 運行特定測試
python test_cdu_status.py
```

---

## 8. 故障排除

### 8.1 常見問題

#### PLC連接問題
**症狀**: PLC顯示"Disconnected"
**解決**:
1. 檢查網路連接和IP設定
2. 驗證Modbus TCP端口(502)
3. 檢查防火牆設定
4. 查看PLC連接池狀態

#### 前端數據不同步
**症狀**: 前端顯示數值與API不一致
**解決**:
1. 檢查API端點響應
2. 清除瀏覽器快取
3. 重啟前端開發服務器
4. 檢查WebSocket連接

#### 容器啟動失敗
**症狀**: Docker容器無法啟動
**解決**:
1. 檢查Docker日誌: `docker logs cdu_service`
2. 驗證端口佔用: `netstat -an | grep 8001`
3. 檢查配置檔案語法
4. 重建容器映像

### 8.2 除錯工具

#### 內建診斷
- **健康檢查**: `GET /health`
- **系統狀態**: `GET /status`
- **連接測試**: `GET /api/v1/test`

#### 日誌查看工具
```bash
# 查看即時日誌
tail -f logs/system/system_log.dat

# 查看API請求日誌
tail -f logs/api/api_log.log

# 查看錯誤日誌
tail -f logs/errors/error.log
```

---

## 9. 安全性考量

### 9.1 網路安全
- **HTTPS支援**: 生產環境強制使用HTTPS
- **CORS配置**: 嚴格的跨域請求控制
- **API速率限制**: 防止DDoS攻擊
- **輸入驗證**: 所有輸入數據驗證

### 9.2 設備安全
- **Modbus安全**: PLC通信加密 (可選)
- **設備認證**: 設備身份驗證機制
- **存取控制**: 基於角色的存取控制 (RBAC)
- **審計日誌**: 完整的操作審計追蹤

---

## 10. 效能優化

### 10.1 系統效能
- **連接池**: PLC連接池減少連接開銷
- **批量操作**: 批量暫存器讀寫
- **快取機制**: 感測器數據快取
- **非同步處理**: 非阻塞I/O操作

### 10.2 前端效能
- **程式碼分割**: 動態載入減少初始載入時間
- **數據虛擬化**: 大數據集虛擬化顯示
- **記憶體管理**: 防止記憶體洩漏
- **載入優化**: 圖片和資源懶載入

---

## 11. 版本歷史

### Version 2.0 (Current)
- 分散式系統支援
- PLC連接池優化
- React前端重構
- Docker容器化部署

### Version 1.0
- 基礎三層架構
- 單機版部署
- 基本感測器支援
- Web API實現

---

## 12. 結語

CDU控制系統是一個成熟的工業控制平台，具備高可靠性、可擴展性和易維護性。通過模組化設計和現代化技術棧，系統能夠滿足各種工業控制需求，並支援未來的功能擴展和技術升級。

如需更多技術細節或支援，請參考各模組的詳細文檔或聯繫開發團隊。

---

*本文檔持續更新中，最新版本請參考專案倉庫。*