# CDU操作設置API文檔

## 概述

本文檔描述了CDU系統中新增的操作設置API，根據R10501-R10504暫存器實現遠端操作控制功能，包括CDU啟動/停止和風扇控制。

## 功能特性

- ✅ **遠端操作控制**: 支援CDU和風扇的遠端啟動/停止操作
- ✅ **操作狀態監控**: 實時監控各項操作的執行狀態
- ✅ **參數驗證**: 嚴格的操作類型和數值範圍驗證
- ✅ **操作確認**: 寫入後自動驗證操作是否生效
- ✅ **錯誤處理**: 完整的錯誤處理和狀態回報

## 操作設置定義

根據您提供的規格，實現了4種操作設置：

| 序號 | 操作類型 | 數據名稱 | 暫存器 | 數據範圍 | 設計說明 | 功能碼 |
|------|----------|----------|--------|----------|----------|--------|
| 1 | start | 啟動 | R10501 | 2321 | CDU遠端啟動 | 0x06 |
| 2 | stop | 停止 | R10502 | 2322 | CDU遠端停止 | 0x06 |
| 3 | fan_start | 風扇啟動 | R10503 | 2321 | 風扇遠端手動強制啟動 | 0x06 |
| 4 | fan_stop | 風扇停止 | R10504 | 2322 | 風扇遠端手動強制停止 | 0x06 |

## API端點

### 1. 執行操作設置

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/Operations/Execute`

**描述**: 執行CDU操作設置 (啟動/停止/風扇控制)

**請求格式**:
```json
{
  "operation": "start"  // 操作類型: start, stop, fan_start, fan_stop
}
```

**響應範例**:
```json
{
  "success": true,
  "operation": "start",
  "register_address": 10501,
  "value_written": 2321,
  "operation_description": "CDU遠端啟動",
  "status": "操作執行成功",
  "timestamp": "2025-07-18T08:18:41.834392"
}
```

### 2. 獲取操作狀態

**端點**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/Operations`

**描述**: 獲取CDU操作設置狀態

**響應範例**:
```json
{
  "success": true,
  "operations_status": {
    "start": {
      "register_address": 10501,
      "expected_value": 2321,
      "current_value": 2321,
      "is_active": true,
      "description": "CDU遠端啟動",
      "status": "已啟動"
    },
    "stop": {
      "register_address": 10502,
      "expected_value": 2322,
      "current_value": 0,
      "is_active": false,
      "description": "CDU遠端停止",
      "status": "未啟動"
    },
    "fan_start": {
      "register_address": 10503,
      "expected_value": 2321,
      "current_value": 0,
      "is_active": false,
      "description": "風扇遠端手動強制啟動",
      "status": "未啟動"
    },
    "fan_stop": {
      "register_address": 10504,
      "expected_value": 2322,
      "current_value": 0,
      "is_active": false,
      "description": "風扇遠端手動強制停止",
      "status": "未啟動"
    }
  },
  "timestamp": "2025-07-18T08:18:41.834392"
}
```

## 響應字段說明

### 執行操作響應
- `success`: 操作是否成功
- `operation`: 執行的操作類型
- `register_address`: 目標暫存器地址
- `value_written`: 寫入的數值
- `operation_description`: 操作描述
- `status`: 操作執行狀態
- `timestamp`: 執行時間戳

### 操作狀態響應
每個操作包含以下信息：
- `register_address`: 暫存器地址
- `expected_value`: 預期的啟動值
- `current_value`: 當前暫存器值
- `is_active`: 是否處於啟動狀態
- `description`: 操作描述
- `status`: 狀態文字 (已啟動/未啟動/讀取失敗)

## 操作邏輯

### 操作執行流程
1. **參數驗證**: 檢查操作類型是否支援
2. **數值寫入**: 將對應的數值寫入指定暫存器
3. **操作確認**: 讀取暫存器確認寫入是否成功
4. **狀態回報**: 返回操作執行結果

### 狀態判斷邏輯
```python
def is_operation_active(current_value, expected_value):
    return current_value == expected_value

# 範例:
# R10501 = 2321 → CDU啟動已啟動
# R10502 = 2322 → CDU停止已執行
# R10503 = 2321 → 風扇啟動已啟動
# R10504 = 2322 → 風扇停止已執行
```

