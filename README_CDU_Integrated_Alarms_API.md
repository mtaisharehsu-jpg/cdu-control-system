# CDU統合異常信息API文檔

## 概述

本文檔描述了CDU系統中新增的統合異常信息API，彙整所有有發生異常動作狀態的信息，提供完整的系統健康狀況分析和建議措施。

## 功能特性

- ✅ **系統綜合分析**: 整合機組狀態和異常信息的完整分析
- ✅ **智能健康評分**: 0-100分的系統健康評分機制
- ✅ **異常分類統計**: 按水泵、溫度、壓力等類別詳細分析
- ✅ **關鍵問題識別**: 自動識別需要立即處理的關鍵問題
- ✅ **建議措施生成**: 基於當前狀態生成具體的維護建議
- ✅ **優先級排序**: 按嚴重程度對異常進行優先級排序

## API端點

### 獲取CDU統合異常信息

**端點**: `GET /redfish/v1/Systems/CDU1/Oem/CDU/IntegratedAlarms`

**描述**: 獲取彙整所有有發生異常動作狀態的完整信息

**響應範例**:
```json
{
  "success": true,
  "system_overview": {
    "integrated_status": "嚴重異常",
    "status_color": "red",
    "system_status": {
      "power_on": true,
      "running": true,
      "standby": true,
      "abnormal": false,
      "overall_status": "待機"
    },
    "alarm_status": {
      "total_alarms": 7,
      "critical_alarms": 2,
      "severity": "Critical",
      "overall_status": "嚴重異常"
    },
    "operational_summary": {
      "is_operational": false,
      "needs_attention": true,
      "requires_immediate_action": true
    }
  },
  "active_alarms_summary": {
    "total_active": 7,
    "by_priority": {
      "high": {
        "count": 2,
        "alarms": [
          {
            "alarm_code": "A002",
            "name": "[A002]水泵[2]異常",
            "register": 10001,
            "bit_position": 1
          }
        ]
      },
      "medium": {"count": 3},
      "low": {"count": 2}
    },
    "severity_assessment": {
      "level": "Critical",
      "description": "存在嚴重異常，需要立即處理"
    }
  },
  "alarm_categories": {
    "pump_systems": {
      "name": "水泵系統",
      "alarms": [...],
      "status": "輕微異常",
      "impact": "低"
    },
    "temperature_control": {
      "name": "溫度控制",
      "alarms": [...],
      "status": "中度異常",
      "impact": "中"
    }
  },
  "critical_issues": [
    {
      "type": "pump_failure",
      "severity": "critical",
      "title": "水泵系統故障 (A002)",
      "description": "[A002]水泵[2]異常",
      "source": "R10001 bit1",
      "action_required": "檢查水泵運行狀態，確認電源和控制信號"
    }
  ],
  "recommended_actions": [
    "檢查水泵系統：確認電源、控制信號和機械狀態",
    "檢查溫度控制系統：確認感溫棒和控制邏輯",
    "立即停機檢修，聯繫維護人員"
  ],
  "system_health_score": 20,
  "timestamp": "2025-07-17T14:20:31.593655"
}
```

## 響應字段說明

### system_overview (系統概覽)
- `integrated_status`: 綜合狀態 (正常運行/待機中/輕微異常/多項異常/嚴重異常)
- `status_color`: 狀態顏色 (green/blue/yellow/orange/red)
- `system_status`: 系統運行狀態詳情
- `alarm_status`: 異常狀態統計
- `operational_summary`: 運行能力摘要

### active_alarms_summary (活躍異常摘要)
- `total_active`: 總活躍異常數量
- `by_priority`: 按優先級分組 (high/medium/low)
- `severity_assessment`: 嚴重程度評估

### alarm_categories (異常分類)
按系統類別分組的詳細異常信息：
- `pump_systems`: 水泵系統
- `temperature_control`: 溫度控制
- `pressure_systems`: 壓力系統
- `communication`: 通訊系統
- `sensors`: 感測器
- `system_control`: 系統控制

### critical_issues (關鍵問題)
需要立即處理的關鍵問題列表，包含：
- `type`: 問題類型
- `severity`: 嚴重程度
- `title`: 問題標題
- `description`: 詳細描述
- `source`: 數據來源
- `action_required`: 建議措施

### recommended_actions (建議措施)
基於當前狀態生成的具體維護建議

