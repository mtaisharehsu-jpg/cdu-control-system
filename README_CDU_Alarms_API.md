# CDU異常信息API文檔

## 概述

本文檔描述了CDU系統中新增的異常信息API，基於R10001-R10005暫存器的80個bit位來顯示詳細的異常信息和故障狀態。

## 功能特性

- ✅ **80個異常代碼解析**: 完整解析R10001-R10005的所有80個bit位 (A001-A080)
- ✅ **異常名稱映射**: 每個異常代碼對應具體的故障描述
- ✅ **智能分類統計**: 按水泵、溫度、壓力、通訊等類別分組
- ✅ **嚴重程度判斷**: 根據異常類型和數量判斷整體嚴重程度
- ✅ **實時異常監控**: 直接從PLC讀取最新的異常狀態
- ✅ **關鍵異常識別**: 自動識別關鍵系統異常

## 異常代碼定義

根據您提供的規格，完整實現了80個異常代碼的解析：

### R10001 異常信息1 (A001-A016)
| 異常代碼 | bit位 | 異常名稱 | 說明 |
|----------|-------|----------|------|
| A001 | bit0 | 水泵[1]異常 | 0=無故障 1=有故障 |
| A002 | bit1 | 水泵[2]異常 | 0=無故障 1=有故障 |
| A003 | bit2 | 水泵[1]通訊故障 | 0=無故障 1=有故障 |
| A004 | bit3 | 水泵[2]通訊故障 | 0=無故障 1=有故障 |
| A009 | bit8 | 內部回水T12溫度過低 | 0=無故障 1=有故障 |
| A010 | bit9 | 內部回水T12溫度過高 | 0=無故障 1=有故障 |
| A015 | bit14 | 內部回水P12水泵入水壓過低 | 0=無故障 1=有故障 |
| A016 | bit15 | 內部回水P12水泵入水壓過高 | 0=無故障 1=有故障 |

### R10002 異常信息2 (A017-A032)
| 異常代碼 | bit位 | 異常名稱 | 說明 |
|----------|-------|----------|------|
| A017 | bit0 | 內部回水P13水泵入水壓過低 | 0=無故障 1=有故障 |
| A025 | bit8 | 內部進水F2流量計量測過低 | 0=無故障 1=有故障 |
| A027 | bit10 | CDU環境溫度過低 | 0=無故障 1=有故障 |
| A028 | bit11 | CDU環境溫度過高 | 0=無故障 1=有故障 |
| A032 | bit15 | 內部回水水位不足請確認補液裝置存量足夠 | 0=無故障 1=有故障 |

### R10003 異常信息3 (A033-A048)
| 異常代碼 | bit位 | 異常名稱 | 說明 |
|----------|-------|----------|------|
| A033 | bit0 | 水泵[1]運轉壓力未上升 | 0=無故障 1=有故障 |
| A035 | bit2 | CDU檢測出管路外有水 | 0=無故障 1=有故障 |
| A036 | bit3 | 二次側T12溫度檢查異常 | 0=無故障 1=有故障 |
| A044 | bit11 | 水泵雙組異常關閉系統 | 0=無故障 1=有故障 |
| A045 | bit12 | ModbusRTU連續通訊異常次數過多(溫溼度計) | 0=無故障 1=有故障 |

### R10004 異常信息4 (A049-A064)
| 異常代碼 | bit位 | 異常名稱 | 說明 |
|----------|-------|----------|------|
| A052 | bit3 | FX5-8AD模組[1]異常 | 0=無故障 1=有故障 |
| A055 | bit6 | PLC控制器異常碼產生 | 0=無故障 1=有故障 |
| A057 | bit8 | 加熱器水槽溫度過高 | 0=無故障 1=有故障 |
| A060 | bit11 | T11a感溫棒線路異常 | 0=無故障 1=有故障 |

### R10005 異常信息5 (A065-A080)
| 異常代碼 | bit位 | 異常名稱 | 說明 |
|----------|-------|----------|------|
| A065 | bit0 | T13b感溫棒線路異常 | 0=無故障 1=有故障 |
| A066 | bit1 | P1a壓力計線路異常 | 0=無故障 1=有故障 |
| A069 | bit4 | 比例閥線路異常 | 0=無故障 1=有故障 |

## API端點

### 獲取CDU異常信息

