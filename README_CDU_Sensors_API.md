# CDU感測器API文檔

## 概述

本文檔描述了CDU系統中新增的感測器讀取API，能夠從PLC的Modbus TCP讀取完整的CDU感測器數據，涵蓋多機種CDU設定，並通過Redfish API提供溫度、流量、壓力等參數的機種設定功能。

## 功能特性

- ✅ **多機種支援**: 涵蓋不同CDU機種的感測器配置
- ✅ **完整感測器覆蓋**: 支援溫度、流量、壓力、IO等所有感測器類型
- ✅ **自動數值轉換**: 自動將PLC原始值轉換為實際工程單位
- ✅ **狀態監控**: 實時監控感測器狀態和健康度
- ✅ **批量讀取**: 支援批量讀取多種類型感測器
- ✅ **預留位管理**: 可選擇是否包含預留感測器

## 感測器類型定義

根據您提供的規格，實現了4大類感測器：

### 1. 流量訊息 (R10061-R10080)
| 感測器名稱 | 暫存器 | 描述 | 數據精度 | 數據範圍 | 單位 |
|------------|--------|------|----------|----------|------|
| secondary_outlet_flow_f2 | R10062 | 二次側出水量F2 | 1 | 0~700 (對應0~70LPM) | LPM |
| flow_reserved_* | R10061,R10063-R10080 | F預留 | - | - | - |

### 2. 壓力訊息 (R10081-R10110)
| 感測器名稱 | 暫存器 | 描述 | 數據精度 | 數據範圍 | 單位 |
|------------|--------|------|----------|----------|------|
| secondary_inlet_pressure_p12 | R10082 | 二次側入水壓力P12 | 0.01 | 5~600 (對應0.05~6bar) | bar |
| secondary_outlet_pressure_p13 | R10083 | 二次側出水壓力P13 | 0.01 | 5~600 (對應0.05~6bar) | bar |
| pressure_reserved_* | R10081,R10084-R10110 | P預留 | - | - | - |

### 3. 溫度訊息 (R10111-R10140)
| 感測器名稱 | 暫存器 | 描述 | 數據精度 | 數據範圍 | 單位 |
|------------|--------|------|----------|----------|------|
| secondary_return_temp_t11 | R10111 | 二次側回水溫度T11 | 0.1 | 100~800 (對應10~80℃) | ℃ |
| secondary_tank_temp_t12 | R10112 | 二次側水箱溫度T12 | 0.1 | 100~800 (對應10~80℃) | ℃ |
| secondary_outlet_temp_t13 | R10113 | 二次側出水溫度T13 | 0.1 | 100~800 (對應10~80℃) | ℃ |
| temp_reserved_* | R10114-R10140 | T預留 | - | - | - |

### 4. 輸入輸出訊息 (R10141-R10159)
| 感測器名稱 | 暫存器 | 描述 | 數據範圍 | 狀態映射 |
|------------|--------|------|----------|----------|
| tank_level_switch_x17 | R10141 | 二次側水箱液位開關X17 | 0~1 | 0=正常, 1=高水位 |
| leak_detection_x16 | R10143 | 盛水盤漏液偵測X16 | 0~1 | 0=漏水, 1=正常 |
| water_pump_output_y17 | R10151 | 補水泵輸出Y17 | 0~1 | 0=待機, 1=動作 |

## API端點

### 1. 獲取所有感測器數據

**端點**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/Sensors`

**參數**:
- `sensor_type` (可選): 感測器類型 (temperature, pressure, flow, io)
- `sensor_name` (可選): 特定感測器名稱

**響應範例**:
```json
{
  "success": true,
  "sensors_data": {
    "temperature": {
      "type_name": "溫度訊息",
      "sensors": {
        "secondary_return_temp_t11": {
          "register_address": 10111,
          "raw_value": 251,
          "actual_value": 25.1,
          "unit": "℃",
          "description": "二次側回水溫度T11",
          "precision": 0.1,
          "range": "100~800 (對應10~80℃)",
          "status": "正常",
          "is_active": true,
          "is_reserved": false
        }
      },
      "summary": {
        "count": 31,
        "active": 3,
        "errors": 28
      }
    }
  },
  "sensor_summary": {
    "total_sensors": 95,
    "active_sensors": 7,
    "error_sensors": 88,
    "sensor_types": {
      "temperature": {"count": 31, "active": 3, "errors": 28}
    }
  },
  "timestamp": "2025-07-21T12:00:18.673369"
}
```

### 2. POST方式讀取感測器

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/Sensors/Read`

**請求格式**:
```json
{
  "sensor_type": "temperature",
  "sensor_name": "secondary_return_temp_t11"  // 可選
}
```

### 3. 批量讀取感測器

**端點**: `POST /redfish/v1/Systems/CDU1/Oem/CDU/Sensors/BatchRead`

