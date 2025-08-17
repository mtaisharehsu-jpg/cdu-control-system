# CDU機組狀態API文檔

## 概述

本文檔描述了CDU系統中新增的機組狀態API，基於R10000暫存器的16個bit位來顯示詳細的機組運行狀態。

## 功能特性

- ✅ **16位狀態解析**: 完整解析R10000的所有16個bit位
- ✅ **狀態名稱映射**: 每個bit位對應具體的功能名稱
- ✅ **智能狀態判斷**: 根據bit位組合判斷整體狀態
- ✅ **實時狀態**: 直接從PLC讀取最新的R10000值
- ✅ **多格式顯示**: 十進制、十六進制、二進制格式
- ✅ **狀態摘要**: 提供關鍵狀態的快速摘要

## bit位定義

根據您提供的規格，R10000的16個bit位定義如下：

| bit位 | 功能名稱 | 說明 | 0值含義 | 1值含義 |
|-------|----------|------|---------|---------|
| bit0 | CDU-電源開啟 | 電源狀態 | 關閉 | 開啟 |
| bit1 | CDU-運轉中 | 運轉狀態 | 停止 | 運轉 |
| bit2 | CDU-待機 | 待機狀態 | 運轉 | 待機 |
| bit3 | CDU-預留3 | 預留位 | - | - |
| bit4 | CDU-補水中 | 補水狀態 | 停止 | 運行 |
| bit5 | CDU-預留5 | 預留位 | - | - |
| bit6 | CDU-預留6 | 預留位 | - | - |
| bit7 | CDU-異常 | 異常狀態 | 正常 | 異常 |
| bit8-15 | 預留8-15 | 預留位 | - | - |

## API端點

### 獲取CDU機組狀態

**端點**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/Status`

**描述**: 獲取基於R10000暫存器的完整機組狀態信息

**響應範例**:
```json
{
  "success": true,
  "register_value": 12,
  "register_hex": "0x000C",
  "register_binary": "0000000000001100",
  "status_bits": {
    "bit0": {
      "name": "CDU-電源開啟",
      "description": "0=關閉 1=開啟",
      "value": 0,
      "status": "關閉",
      "active": false
    },
    "bit1": {
      "name": "CDU-運轉中",
      "description": "0=停止 1=運轉",
      "value": 0,
      "status": "停止",
      "active": false
    },
    "bit2": {
      "name": "CDU-待機",
      "description": "0=運轉 1=待機",
      "value": 1,
      "status": "待機",
      "active": true
    },
    "bit3": {
      "name": "CDU-預留3",
      "description": "預留位",
      "value": 1,
      "status": "位3=1",
      "active": true
    },
    "bit4": {
      "name": "CDU-補水中",
      "description": "0=停止 1=運行",
      "value": 0,
      "status": "停止",
      "active": false
    },
    "bit7": {
      "name": "CDU-異常",
      "description": "0=正常 1=異常",
      "value": 0,
      "status": "正常",
      "active": false
    }
  },
  "summary": {
    "power_on": false,
    "running": false,
    "standby": true,
    "water_filling": false,
    "abnormal": false,
    "overall_status": "關機"
  },
  "timestamp": "2025-07-17T13:21:03.312298"
}
```

## 響應字段說明

### 基本信息
- `success`: 操作是否成功
- `register_value`: R10000的十進制值
- `register_hex`: R10000的十六進制表示
- `register_binary`: R10000的二進制表示
- `timestamp`: 讀取時間戳

### status_bits (bit位詳情)
每個bit位包含以下信息：
- `name`: 功能名稱
- `description`: 功能描述
- `value`: bit位的值 (0或1)
- `status`: 狀態描述文字
- `active`: 是否為活躍狀態 (值為1)

### summary (狀態摘要)
- `power_on`: 電源是否開啟 (bit0)
- `running`: 是否運轉中 (bit1)
- `standby`: 是否待機 (bit2)
- `water_filling`: 是否補水中 (bit4)
- `abnormal`: 是否異常 (bit7)
- `overall_status`: 整體狀態判斷

## 整體狀態判斷邏輯

系統根據關鍵bit位的組合自動判斷整體狀態：

```python
def get_overall_status(register_value):
    power_on = bool(register_value & 0x01)    # bit0
    running = bool(register_value & 0x02)     # bit1
    standby = bool(register_value & 0x04)     # bit2
    abnormal = bool(register_value & 0x80)    # bit7
    
    if abnormal:
        return "異常"
    elif not power_on:
        return "關機"
    elif standby:
        return "待機"
    elif running:
        return "運轉中"
    else:
        return "開機未運轉"