**端點**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/Alarms`

**描述**: 獲取基於R10001-R10005暫存器的完整異常信息

**響應範例**:
```json
{
  "success": true,
  "alarm_registers": {
    "R10001": {
      "register_address": 10001,
      "register_value": 34,
      "register_hex": "0x0022",
      "register_binary": "0000000000100010",
      "status_bits": {
        "bit1": {
          "alarm_code": "A002",
          "name": "[A002]水泵[2]異常",
          "description": "0=無故障 1=有故障",
          "value": 1,
          "status": "有故障",
          "active": true,
          "register": 10001,
          "bit_position": 1
        }
      },
      "active_count": 2
    }
  },
  "active_alarms": [
    {
      "alarm_code": "A002",
      "name": "[A002]水泵[2]異常",
      "description": "0=無故障 1=有故障",
      "value": 1,
      "status": "有故障",
      "active": true,
      "register": 10001,
      "bit_position": 1
    }
  ],
  "alarm_summary": {
    "total_alarms": 7,
    "critical_alarms_count": 2,
    "overall_status": "嚴重異常",
    "severity": "Critical",
    "category_counts": {
      "pump_alarms": 1,
      "temp_alarms": 3,
      "pressure_alarms": 0,
      "comm_alarms": 0,
      "sensor_alarms": 0,
      "system_alarms": 1,
      "other_alarms": 2
    },
    "has_pump_issues": true,
    "has_temp_issues": true,
    "has_system_issues": true
  },
  "timestamp": "2025-07-17T13:39:20.831024"
}
```

## 響應字段說明

### alarm_registers (暫存器詳情)
每個暫存器包含：
- `register_address`: 暫存器地址
- `register_value`: 十進制值
- `register_hex`: 十六進制表示
- `register_binary`: 二進制表示
- `status_bits`: 16個bit位的詳細信息
- `active_count`: 活躍異常數量

### active_alarms (活躍異常列表)
包含所有當前活躍的異常，每個異常包含：
- `alarm_code`: 異常代碼 (A001-A080)
- `name`: 異常名稱
- `description`: 異常描述
- `value`: bit位值 (1=有故障)
- `status`: 狀態文字
- `active`: 是否活躍
- `register`: 所屬暫存器
- `bit_position`: bit位置

### alarm_summary (異常摘要)
- `total_alarms`: 總異常數量
- `critical_alarms_count`: 關鍵異常數量
- `overall_status`: 整體狀態 (正常/輕微異常/多項異常/嚴重異常)
- `severity`: 嚴重程度 (Normal/Minor/Major/Critical)
- `category_counts`: 各類別異常統計
- `has_*_issues`: 各類別是否有問題

## 嚴重程度判斷邏輯

```python
def determine_severity(total_alarms, critical_alarms_count):
    if total_alarms == 0:
        return "正常", "Normal"
    elif critical_alarms_count > 0:
        return "嚴重異常", "Critical"
    elif total_alarms >= 5:
        return "多項異常", "Major"
    else:
        return "輕微異常", "Minor"
```

### 關鍵異常識別
以下異常被識別為關鍵異常：
- 包含"水泵"的異常
- 包含"系統"的異常
- 包含"PLC"的異常
- 包含"雙組異常"的異常
- 包含"水位不足"的異常

## 使用範例

### Python範例

```python
import requests
import json

# 獲取CDU異常信息
response = requests.get("http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Alarms")
result = response.json()

print(f"總異常數量: {result['alarm_summary']['total_alarms']}")
print(f"整體狀態: {result['alarm_summary']['overall_status']}")

# 顯示活躍異常
for alarm in result['active_alarms']:
    print(f"🚨 {alarm['alarm_code']}: {alarm['name']}")
    print(f"   暫存器: R{alarm['register']}, bit{alarm['bit_position']}")

# 檢查特定類別問題
summary = result['alarm_summary']
if summary['has_pump_issues']:
    print("⚠️ 檢測到水泵問題！")
if summary['has_system_issues']:
    print("🔴 檢測到系統問題！")
```

### 異常監控腳本

```python
import requests
import time

def monitor_alarms():
    while True:
        response = requests.get("http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Alarms")
        result = response.json()
        summary = result['alarm_summary']
        
        print(f"[{time.strftime('%H:%M:%S')}] {summary['overall_status']} "
              f"(總異常: {summary['total_alarms']}, 關鍵: {summary['critical_alarms_count']})")
        
        # 關鍵異常警報
        if summary['critical_alarms_count'] > 0:
            print("🚨 關鍵異常警報！")
            for alarm in summary['critical_alarms']:
                print(f"  - {alarm['alarm_code']}: {alarm['name']}")
        
        time.sleep(5)
```

## 測試結果

### 實際測試數據
- **總異常數量**: 7
- **關鍵異常數量**: 2
- **整體狀態**: 嚴重異常
- **嚴重程度**: Critical

### 活躍異常示例
- 🚨 A002: 水泵[2]異常 (R10001, bit1)
- 🚨 A036: 二次側T12溫度檢查異常 (R10003, bit3)
- 🚨 A055: PLC控制器異常碼產生 (R10004, bit6)

### 分類統計
- **水泵相關異常**: 1項
- **溫度相關異常**: 3項
- **系統相關異常**: 1項
- **其他異常**: 2項

## 注意事項

1. **實時性**: 每次API調用都會實時讀取R10001-R10005暫存器
2. **PLC連接**: 需要確保PLC在10.10.40.8:502可達
3. **異常優先級**: 關鍵異常具有最高優先級
4. **分類邏輯**: 基於異常名稱關鍵字進行智能分類

## 版本歷史

- **v1.0** (2025-07-17): 初始版本，支援R10001-R10005的80個異常代碼解析
