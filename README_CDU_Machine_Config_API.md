# CDU機種配置API文檔

## 概述

本文檔描述了CDU系統中新增的機種配置管理API，能夠透過API設定和管理不同CDU機種的感測器配置，支援多機種動態切換和自定義配置。

## 功能特性

- ✅ **多機種支援**: 支援多種預定義CDU機種配置
- ✅ **動態切換**: 可即時切換不同機種配置
- ✅ **自定義配置**: 支援創建自定義機種配置
- ✅ **配置驗證**: 自動驗證機種配置的完整性
- ✅ **持久化存儲**: 配置自動保存到文件
- ✅ **感測器映射**: 根據機種自動調整感測器定義

## 預定義機種類型

系統提供3種預定義機種配置：

### 1. 標準CDU機種 (default)
- **機種名稱**: 標準CDU機種
- **描述**: 默認的CDU機種配置，包含所有標準感測器
- **感測器總數**: 95個
- **適用場景**: 完整功能的標準CDU系統

### 2. 緊湊型CDU (cdu_compact)
- **機種名稱**: 緊湊型CDU
- **描述**: 緊湊型CDU機種，感測器數量較少
- **感測器總數**: 5個
- **包含感測器**:
  - 溫度: 回水溫度T11, 水箱溫度T12
  - 壓力: 入水壓力P12
  - 流量: 出水流量F2
  - IO: 液位開關X17
- **適用場景**: 小型或簡化的CDU系統

### 3. 高級CDU機種 (cdu_advanced)
- **機種名稱**: 高級CDU機種
- **描述**: 高級CDU機種，包含額外的感測器和功能
- **感測器總數**: 13個
- **包含感測器**:
  - 溫度: T11, T12, T13, T14 (環境溫度)
  - 壓力: P12, P13, P14 (系統壓力)
  - 流量: F2, F3 (旁通流量)
  - IO: X17, X16, Y17, Y18 (警報輸出)
- **適用場景**: 高端或複雜的CDU系統

## API端點

### 1. 獲取所有機種配置

**端點**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/MachineConfig`

**描述**: 獲取所有可用的CDU機種配置

**響應範例**:
```json
{
  "success": true,
  "machine_configs": {
    "default": {
      "machine_name": "標準CDU機種",
      "description": "默認的CDU機種配置，包含所有標準感測器",
      "sensor_config": { ... },
      "created_time": "2025-07-21T14:45:30.123456",
      "updated_time": "2025-07-21T14:45:30.123456"
    },
    "cdu_compact": {
      "machine_name": "緊湊型CDU",
      "description": "緊湊型CDU機種，感測器數量較少",
      "sensor_config": { ... }
    }
  },
  "current_machine": "cdu_compact",
  "total_machines": 3,
  "timestamp": "2025-07-21T14:45:30.123456"
}
```

### 2. 創建機種配置

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/MachineConfig`

**描述**: 創建新的CDU機種配置

**請求格式**:
```json
{
  "machine_type": "cdu_custom",
  "machine_name": "自定義CDU機種",
  "description": "用戶自定義的CDU機種配置",
  "sensor_config": {
    "temperature": {
      "name": "溫度訊息",
      "sensors": {
        "custom_temp": {
          "register": 10111,
          "description": "自定義溫度",
          "precision": 0.1,
          "range": "100~800 (對應10~80℃)",
          "unit": "℃",
          "min_raw": 100,
          "max_raw": 800,
          "min_actual": 10.0,
          "max_actual": 80.0,
          "conversion_factor": 0.1
        }
      }
    },
    "pressure": { ... },
    "flow": { ... },
    "io": { ... }
  }
}
```

### 3. 設定當前機種

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/MachineConfig/Set`

**描述**: 設定當前使用的CDU機種

**請求格式**:
```json
{
  "machine_type": "cdu_compact"
}
```

**響應範例**:
```json
{
  "success": true,
  "machine_type": "cdu_compact",
  "machine_name": "緊湊型CDU",
  "message": "當前機種已設定為 cdu_compact",
  "timestamp": "2025-07-21T14:45:30.123456"
}
```

### 4. 刪除機種配置

**端點**: `DELETE /redfish/v1/Systems/CDU1/Oem/CDU/MachineConfig/{machine_type}`

**描述**: 刪除指定的CDU機種配置

**注意**: 無法刪除當前正在使用的機種

## 配置文件

系統使用兩個JSON文件來存儲配置：

### 1. 機種配置文件 (cdu_machine_configs.json)
```json
{
  "default": {
    "machine_name": "標準CDU機種",
    "description": "默認的CDU機種配置",
    "sensor_config": { ... },
    "created_time": "2025-07-21T14:45:30.123456",
    "updated_time": "2025-07-21T14:45:30.123456"
  }
}
```

### 2. 當前機種配置文件 (cdu_current_machine.json)
```json
{
  "current_machine": "cdu_compact",
  "set_time": "2025-07-21T14:45:30.123456"
}
```

## 使用範例

### Python範例

```python
import requests
import json

