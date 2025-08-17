# CDU數值寫入API文檔

## 概述

本文檔描述了CDU系統中新增的數值寫入API，根據R10601-R10608暫存器實現溫度、流量、轉速等參數的精確設定功能。

## 功能特性

- ✅ **精確數值設定**: 支援溫度、流量、風扇和水泵轉速的精確設定
- ✅ **自動數值轉換**: 自動將實際單位值轉換為暫存器值
- ✅ **範圍驗證**: 嚴格的數值範圍檢查和驗證
- ✅ **精度控制**: 支援不同參數的精度設定 (0.1℃, 1%)
- ✅ **狀態監控**: 實時監控各參數的設定狀態
- ✅ **寫入確認**: 自動驗證寫入結果的準確性

## 數值設定定義

根據您提供的規格，實現了5種數值設定：

| 序號 | 參數名稱 | 暫存器 | 數據精度 | 數值範圍 | 暫存器範圍 | 單位 | 設計說明 | 功能碼 |
|------|----------|--------|----------|----------|------------|------|----------|--------|
| 101 | temp_setting | R10601 | 0.1 | 0-60 | 3000-3600 | ℃ | 溫度設定 | 0x06 |
| 102 | flow_setting | R10602 | 0.1 | 0-60 | 3000-3600 | LPM | 流量設定 | 0x06 |
| 106 | fan_speed | R10606 | 1 | 0-100 | 3000-3100 | % | 風扇轉速% | 0x06 |
| 107 | pump1_speed | R10607 | 1 | 0-100 | 3000-3100 | % | 水泵1轉速% | 0x06 |
| 108 | pump2_speed | R10608 | 1 | 0-100 | 3000-3100 | % | 水泵2轉速% | 0x06 |

## 數值轉換邏輯

### 轉換公式
```
暫存器值 = 最小暫存器範圍 + (實際值 / 精度)

範例:
- 溫度 25.5℃ → 3000 + (25.5 / 0.1) = 3255
- 風扇 75% → 3000 + (75 / 1) = 3075
- 流量 30.0 LPM → 3000 + (30.0 / 0.1) = 3300
```

### 反向轉換
```
實際值 = (暫存器值 - 最小暫存器範圍) × 精度

範例:
- 暫存器值 3255 → (3255 - 3000) × 0.1 = 25.5℃
- 暫存器值 3075 → (3075 - 3000) × 1 = 75%
```

## API端點

### 1. 寫入數值設定

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/Values/Write`

**描述**: 寫入CDU數值設定 (溫度/流量/轉速等)

**請求格式**:
```json
{
  "parameter": "temp_setting",  // 參數名稱
  "value": 25.5                 // 設定值 (實際單位值)
}
```

**響應範例**:
```json
{
  "success": true,
  "parameter": "temp_setting",
  "register_address": 10601,
  "input_value": 25.5,
  "register_value": 3255,
  "actual_value": 25.5,
  "unit": "℃",
  "description": "溫度設定",
  "status": "數值寫入成功",
  "timestamp": "2025-07-18T09:01:15.123456"
}
```

### 2. 獲取數值狀態

**端點**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/Values`

**描述**: 獲取CDU數值設定狀態

**響應範例**:
```json
{
  "success": true,
  "values_status": {
    "temp_setting": {
      "register_address": 10601,
      "register_value": 3255,
      "actual_value": 25.5,
      "unit": "℃",
      "description": "溫度設定",
      "status": "正常",
      "value_range": "0.0-60.0 ℃",
      "register_range": "3000-3600"
    },
    "flow_setting": {
      "register_address": 10602,
      "register_value": 3300,
      "actual_value": 30.0,
      "unit": "LPM",
      "description": "流量設定",
      "status": "正常",
      "value_range": "0.0-60.0 LPM",
      "register_range": "3000-3600"
    },
    "fan_speed": {
      "register_address": 10606,
      "register_value": 3075,
      "actual_value": 75.0,
      "unit": "%",
      "description": "風扇轉速%",
      "status": "正常",
      "value_range": "0.0-100.0 %",
      "register_range": "3000-3100"
    }
  },
  "timestamp": "2025-07-18T09:01:15.123456"
}
```

## 響應字段說明

### 寫入響應
- `success`: 操作是否成功
- `parameter`: 參數名稱
- `register_address`: 目標暫存器地址
- `input_value`: 輸入的實際值
- `register_value`: 轉換後的暫存器值
- `actual_value`: 驗證後的實際值
- `unit`: 單位
- `description`: 參數描述
- `status`: 寫入狀態
- `timestamp`: 操作時間戳

### 狀態響應
每個參數包含：
- `register_address`: 暫存器地址
- `register_value`: 當前暫存器值
- `actual_value`: 當前實際值
- `unit`: 單位
- `description`: 參數描述
- `status`: 狀態 (正常/數值異常/讀取失敗)
- `value_range`: 允許的數值範圍
- `register_range`: 暫存器值範圍

## 使用範例

### Python範例

