# 分散式CDU系統 Redfish API 文檔

## 概述

本系統是基於 simple_distributed_main.py 的分散式CDU控制系統，提供Redfish風格的RESTful API接口和完整的警報管理系統。系統運行在端口8001，支持多種感測器類型（溫度、壓力、流量、PLC）以及完整的80種警報代碼監控。

## 感測器配置

系統根據 distributed_cdu_config.yaml 動態載入以下感測器：

### 溫度感測器
- **Temp1-Temp3**: Modbus RTU (COM7) 溫度感測器
- **PLC1-Temp1~PLC1-Temp16**: PLC溫度感測器 (R10111-R10126)

### 壓力感測器
- **Press1-Press2**: Modbus RTU (COM7) 壓力感測器
- **PLC1-Press1~PLC1-Press18**: PLC壓力感測器 (R10081-R10098)

### 流量感測器
- **PLC1-Flow1~PLC1-Flow4**: PLC流量感測器 (R10061-R10064)

### 警報暫存器
| 暫存器 | 警報代碼範圍 | 說明 |
|--------|-------------|------|
| R10001 | A001-A016 | 水泵及內部回水溫度/壓力異常 |
| R10002 | A017-A032 | 內部回水壓力、流量、環境溫度及水位異常 |
| R10003 | A033-A048 | 系統運行壓力、檢漏、通訊異常 |
| R10004 | A049-A064 | 模組、加熱器、感測器線路異常 |
| R10005 | A065-A080 | 感測器線路及比例閥異常 |

## API 端點

### 系統基本信息

#### 系統狀態
```
GET /
GET /health
GET /status
```
返回系統基本信息、健康狀態和運行狀態。

### 感測器管理

#### 所有感測器信息
```
GET /sensors
GET /api/v1/sensors/readings
```
返回所有感測器的即時讀數，包括：
- 溫度感測器：值(°C)、狀態、健康狀況
- 壓力感測器：值(Bar)、狀態、健康狀況
- 流量感測器：值(L/min)、狀態、健康狀況
- PLC感測器：暫存器值、連接狀態

#### 特定感測器詳細信息
```
GET /sensors/{sensor_id}
```
返回指定感測器的詳細信息，包括配置和即時數據。

### PLC管理

#### 所有PLC數據
```
GET /plc
```
返回所有PLC區塊的狀態信息。

#### 特定PLC詳細信息
```
GET /plc/{plc_id}
```
返回指定PLC的詳細信息和連接狀態。

#### PLC暫存器數據
```
GET /plc/{plc_id}/registers
```
返回PLC的D和R暫存器數據：
- **d_registers**: D暫存器數據
- **r_registers**: R暫存器數據
- **connected**: 連接狀態

#### PLC暫存器寫入
```
POST /plc/{plc_id}/write_register
```
寫入單個R暫存器：
```json
{
  "register_address": 10500,
  "value": 123
}
```

#### PLC批量寫入
```
POST /plc/{plc_id}/write_registers_batch
```
批量寫入R暫存器：
```json
{
  "start_address": 10500,
  "values": [123, 456, 789]
}
```

### 警報管理系統 (Redfish風格)

#### 獲取CDU警報暫存器
```
GET /redfish/v1/Systems/CDU1/Oem/CDU/Alarms
```
返回基於R10001-R10005暫存器的完整80種警報代碼狀態。

#### 活躍警報列表
```
GET /redfish/v1/Chassis/CDU_Main/Alarms/
```
支持過濾參數：
- `category`: 警報類別
- `level`: 警報等級
- `limit`: 數量限制

#### 警報確認
```
POST /redfish/v1/Chassis/CDU_Main/Alarms/{alarm_id}/Actions/Acknowledge
```
確認指定警報。

#### 警報統計
```
GET /redfish/v1/Chassis/CDU_Main/Alarms/Statistics
```
返回警報統計信息（活躍、已確認、今日總數等）。

#### 警報歷史
```
GET /redfish/v1/Chassis/CDU_Main/Alarms/History
```
支持時間範圍過濾。

#### SNMP設定
```
PUT /redfish/v1/Chassis/CDU_Main/Alarms/Settings/SNMP
POST /redfish/v1/Chassis/CDU_Main/Alarms/Actions/TestSNMP
```
配置和測試SNMP警報通知。

### 前端整合API

#### 功能區塊配置
```
GET /api/v1/function-blocks/config
```
返回動態載入的功能區塊配置，用於前端動態生成界面。

#### API連接測試
```
GET /api/v1/test
```
用於前端測試API連接狀態。

## 使用範例

### 1. 獲取所有感測器讀數
```bash
curl http://localhost:8001/api/v1/sensors/readings
```

### 2. 檢查特定溫度感測器
```bash
curl http://localhost:8001/sensors/PLC1-Temp1
```

### 3. 獲取PLC暫存器數據
```bash
curl http://localhost:8001/plc/PLC1-Temp1/registers
```

### 4. 檢查活躍警報
```bash
curl http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Alarms
```

### 5. Python範例
```python
import requests
import json

# 獲取所有感測器讀數
response = requests.get('http://localhost:8001/api/v1/sensors/readings')
sensors = response.json()

for sensor in sensors:
    print(f"{sensor['block_id']}: {sensor['value']} {sensor['unit']} ({sensor['status']})")

# 獲取警報狀態
alarm_response = requests.get('http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Alarms')
alarm_data = alarm_response.json()

print(f"活躍警報數量: {len(alarm_data['active_alarms'])}")
print(f"系統狀態: {alarm_data['alarm_summary']['overall_status']}")

# 寫入PLC暫存器
write_data = {"register_address": 10500, "value": 100}
write_response = requests.post('http://localhost:8001/plc/PLC1-Temp1/write_register', 
                              params=write_data)
print(f"寫入結果: {write_response.json()}")
```