base_url = "http://localhost:8001/redfish/v1"

# 1. 獲取所有機種配置
response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig")
result = response.json()

print(f"當前機種: {result['current_machine']}")
print(f"可用機種: {list(result['machine_configs'].keys())}")

# 2. 切換到緊湊型CDU
response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig/Set",
    json={"machine_type": "cdu_compact"}
)

if response.status_code == 200:
    print("✅ 成功切換到緊湊型CDU")

# 3. 創建自定義機種
custom_config = {
    "machine_type": "my_cdu",
    "machine_name": "我的CDU",
    "description": "自定義CDU配置",
    "sensor_config": {
        "temperature": {
            "name": "溫度訊息",
            "sensors": {
                "main_temp": {
                    "register": 10111,
                    "description": "主要溫度",
                    "precision": 0.1,
                    "unit": "℃",
                    "min_raw": 100,
                    "max_raw": 800,
                    "min_actual": 10.0,
                    "max_actual": 80.0,
                    "conversion_factor": 0.1
                }
            }
        },
        "pressure": {"name": "壓力訊息", "sensors": {}},
        "flow": {"name": "流量訊息", "sensors": {}},
        "io": {"name": "輸入輸出訊息", "sensors": {}}
    }
}

response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig",
    json=custom_config
)

if response.status_code == 200:
    print("✅ 自定義機種創建成功")
```

### cURL範例

```bash
# 獲取機種配置
curl -X GET http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/MachineConfig

# 切換機種
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/MachineConfig/Set \
  -H "Content-Type: application/json" \
  -d '{"machine_type": "cdu_advanced"}'

# 刪除機種配置
curl -X DELETE http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/MachineConfig/my_cdu
```

## 測試結果

### 實際測試數據

**機種切換測試**:
- ✅ 緊湊型CDU: 5個感測器 (正常:4, 錯誤:1)
- ✅ 高級CDU: 13個感測器 (正常:7, 錯誤:6)
- ✅ 標準CDU: 95個感測器 (正常:7, 錯誤:88)

**感測器配置影響**:
- 緊湊型CDU: 溫度2個, 壓力1個, 流量1個, IO1個
- 高級CDU: 溫度4個, 壓力3個, 流量2個, IO4個
- 標準CDU: 完整的95個感測器配置

**自定義機種創建**:
- ✅ 成功創建 "cdu_simple" 機種
- ✅ 包含4個基本感測器
- ✅ 成功切換並驗證配置生效

## 配置驗證

系統會自動驗證機種配置的完整性：

### 必要檢查項目
1. **感測器類型**: 必須包含 temperature, pressure, flow, io
2. **感測器配置**: 每個感測器必須有 register 和 description
3. **數據完整性**: 檢查配置格式和必要字段

### 錯誤處理
- 配置驗證失敗時返回詳細錯誤信息
- 無法刪除當前使用的機種
- 切換到不存在的機種時返回錯誤

## 應用場景

### 1. 產品線管理
- 不同型號CDU使用不同感測器配置
- 統一的API接口管理多種產品

### 2. 客戶定制
- 根據客戶需求創建專用配置
- 靈活調整感測器組合

### 3. 開發測試
- 測試環境使用簡化配置
- 生產環境使用完整配置

### 4. 系統升級
- 新增感測器時創建新機種
- 保持向後兼容性

## 注意事項

1. **配置持久化**: 所有配置自動保存到JSON文件
2. **即時生效**: 切換機種後感測器配置立即生效
3. **安全限制**: 無法刪除當前使用的機種
4. **配置驗證**: 創建配置時會進行完整性檢查

## 版本歷史

- **v1.0** (2025-07-21): 初始版本，支援多機種配置管理