**請求格式**:
```json
{
  "sensor_types": ["temperature", "pressure", "flow"],
  "include_reserved": false
}
```

## 數值轉換邏輯

### 溫度感測器轉換
```
原始值範圍: 100-800
實際值範圍: 10.0-80.0℃
轉換公式: 實際值 = 原始值 × 0.1
範例: 251 → 25.1℃
```

### 壓力感測器轉換
```
原始值範圍: 5-600
實際值範圍: 0.05-6.0 bar
轉換公式: 實際值 = 原始值 × 0.01
範例: 162 → 1.62 bar
```

### 流量感測器轉換
```
原始值範圍: 0-700
實際值範圍: 0-70 LPM
轉換公式: 實際值 = 原始值 × 0.1
範例: 0 → 0.0 LPM
```

### IO感測器狀態映射
```
液位開關: 0=正常, 1=高水位
漏液偵測: 0=漏水, 1=正常
補水泵: 0=待機, 1=動作
```

## 使用範例

### Python範例

```python
import requests
import json

base_url = "http://localhost:8001/redfish/v1"

# 1. 獲取所有溫度感測器
response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Sensors?sensor_type=temperature")
result = response.json()

for sensor_name, sensor_info in result['sensors_data']['temperature']['sensors'].items():
    if sensor_info['is_active']:
        print(f"{sensor_info['description']}: {sensor_info['actual_value']} {sensor_info['unit']}")

# 2. 獲取特定感測器
response = requests.get(
    f"{base_url}/Systems/CDU1/Oem/CDU/Sensors",
    params={"sensor_type": "temperature", "sensor_name": "secondary_return_temp_t11"}
)

# 3. 批量讀取關鍵感測器
response = requests.post(
    f"{base_url}/Systems/CDU1/Oem/CDU/Sensors/BatchRead",
    json={
        "sensor_types": ["temperature", "pressure", "flow"],
        "include_reserved": False
    }
)

if response.status_code == 200:
    result = response.json()
    print(f"總感測器數: {result['batch_summary']['total_sensors']}")
    print(f"正常感測器數: {result['batch_summary']['active_sensors']}")
```

### cURL範例

```bash
# 獲取所有感測器數據
curl -X GET http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Sensors

# 獲取溫度感測器
curl -X GET "http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Sensors?sensor_type=temperature"

# 批量讀取
curl -X POST http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Sensors/BatchRead \
  -H "Content-Type: application/json" \
  -d '{"sensor_types": ["temperature", "pressure"], "include_reserved": false}'
```

## 測試結果

### 實際測試數據
- **總感測器數量**: 95個
- **正常感測器數量**: 7個
- **錯誤感測器數量**: 88個

### 各類型感測器統計
- **流量訊息**: 20個 (正常:1, 錯誤:19)
- **壓力訊息**: 31個 (正常:2, 錯誤:29)
- **溫度訊息**: 31個 (正常:3, 錯誤:28)
- **輸入輸出訊息**: 13個 (正常:1, 錯誤:12)

### 關鍵感測器狀態
- 🟢 **回水溫度**: 25.1℃ (正常)
- 🟢 **水箱溫度**: 26.3℃ (正常)
- 🟢 **入水壓力**: 1.62 bar (正常)
- 🟢 **出水流量**: 0.0 LPM (正常)
- 🔴 **液位開關**: 高水位

## 多機種支援

### 機種配置管理
系統支援不同CDU機種的感測器配置：

```python
# 機種A配置
machine_a_config = {
    "temperature_sensors": ["T11", "T12", "T13"],
    "pressure_sensors": ["P12", "P13"],
    "flow_sensors": ["F2"],
    "io_sensors": ["X17", "X16", "Y17"]
}

# 機種B配置
machine_b_config = {
    "temperature_sensors": ["T11", "T12", "T13", "T14"],
    "pressure_sensors": ["P12", "P13", "P14"],
    "flow_sensors": ["F2", "F3"],
    "io_sensors": ["X17", "X16", "Y17", "Y18"]
}
```

### 動態感測器映射
系統可根據機種自動調整感測器映射和數值轉換邏輯。

## 應用場景

### 1. 實時監控
- 溫度、壓力、流量的實時監控
- 異常狀態即時告警
- 系統運行參數顯示

### 2. 數據分析
- 歷史數據趨勢分析
- 性能指標統計
- 故障模式分析

### 3. 自動化控制
- 基於感測器數據的自動控制
- 閾值監控和告警
- 預防性維護

## 注意事項

1. **PLC連接**: 需要確保PLC在192.168.3.39:502可達
2. **數值精度**: 不同感測器有不同的精度設定
3. **狀態判斷**: 基於實際值範圍進行狀態判斷
4. **預留位**: 可選擇是否包含預留感測器

## 版本歷史

- **v1.0** (2025-07-21): 初始版本，支援完整的CDU感測器讀取功能