```python
import requests
import json

base_url = "http://localhost:8001/redfish/v1"

# 1. 設定溫度為 25.5℃
response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/Values/Write",
    json={"parameter": "temp_setting", "value": 25.5},
    headers={"Content-Type": "application/json"}
)

if response.status_code == 200:
    result = response.json()
    print(f"✅ {result['description']} 設定成功")
    print(f"設定值: {result['input_value']} {result['unit']}")
    print(f"暫存器值: {result['register_value']}")
else:
    print(f"❌ 設定失敗: {response.text}")

# 2. 設定風扇轉速為 75%
response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/Values/Write",
    json={"parameter": "fan_speed", "value": 75.0}
)

# 3. 檢查所有數值狀態
status_response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Values")
if status_response.status_code == 200:
    status_result = status_response.json()
    
    for param_name, param_info in status_result['values_status'].items():
        print(f"{param_info['description']}: {param_info['actual_value']} {param_info['unit']}")
```

### cURL範例

```bash
# 設定溫度為 30℃
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Values/Write \
  -H "Content-Type: application/json" \
  -d '{"parameter": "temp_setting", "value": 30.0}'

# 設定流量為 45 LPM
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Values/Write \
  -H "Content-Type: application/json" \
  -d '{"parameter": "flow_setting", "value": 45.0}'

# 設定風扇轉速為 80%
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Values/Write \
  -H "Content-Type: application/json" \
  -d '{"parameter": "fan_speed", "value": 80.0}'

# 獲取數值狀態
curl -X GET http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Values
```

### 批量設定範例

```python
def set_cdu_parameters():
    """批量設定CDU參數"""
    base_url = "http://localhost:8001/redfish/v1"
    
    parameters = [
        {"parameter": "temp_setting", "value": 28.5, "description": "設定溫度"},
        {"parameter": "flow_setting", "value": 35.0, "description": "設定流量"},
        {"parameter": "fan_speed", "value": 70.0, "description": "設定風扇轉速"},
        {"parameter": "pump1_speed", "value": 85.0, "description": "設定水泵1轉速"},
        {"parameter": "pump2_speed", "value": 85.0, "description": "設定水泵2轉速"}
    ]
    
    for param in parameters:
        print(f"{param['description']}: {param['value']}")
        
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Values/Write",
            json={"parameter": param["parameter"], "value": param["value"]}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 成功 - 暫存器值: {result['register_value']}")
        else:
            print(f"❌ 失敗: {response.text}")
        
        time.sleep(1)  # 避免過快的連續寫入
```

## 錯誤處理

### HTTP狀態碼
- `200 OK`: 操作成功
- `400 Bad Request`: 參數錯誤或數值超出範圍
- `404 Not Found`: 系統不存在
- `500 Internal Server Error`: 服務器內部錯誤

### 常見錯誤
```json
// 數值超出範圍
{
  "detail": "數值超出範圍: 70.0 (允許範圍: 0.0-60.0 ℃)"
}

// 不支援的參數
{
  "detail": "不支援的參數類型: invalid_parameter"
}

// 寫入失敗
{
  "detail": "寫入失敗: Failed to write R10601"
}
```

## 測試結果

### 數值轉換驗證
- ✅ 溫度 0℃ → 暫存器值 3000
- ✅ 溫度 60℃ → 暫存器值 3600
- ✅ 風扇 0% → 暫存器值 3000
- ✅ 風扇 100% → 暫存器值 3100
- ✅ 流量 30 LPM → 暫存器值 3300

### 數值寫入測試
- ✅ 溫度設定 25.5℃ → 暫存器值 3255 ✅
- ✅ 流量設定 30.0 LPM → 暫存器值 3300 ✅
- ✅ 風扇轉速 75% → 暫存器值 3075 ✅
- ✅ 水泵1轉速 80% → 暫存器值 3080 ✅
- ✅ 水泵2轉速 85% → 暫存器值 3085 ✅

### 範圍驗證測試
- ✅ 正確拒絕溫度 -10℃ (低於範圍)
- ✅ 正確拒絕溫度 70℃ (超出範圍)
- ✅ 正確拒絕風扇 150% (超出範圍)
- ✅ 正確拒絕無效參數名稱

### 數值驗證測試
- ✅ 寫入溫度 45.5℃ 後驗證成功
- ✅ 暫存器值 3455 正確對應實際值 45.5℃

## 應用場景

### 1. 溫度控制
- 精確設定目標溫度
- 溫度調節和控制
- 溫度曲線設定

### 2. 流量控制
- 流量設定和調節
- 流量優化控制
- 流量監控設定

### 3. 設備控制
- 風扇轉速調節
- 水泵轉速控制
- 設備效能優化

## 注意事項

1. **精度限制**: 溫度和流量精度為0.1，轉速精度為1
2. **範圍檢查**: 所有數值都會進行嚴格的範圍檢查
3. **PLC連接**: 需要確保PLC在10.10.40.8:502可達
4. **寫入確認**: 建議寫入後檢查狀態確認設定成功

## 版本歷史

- **v1.0** (2025-07-18): 初始版本，支援5種數值設定功能