## 使用範例

### Python範例

```python
import requests
import json

base_url = "http://localhost:8001/redfish/v1"

# 1. 執行CDU啟動
response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/Operations/Execute",
    json={"operation": "start"},
    headers={"Content-Type": "application/json"}
)

if response.status_code == 200:
    result = response.json()
    print(f"✅ {result['operation_description']} 執行成功")
    print(f"寫入值: {result['value_written']} 到 R{result['register_address']}")
else:
    print(f"❌ 操作失敗: {response.text}")

# 2. 檢查操作狀態
status_response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Operations")
if status_response.status_code == 200:
    status_result = status_response.json()
    
    for op_name, op_info in status_result['operations_status'].items():
        status_icon = "🟢" if op_info['is_active'] else "⚪"
        print(f"{status_icon} {op_name}: {op_info['description']} - {op_info['status']}")
```

### cURL範例

```bash
# 執行CDU啟動
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Operations/Execute \
  -H "Content-Type: application/json" \
  -d '{"operation": "start"}'

# 執行風扇啟動
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Operations/Execute \
  -H "Content-Type: application/json" \
  -d '{"operation": "fan_start"}'

# 獲取操作狀態
curl -X GET http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Operations

# 執行CDU停止
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Operations/Execute \
  -H "Content-Type: application/json" \
  -d '{"operation": "stop"}'
```

### 操作序列範例

```python
import requests
import time

def execute_operation_sequence():
    """執行操作序列"""
    base_url = "http://localhost:8001/redfish/v1"
    
    operations = [
        ("start", "啟動CDU"),
        ("fan_start", "啟動風扇"),
        ("fan_stop", "停止風扇"),
        ("stop", "停止CDU")
    ]
    
    for operation, description in operations:
        print(f"執行: {description}")
        
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Operations/Execute",
            json={"operation": operation}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {result['status']}")
        else:
            print(f"❌ 失敗: {response.text}")
        
        time.sleep(2)  # 等待操作生效
```

## 錯誤處理

### HTTP狀態碼
- `200 OK`: 操作成功
- `400 Bad Request`: 參數錯誤或操作失敗
- `404 Not Found`: 系統不存在
- `500 Internal Server Error`: 服務器內部錯誤

### 常見錯誤
```json
// 不支援的操作類型
{
  "detail": "不支援的操作類型: invalid_operation"
}

// 寫入失敗
{
  "detail": "寫入失敗: Failed to write R10501"
}

// 讀取失敗
{
  "detail": "Failed to read R10501"
}
```

## 測試結果

### API功能驗證
- ✅ **操作狀態獲取**: API正常返回所有操作的狀態信息
- ✅ **參數驗證**: 正確拒絕無效的操作類型
- ✅ **錯誤處理**: 完整的錯誤信息和狀態碼
- ✅ **數據格式**: JSON響應格式正確

### 操作類型驗證
- ✅ `start`: CDU遠端啟動 (R10501 = 2321)
- ✅ `stop`: CDU遠端停止 (R10502 = 2322)
- ✅ `fan_start`: 風扇遠端手動強制啟動 (R10503 = 2321)
- ✅ `fan_stop`: 風扇遠端手動強制停止 (R10504 = 2322)

### 無效操作拒絕
- ✅ 正確拒絕 `invalid_op`
- ✅ 正確拒絕 `restart`
- ✅ 正確拒絕 `emergency_stop`
- ✅ 正確拒絕空字符串

## 應用場景

### 1. 遠端控制
- 遠端啟動/停止CDU系統
- 遠端控制風扇運行
- 緊急停止操作

### 2. 自動化控制
- 基於溫度的自動風扇控制
- 定時啟停操作
- 故障自動停機

### 3. 運維管理
- 維護期間的系統控制
- 節能模式切換
- 系統狀態監控

## 注意事項

1. **操作安全**: 執行操作前請確認系統狀態
2. **PLC連接**: 需要確保PLC在10.10.40.8:502可達
3. **操作確認**: 建議執行操作後檢查狀態確認
4. **並發控制**: 避免同時執行衝突的操作

## 版本歷史

- **v1.0** (2025-07-18): 初始版本，支援4種基本操作設置
