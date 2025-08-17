# 三菱PLC R暫存器寫入API使用指南

## 📋 概述

本文檔說明如何使用CDU系統的API來寫入三菱F5U PLC的R暫存器。

### 🎯 支援功能
- **讀取D暫存器**: D900-D910 (功能碼03 - Read Holding Registers)
- **寫入R暫存器**: R10500-R10700 (功能碼06/16 - Write Registers)
- **地址映射**: R10500對應Modbus地址500

## 🔧 API端點

### 1. 檢查PLC狀態
```bash
GET /plc/MitsubishiPLC1
```

**回應範例**:
```json
{
  "ip_address": "10.10.40.8",
  "port": 502,
  "connected": true,
  "status": "Connected",
  "health": "OK",
  "d_register_count": 11,
  "r_register_count": 16,
  "connection_errors": 0,
  "write_errors": 0,
  "r_register_range": "R10500-R10700",
  "r_modbus_address_range": "500-700"
}
```

### 2. 讀取所有暫存器
```bash
GET /plc/MitsubishiPLC1/registers
```

**回應範例**:
```json
{
  "plc_id": "MitsubishiPLC1",
  "timestamp": "2025-07-17T08:40:57.577",
  "connected": true,
  "d_registers": {
    "D0": 13,
    "D1": 1105,
    "D2": 1,
    "D3": 0,
    "D4": 64,
    "D5": 0,
    "D6": 543,
    "D7": 2321,
    "D8": 5678,
    "D9": 0,
    "D10": 100
  },
  "r_registers": {
    "R10500": 123,
    "R10501": 200,
    "R10502": 300,
    "R10510": 10,
    "R10511": 20,
    "R10512": 30,
    "R10513": 40,
    "R10514": 50
  }
}
```

### 3. 寫入單個R暫存器
```bash
POST /plc/MitsubishiPLC1/write_register?register_address=10500&value=123
```

**參數**:
- `register_address`: R暫存器地址 (10500-10700)
- `value`: 要寫入的值 (0-65535)

**回應範例**:
```json
{
  "plc_id": "MitsubishiPLC1",
  "register": "R10500",
  "value": 123,
  "status": "success",
  "timestamp": "2025-07-17T08:40:14.021316"
}
```

### 4. 批量寫入R暫存器
```bash
POST /plc/MitsubishiPLC1/write_registers_batch
Content-Type: application/json

{
  "start_address": 10510,
  "values": [10, 20, 30, 40, 50]
}
```

**回應範例**:
```json
{
  "plc_id": "MitsubishiPLC1",
  "start_register": "R10510",
  "end_register": "R10514",
  "count": 5,
  "values": [10, 20, 30, 40, 50],
  "status": "success",
  "timestamp": "2025-07-17T08:40:27.505022"
}
```

## 💻 程式範例

### Python範例

#### 1. 寫入單個暫存器
```python
import requests

# 寫入R10500 = 123
response = requests.post(
    'http://localhost:8000/plc/MitsubishiPLC1/write_register',
    params={'register_address': 10500, 'value': 123}
)

if response.status_code == 200:
    result = response.json()
    print(f"✅ 成功寫入 {result['register']} = {result['value']}")
else:
    print(f"❌ 寫入失敗: {response.text}")
```

#### 2. 批量寫入暫存器
```python
import requests

# 批量寫入R10510-R10514
data = {
    "start_address": 10510,
    "values": [10, 20, 30, 40, 50]
}

response = requests.post(
    'http://localhost:8000/plc/MitsubishiPLC1/write_registers_batch',
    json=data
)

if response.status_code == 200:
    result = response.json()
    print(f"✅ 成功批量寫入 {result['count']} 個暫存器")
    print(f"範圍: {result['start_register']} - {result['end_register']}")
else:
    print(f"❌ 批量寫入失敗: {response.text}")
```

#### 3. 讀取暫存器狀態
```python
import requests

# 讀取所有暫存器
response = requests.get('http://localhost:8000/plc/MitsubishiPLC1/registers')

if response.status_code == 200:
    data = response.json()
    
    print("📊 D暫存器 (讀取):")
    for reg, value in data['d_registers'].items():
        print(f"  {reg}: {value}")
    
    print("📝 R暫存器 (寫入):")
    for reg, value in data['r_registers'].items():
        print(f"  {reg}: {value}")
else:
    print(f"❌ 讀取失敗: {response.text}")
```

### PowerShell範例

#### 1. 寫入單個暫存器
```powershell
# 寫入R10500 = 456
$response = Invoke-RestMethod -Uri "http://localhost:8000/plc/MitsubishiPLC1/write_register" `
    -Method POST `
    -Body @{register_address=10500; value=456}

Write-Host "✅ 成功寫入 $($response.register) = $($response.value)"
```

#### 2. 批量寫入暫存器
```powershell
# 批量寫入
$body = @{
    start_address = 10520
    values = @(100, 200, 300)
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/plc/MitsubishiPLC1/write_registers_batch" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

Write-Host "✅ 成功批量寫入 $($response.count) 個暫存器"
```

## ⚠️ 注意事項

1. **地址範圍**: 只能寫入R10500-R10700範圍的暫存器
2. **數值範圍**: 暫存器值必須在0-65535之間
3. **連接狀態**: 確保PLC已連接才能進行寫入操作
4. **錯誤處理**: 檢查API回應狀態碼和錯誤訊息
5. **日誌記錄**: 所有寫入操作都會記錄到系統日誌中

## 🔍 故障排除

### 常見錯誤

1. **404 Not Found**: PLC ID不存在
2. **400 Bad Request**: 暫存器地址超出範圍
3. **500 Internal Server Error**: PLC連接問題或Modbus通信錯誤

### 檢查步驟

1. 確認PLC連接狀態: `GET /plc/MitsubishiPLC1`
2. 檢查系統健康狀態: `GET /health`
3. 查看錯誤日誌: `python log_viewer.py --type errors`

## 📈 監控和日誌

系統會自動記錄所有R暫存器寫入操作到日誌文件：
- **系統日誌**: `log/YYYY-MM-DD/system/cdu_system.log`
- **API日誌**: `log/YYYY-MM-DD/api/api_requests.log`
- **錯誤日誌**: `log/YYYY-MM-DD/errors/error.log`

使用日誌查看工具：
```bash
# 查看今日API日誌
python log_viewer.py --type api

# 搜索寫入操作
python log_viewer.py --search "write"
```
