# R暫存器讀取API文檔

## 概述

本文檔描述了CDU系統中新增的R暫存器讀取功能，支援通過Redfish API讀取三菱F5U PLC的R10000-R11000暫存器。

## 功能特性

- ✅ **單個暫存器讀取**: 使用Modbus功能碼03 (Read Holding Registers)
- ✅ **批量暫存器讀取**: 一次讀取多個連續暫存器
- ✅ **地址範圍支援**: R10000-R11000 (對應Modbus地址0-1000)
- ✅ **多種API方式**: POST和GET方式支援
- ✅ **完整錯誤處理**: 詳細的錯誤響應和狀態碼
- ✅ **實時數據**: 直接從PLC讀取最新值

## API端點

### 1. 讀取單個R暫存器 (POST方式)

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/Registers/Read`

**描述**: 使用POST方式讀取單個R暫存器值

**請求格式**:
```json
{
  "register_address": 10000
}
```

**參數說明**:
- `register_address`: R暫存器地址 (10000-11000)

**成功響應**:
```json
{
  "success": true,
  "register_address": 10000,
  "value": 123,
  "modbus_address": 0,
  "timestamp": "2025-07-17T12:05:57.679049",
  "message": "Successfully read R10000 = 123"
}
```

### 2. 讀取單個R暫存器 (GET方式)

**端點**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/Registers/{register_address}`

**描述**: 使用GET方式讀取單個R暫存器值

**URL參數**:
- `register_address`: R暫存器地址 (10000-11000)

**範例**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/Registers/10001`

**成功響應**:
```json
{
  "success": true,
  "register_address": 10001,
  "value": 456,
  "modbus_address": 1,
  "timestamp": "2025-07-17T12:05:59.718306",
  "message": "Successfully read R10001 = 456"
}
```

### 3. 批量讀取R暫存器

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/Registers/ReadBatch`

**描述**: 批量讀取連續的R暫存器值

**請求格式**:
```json
{
  "start_address": 10000,
  "count": 5
}
```

**參數說明**:
- `start_address`: 起始R暫存器地址 (10000-11000)
- `count`: 讀取數量 (1-125)

**成功響應**:
```json
{
  "success": true,
  "start_address": 10000,
  "count": 5,
  "registers": {
    "R10000": {
      "value": 123,
      "register": 10000,
      "modbus_address": 0
    },
    "R10001": {
      "value": 456,
      "register": 10001,
      "modbus_address": 1
    },
    "R10002": {
      "value": 0,
      "register": 10002,
      "modbus_address": 2
    },
    "R10003": {
      "value": 789,
      "register": 10003,
      "modbus_address": 3
    },
    "R10004": {
      "value": 0,
      "register": 10004,
      "modbus_address": 4
    }
  },
  "timestamp": "2025-07-17T12:06:01.764411",
  "message": "Successfully read 5 registers starting from R10000"
}
```

## 地址映射

| R暫存器範圍 | Modbus地址範圍 | 說明 |
|-------------|----------------|------|
| R10000      | 0              | 起始地址 |
| R10001      | 1              | 地址+1 |
| R10500      | 500            | 中間地址 |
| R11000      | 1000           | 結束地址 |

**映射公式**: `Modbus地址 = R暫存器地址 - 10000`

## 使用範例

### Python範例

```python
import requests
import json

base_url = "http://localhost:8001/redfish/v1"

# 1. 讀取單個暫存器 (POST方式)
response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Read",
    json={"register_address": 10000}
)
print("單個讀取 (POST):", response.json())

# 2. 讀取單個暫存器 (GET方式)
response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Registers/10001")
print("單個讀取 (GET):", response.json())

# 3. 批量讀取暫存器
response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/Registers/ReadBatch",
    json={"start_address": 10000, "count": 5}
)
result = response.json()
print("批量讀取:")
for reg_key, reg_info in result['registers'].items():
    print(f"  {reg_key}: {reg_info['value']}")
```

### cURL範例

```bash
# 讀取單個暫存器 (POST方式)
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Registers/Read \
  -H "Content-Type: application/json" \
  -d '{"register_address": 10000}'

# 讀取單個暫存器 (GET方式)
curl -X GET http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Registers/10001

# 批量讀取暫存器
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Registers/ReadBatch \
  -H "Content-Type: application/json" \
  -d '{"start_address": 10000, "count": 5}'
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
         "type": "less_than_equal",
         "loc": ["body", "register_address"],
         "msg": "Input should be less than or equal to 11000",
         "input": 12000
       }
     ]
   }
   ```

2. **數量超出範圍**:
   ```json
   {
     "detail": [
       {
         "type": "less_than_equal",
         "loc": ["body", "count"],
         "msg": "Input should be less than or equal to 125",
         "input": 150
       }
     ]
   }
   ```

3. **PLC讀取失敗**:
   ```json
   {
     "success": false,
     "message": "Failed to read R11000",
     "register_address": 11000,
     "timestamp": "2025-07-17T12:05:57.679049"
   }
   ```

## 性能特性

### 響應時間
- **單個讀取**: ~2秒 (包含網路延遲)
- **批量讀取**: ~2秒 (5個暫存器)
- **GET方式**: ~2秒 (直接讀取)

### 數據限制
- **最大批量讀取**: 125個暫存器 (Modbus協議限制)
- **地址範圍**: R10000-R11000 (1001個暫存器)
- **實時性**: 每次請求都從PLC讀取最新值

## 測試結果

### 成功案例
- ✅ R10000 = 123 (單個讀取)
- ✅ R10001 = 456 (GET方式)
- ✅ R10000-R10004 批量讀取 (5個暫存器)
- ✅ R10500-R10509 大範圍讀取 (10個暫存器)
- ✅ 讀取之前寫入的值 (R10500=1234, R10501=5678)

### 驗證功能
- ✅ 地址範圍驗證 (拒絕R12000)
- ✅ 數量限制驗證 (拒絕150個暫存器)
- ✅ GET方式地址驗證 (拒絕R9999)

## 與寫入功能的整合

### 讀寫一致性
- 寫入的值可以通過讀取API立即讀回
- 支援讀取寫入範圍 (R10500-R10700) 的值
- 實時反映PLC中的實際值

### 地址範圍對比
- **讀取範圍**: R10000-R11000 (1001個暫存器)
- **寫入範圍**: R10500-R10700 (201個暫存器)
- **重疊範圍**: R10500-R10700 (可讀可寫)

## 注意事項

1. **PLC連接**: 確保PLC在10.10.40.8:502可達
2. **地址限制**: 某些高地址 (如R11000) 可能不被PLC支援
3. **實時性**: 每次讀取都是實時從PLC獲取
4. **並發**: 避免同時大量讀取請求

## 版本歷史

- **v1.0** (2025-07-17): 初始版本，支援R10000-R11000讀取功能