```

## 使用範例

### Python範例

```python
import requests
import json

# 獲取CDU機組狀態
response = requests.get("http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Status")
result = response.json()

print(f"R10000值: {result['register_value']} (0x{result['register_hex']})")
print(f"整體狀態: {result['summary']['overall_status']}")

# 顯示活躍的bit位
print("活躍狀態:")
for bit_key, bit_info in result['status_bits'].items():
    if bit_info['active']:
        print(f"  {bit_key}: {bit_info['name']} = {bit_info['status']}")

# 檢查關鍵狀態
summary = result['summary']
if summary['abnormal']:
    print("⚠️ 系統異常！")
elif summary['power_on'] and summary['running']:
    print("✅ 系統正常運轉")
elif summary['power_on'] and summary['standby']:
    print("⏸️ 系統待機中")
else:
    print("⚪ 系統關機")
```

### cURL範例

```bash
# 獲取CDU機組狀態
curl -X GET http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Status

# 使用jq解析關鍵信息
curl -s http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Status | \
  jq '.summary | {整體狀態: .overall_status, 電源: .power_on, 運轉: .running, 異常: .abnormal}'
```

## 狀態監控範例

### 持續監控腳本

```python
import requests
import time

def monitor_cdu_status():
    """持續監控CDU狀態"""
    while True:
        try:
            response = requests.get("http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Status")
            if response.status_code == 200:
                result = response.json()
                summary = result['summary']
                
                status_line = f"[{time.strftime('%H:%M:%S')}] "
                status_line += f"狀態: {summary['overall_status']} | "
                status_line += f"電源: {'開' if summary['power_on'] else '關'} | "
                status_line += f"運轉: {'是' if summary['running'] else '否'} | "
                status_line += f"異常: {'是' if summary['abnormal'] else '否'}"
                
                print(status_line)
                
                # 異常警報
                if summary['abnormal']:
                    print("🚨 警報: 系統異常！")
                    
            else:
                print(f"讀取失敗: {response.status_code}")
                
        except Exception as e:
            print(f"監控錯誤: {e}")
        
        time.sleep(5)  # 每5秒檢查一次

if __name__ == "__main__":
    monitor_cdu_status()
```

## 測試結果

### 實際測試數據
- **R10000值**: 12 (0x000C)
- **二進制**: 0000000000001100
- **活躍bit位**: bit2 (待機), bit3 (預留)
- **整體狀態**: 關機 (因為bit0電源=0)

### 狀態解析
- ⚪ bit0: CDU-電源開啟 = 關閉
- ⚪ bit1: CDU-運轉中 = 停止  
- 🟢 bit2: CDU-待機 = 待機
- 🟢 bit3: CDU-預留3 = 位3=1
- ⚪ bit4: CDU-補水中 = 停止
- ⚪ bit7: CDU-異常 = 正常

## 錯誤處理

### HTTP狀態碼
- `200 OK`: 操作成功
- `400 Bad Request`: PLC讀取失敗
- `404 Not Found`: 系統不存在
- `500 Internal Server Error`: 服務器內部錯誤

### 常見錯誤
```json
{
  "success": false,
  "message": "Failed to read R10000 register",
  "timestamp": "2025-07-17T13:21:03.312298"
}
```

## 注意事項

1. **實時性**: 每次API調用都會實時讀取R10000暫存器
2. **PLC連接**: 需要確保PLC在10.10.40.8:502可達
3. **bit位優先級**: 異常狀態(bit7)具有最高優先級
4. **狀態邏輯**: 電源關閉時，其他狀態不影響整體判斷

## 版本歷史

- **v1.0** (2025-07-17): 初始版本，支援R10000的16位狀態解析
