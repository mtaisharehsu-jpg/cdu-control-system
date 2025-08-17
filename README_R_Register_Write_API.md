# R暫存器寫入API文檔

## 概述

本文檔描述了CDU系統中新增的R暫存器寫入功能，支援通過Redfish API寫入三菱F5U PLC的R10500-R10700暫存器。

## 功能特性

- ✅ **單個暫存器寫入**: 使用Modbus功能碼06 (Write Single Holding Register)
- ✅ **批量暫存器寫入**: 使用Modbus功能碼16 (Write Multiple Holding Registers)
- ✅ **地址範圍驗證**: R10500-R10700 (對應Modbus地址500-700)
- ✅ **值範圍驗證**: 0-65535 (16位無符號整數)
- ✅ **錯誤處理**: 完整的錯誤響應和狀態碼
- ✅ **緩存機制**: 寫入值會被緩存以供查詢

## API端點

### 1. 獲取R暫存器信息

**端點**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/Registers`

**描述**: 獲取R暫存器的基本信息和緩存值

**響應範例**:
```json
{
  "register_range": "R10500-R10700",
  "modbus_address_range": "500-700",
  "total_registers": 201,
  "write_support": true,
  "connected": true,
  "write_errors": 0,
  "cached_values": {
    "R10500": 1234,
    "R10501": 5678
  },
  "timestamp": "2025-07-17T11:52:49.363034"
}
```

### 2. 寫入單個R暫存器

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/Registers/Write`

**描述**: 寫入單個R暫存器值

**請求格式**:
```json
{
  "register_address": 10500,
  "value": 1234
}
```

**參數說明**:
- `register_address`: R暫存器地址 (10500-10700)
- `value`: 寫入值 (0-65535)

**成功響應**:
```json
{
  "success": true,
  "message": "Successfully wrote R10500 = 1234",
  "register_address": 10500,
  "value": 1234,
  "timestamp": "2025-07-17T11:52:51.402599"
}
```

**錯誤響應**:
```json
{
  "success": false,
  "message": "Register address 10000 out of range (R10500-R10700)",
  "timestamp": "2025-07-17T11:52:51.402599"
}
```

### 3. 批量寫入R暫存器

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/Registers/WriteBatch`

**描述**: 批量寫入連續的R暫存器值

**請求格式**:
```json
{
  "start_address": 10502,
  "values": [100, 200, 300]
}
```

**參數說明**:
- `start_address`: 起始R暫存器地址 (10500-10700)
- `values`: 寫入值數組，最多201個值

**成功響應**:
```json
{
  "success": true,
  "message": "Successfully wrote 3 registers starting from R10502",
  "start_address": 10502,
  "count": 3,
  "timestamp": "2025-07-17T11:52:55.505047"
}
```

## 地址映射

| R暫存器 | Modbus地址 | 說明 |
|---------|------------|------|
| R10500  | 500        | 起始地址 |
| R10501  | 501        | 地址+1 |
| ...     | ...        | ... |
| R10700  | 700        | 結束地址 |

**映射公式**: `Modbus地址 = R暫存器地址 - 10000`

## 使用範例

### Python範例

```python
import requests
import json

base_url = "http://localhost:8001/redfish/v1"

# 1. 獲取R暫存器信息
response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Registers")
print("R暫存器信息:", response.json())

# 2. 寫入單個暫存器
write_data = {
    "register_address": 10500,
    "value": 1234
}
response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Write",
    json=write_data
)
print("寫入結果:", response.json())

# 3. 批量寫入暫存器
batch_data = {
    "start_address": 10502,
    "values": [100, 200, 300]
}
response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/Registers/WriteBatch",
    json=batch_data
)
print("批量寫入結果:", response.json())
```

### cURL範例

```bash
# 獲取R暫存器信息
curl -X GET http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Registers

# 寫入單個暫存器
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Registers/Write \
  -H "Content-Type: application/json" \
  -d '{"register_address": 10500, "value": 1234}'

# 批量寫入暫存器
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Registers/WriteBatch \
  -H "Content-Type: application/json" \
  -d '{"start_address": 10502, "values": [100, 200, 300]}'
```

## 錯誤處理

### HTTP狀態碼

- `200 OK`: 操作成功
- `400 Bad Request`: PLC操作失敗
- `404 Not Found`: 系統不存在
- `422 Unprocessable Content`: 參數驗證失敗
- `500 Internal Server Error`: 服務器內部錯誤

### 常見錯誤

1. **地址超出範圍**:
   ```json
   {
     "detail": [
       {
         "type": "greater_than_equal",
         "loc": ["body", "register_address"],
         "msg": "Input should be greater than or equal to 10500",
         "input": 10000
       }
     ]
   }
   ```

2. **值超出範圍**:
   ```json
   {
     "detail": [
       {
         "type": "less_than_equal",
         "loc": ["body", "value"],
         "msg": "Input should be less than or equal to 65535",
         "input": 70000
       }
     ]
   }
   ```

3. **PLC連接失敗**:
   ```json
   {
     "success": false,
     "message": "PLC not connected, cannot write register",
     "timestamp": "2025-07-17T11:52:51.402599"
   }
   ```

## 安全考慮

1. **地址限制**: 只允許寫入R10500-R10700範圍的暫存器
2. **值驗證**: 嚴格驗證輸入值範圍 (0-65535)
3. **連接檢查**: 寫入前檢查PLC連接狀態
4. **錯誤記錄**: 所有寫入錯誤都會被記錄

## 配置

在 `distributed_cdu_config.yaml` 中的相關配置：

```yaml
- id: MitsubishiPLC1
  type: MitsubishiPLCBlock
  ip_address: "10.10.40.8"
  port: 502
  unit_id: 1
  start_register: 0        # 讀取用 (R10000對應Modbus地址0)
  register_count: 11       # 讀取11個暫存器
  modbus_start_address: 0  # 讀取起始Modbus地址
  r_start_register: 10500  # 寫入用 (R10500)
  r_register_count: 201    # 寫入201個暫存器 (R10500-R10700)
```

## 測試

運行測試腳本驗證功能：

```bash
python test_r_register_write.py
```

測試包括：
- ✅ 單個暫存器寫入
- ✅ 批量暫存器寫入
- ✅ 地址範圍驗證
- ✅ 值範圍驗證
- ✅ 錯誤處理
- ✅ 緩存機制

## 注意事項

1. **PLC連接**: 確保PLC在10.10.40.8:502可達
2. **權限**: 確保PLC允許寫入R10500-R10700範圍
3. **並發**: 避免同時寫入同一暫存器
4. **備份**: 寫入前建議備份重要設定值

## 版本歷史

- **v1.0** (2025-07-17): 初始版本，支援R10500-R10700寫入功能