## 數據格式

### 感測器數據格式
```json
{
  "block_id": "PLC1-Temp1",
  "block_type": "MitsubishiPLCBlock",
  "value": 25.6,
  "unit": "°C",
  "status": "Enabled",
  "health": "OK",
  "device": null,
  "modbus_address": null,
  "register": 111
}
```

### 警報數據格式
```json
{
  "register_address": 10001,
  "register_value": 6,
  "register_hex": "0x0006",
  "register_binary": "0000000000000110",
  "status_bits": {
    "bit1": {
      "alarm_code": "A002",
      "name": "[A002]水泵[2]異常",
      "description": "0=無故障 1=有故障",
      "value": 1,
      "status": "有故障",
      "active": true
    }
  },
  "active_count": 2
}
```

### 狀態映射
- **感測器狀態**:
  - "Enabled": 正常運行
  - "Connected": PLC已連接但無數據
  - "Disconnected": PLC未連接
  - "Error": 讀取錯誤
- **健康狀況**:
  - "OK": 正常
  - "Warning": 警告
  - "Critical": 嚴重
- **警報等級**:
  - "Normal": 無警報
  - "Minor": 輕微異常
  - "Major": 多項異常
  - "Critical": 嚴重異常

## 配置

### 系統配置
系統配置文件 `distributed_cdu_config.yaml` 包含：

#### 分散式系統設置
```yaml
CDU_System:
  cluster_id: "CDU_CLUSTER_01"
  node_id: "CDU_01"
  total_nodes: 6
  max_capacity_kw: 50
```

#### 感測器區塊配置範例
```yaml
FunctionBlocks:
  - id: PLC1-Temp1
    type: MitsubishiPLCBlock
    ip_address: "10.10.40.8"
    port: 502
    unit_id: 1
    register: 111  # R10111
    
  - id: Temp1
    type: TempSensorBlock
    modbus_address: 4
    device: COM7
    register: 0
```

**注意**: 系統支持動態配置載入，新增感測器後重啟服務即可自動識別。

### API端口和通訊配置
```yaml
Communication:
  api:
    port: 8001
    use_https: false
  modbus_tcp:
    port: 502
    query_interval_ms: 100
  mqtt:
    broker: "mqtt.cdu.local"
    port: 8883
    use_tls: true
```

## 測試

### 啟動系統
```bash
# 使用預設配置啟動
python simple_distributed_main.py

# 指定配置文件啟動
python simple_distributed_main.py distributed_cdu_config.yaml
```

### 運行測試
```bash
# 測試API基本功能
curl http://localhost:8001/api/v1/test

# 測試感測器讀數
curl http://localhost:8001/api/v1/sensors/readings

# 測試警報系統
curl http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Alarms

# 測試PLC連接
python test_live_plc_data.py
```

## 注意事項

1. **多感測器支持**：系統同時支持Modbus RTU (COM7) 和 Modbus TCP (PLC) 通訊
2. **動態配置**：功能區塊配置可動態載入，前端會自動識別新感測器
3. **數據更新頻率**：感測器數據每1秒更新，PLC查詢間隔100ms
4. **警報系統**：支持80種警報代碼，基於R10001-R10005暫存器
5. **容錯機制**：硬體通訊失敗時自動切換為模擬模式
6. **分散式架構**：支持最多6個CDU節點的集群操作
7. **安全認證**：警報管理API需要Bearer Token認證

## 故障排除

### 常見問題

1. **API服務無法啟動**
   - 檢查Python依賴：`pip3 install fastapi uvicorn "pydantic<2" pyyaml pymodbus`
   - 確認端口8001未被占用：`ss -tulln | grep :8001`
   - 檢查配置文件：`distributed_cdu_config.yaml`

2. **感測器數據為0或-1**
   - 檢查HAL庫路徑：確認 `hal/lib-cdu-hal.dll` 存在
   - 檢查COM端口：確認COM7可用且有權限
   - 查看感測器狀態：`curl http://localhost:8001/sensors`

3. **PLC連接失敗**
   - 測試PLC連通性：`ping 10.10.40.8`
   - 檢查Modbus TCP端口：`telnet 10.10.40.8 502`
   - 驗證pymodbus版本：確保使用3.11.0+

4. **警報數據異常**
   - 檢查R10001-R10005暫存器讀取
   - 確認PLC區塊配置正確
   - 查看警報定義是否完整

5. **前端無法連接**
   - 確認API運行在8001端口
   - 檢查CORS設置
   - 測試基本連接：`curl http://localhost:8001/api/v1/test`

### 日誌查看
```bash
# 啟動服務時查看即時日誌
python simple_distributed_main.py distributed_cdu_config.yaml

# 查看HAL通訊日誌
grep "HAL:" <日誌文件>

# 查看PLC連接日誌
grep "PLC" <日誌文件>

# 查看警報系統日誌
grep "alarm" <日誌文件>
```

### 硬體檢查
```bash
# 檢查COM端口
ls -la /dev/ttyS* /dev/ttyUSB*

# 測試PLC連接
python test_live_plc_data.py

# 驗證HAL庫載入
python -c "import ctypes; print(ctypes.CDLL('./hal/lib-cdu-hal.dll'))"
```