### system_health_score (系統健康評分)
0-100分的健康評分：
- 90-100: 優秀 🟢
- 70-89: 良好 🟡
- 50-69: 一般 🟠
- 0-49: 差 🔴

## 健康評分計算邏輯

```python
def calculate_health_score():
    score = 100
    
    # 系統狀態扣分
    if not power_on: score -= 20
    elif abnormal: score -= 30
    elif standby: score -= 5
    
    # 異常扣分
    score -= critical_alarms * 15  # 每個關鍵異常扣15分
    score -= normal_alarms * 5     # 每個一般異常扣5分
    
    # 系統類別扣分
    if has_pump_issues: score -= 10
    if has_system_issues: score -= 10
    
    return max(0, min(100, score))
```

## 綜合狀態判斷邏輯

```python
def determine_integrated_status():
    if critical_alarms > 0 or abnormal:
        return "嚴重異常", "red"
    elif total_alarms >= 3:
        return "多項異常", "orange"
    elif total_alarms > 0:
        return "輕微異常", "yellow"
    elif not power_on:
        return "系統關機", "gray"
    elif running:
        return "正常運行", "green"
    else:
        return "待機中", "blue"
```

## 使用範例

### Python範例

```python
import requests
import json

# 獲取統合異常信息
response = requests.get("http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/IntegratedAlarms")
result = response.json()

# 系統概覽
overview = result['system_overview']
print(f"綜合狀態: {overview['integrated_status']}")
print(f"健康評分: {result['system_health_score']}/100")

# 檢查是否需要立即處理
if overview['operational_summary']['requires_immediate_action']:
    print("🚨 系統需要立即處理！")
    
    # 顯示關鍵問題
    for issue in result['critical_issues']:
        print(f"🔴 {issue['title']}: {issue['description']}")
        print(f"   建議: {issue['action_required']}")

# 顯示建議措施
print("\n建議措施:")
for i, action in enumerate(result['recommended_actions'], 1):
    print(f"{i}. {action}")
```

### 系統監控腳本

```python
import requests
import time

def monitor_system_health():
    while True:
        response = requests.get("http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/IntegratedAlarms")
        result = response.json()
        
        health_score = result['system_health_score']
        status = result['system_overview']['integrated_status']
        
        # 健康等級判斷
        if health_score >= 90:
            level, icon = "優秀", "🟢"
        elif health_score >= 70:
            level, icon = "良好", "🟡"
        elif health_score >= 50:
            level, icon = "一般", "🟠"
        else:
            level, icon = "差", "🔴"
        
        print(f"[{time.strftime('%H:%M:%S')}] {icon} {status} (健康度: {health_score}/100 - {level})")
        
        # 關鍵問題警報
        critical_count = len(result['critical_issues'])
        if critical_count > 0:
            print(f"🚨 {critical_count} 個關鍵問題需要處理！")
        
        time.sleep(30)  # 每30秒檢查一次
```

## 測試結果

### 實際測試數據
- **綜合狀態**: 嚴重異常 (red)
- **健康評分**: 20/100 (差)
- **總異常數**: 7項
- **關鍵異常數**: 2項

### 異常分類統計
- 🟡 水泵系統: 輕微異常 (1項)
- 🟠 溫度控制: 中度異常 (3項)
- 🟡 系統控制: 輕微異常 (1項)
- 🟢 其他系統: 正常

### 關鍵問題
1. 🔴 水泵系統故障 (A002)
2. 🔴 控制系統故障 (A055)
3. 🟠 多重系統故障 (7項異常)

### 建議措施
1. 檢查水泵系統：確認電源、控制信號和機械狀態
2. 檢查溫度控制系統：確認感溫棒和控制邏輯
3. 檢查控制系統：確認PLC和模組狀態
4. 立即停機檢修，聯繫維護人員

## 應用場景

### 1. 運維監控
- 實時監控系統健康狀況
- 快速識別需要關注的問題
- 優先處理關鍵異常

### 2. 維護管理
- 生成維護工單
- 追蹤問題解決進度
- 預防性維護規劃

### 3. 決策支援
- 系統運行能力評估
- 維護資源分配
- 停機維護決策

## 注意事項

1. **實時性**: 統合信息基於實時PLC數據
2. **準確性**: 健康評分反映當前系統狀態
3. **優先級**: 關鍵問題需要優先處理
4. **建議措施**: 基於專業知識生成，需結合實際情況

## 版本歷史

- **v1.0** (2025-07-17): 初始版本，完整的統合異常信息分析
