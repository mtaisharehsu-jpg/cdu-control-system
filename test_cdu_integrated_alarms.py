#!/usr/bin/env python3
"""
測試CDU統合異常信息API功能
"""

import requests
import json
import time

def test_cdu_integrated_alarms_api():
    """測試CDU統合異常信息API"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== CDU統合異常信息API測試 ===")
    
    # 1. 測試獲取CDU統合異常信息
    print("\n1. 測試獲取CDU統合異常信息")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/IntegratedAlarms")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("CDU統合異常信息:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

def display_integrated_overview():
    """顯示統合概覽信息"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== CDU統合異常概覽 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/IntegratedAlarms")
        if response.status_code != 200:
            print(f"無法獲取統合異常信息: {response.text}")
            return
        
        result = response.json()
        
        # 系統概覽
        overview = result['system_overview']
        print(f"🎯 綜合狀態: {overview['integrated_status']} ({overview['status_color']})")
        print(f"系統健康評分: {result['system_health_score']}/100")
        
        # 系統狀態
        sys_status = overview['system_status']
        print(f"\n📊 系統狀態:")
        print(f"  電源開啟: {'是' if sys_status['power_on'] else '否'}")
        print(f"  運轉中: {'是' if sys_status['running'] else '否'}")
        print(f"  待機: {'是' if sys_status['standby'] else '否'}")
        print(f"  異常: {'是' if sys_status['abnormal'] else '否'}")
        print(f"  整體狀態: {sys_status['overall_status']}")
        
        # 異常狀態
        alarm_status = overview['alarm_status']
        print(f"\n🚨 異常狀態:")
        print(f"  總異常數量: {alarm_status['total_alarms']}")
        print(f"  關鍵異常數量: {alarm_status['critical_alarms']}")
        print(f"  嚴重程度: {alarm_status['severity']}")
        print(f"  異常狀態: {alarm_status['overall_status']}")
        
        # 運行摘要
        op_summary = overview['operational_summary']
        print(f"\n⚙️ 運行摘要:")
        print(f"  可正常運行: {'是' if op_summary['is_operational'] else '否'}")
        print(f"  需要關注: {'是' if op_summary['needs_attention'] else '否'}")
        print(f"  需要立即處理: {'是' if op_summary['requires_immediate_action'] else '否'}")
        
    except Exception as e:
        print(f"處理失敗: {e}")

def display_alarm_categories():
    """顯示異常分類詳情"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 異常分類詳情 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/IntegratedAlarms")
        if response.status_code != 200:
            print(f"無法獲取統合異常信息: {response.text}")
            return
        
        result = response.json()
        categories = result['alarm_categories']
        
        for category_key, category in categories.items():
            alarm_count = len(category['alarms'])
            status_icon = "🟢" if category['status'] == "正常" else "🟡" if "輕微" in category['status'] else "🟠" if "中度" in category['status'] else "🔴"
            
            print(f"{status_icon} {category['name']}: {category['status']} (影響: {category['impact']})")
            if alarm_count > 0:
                print(f"   異常數量: {alarm_count}")
                for alarm in category['alarms'][:3]:  # 只顯示前3個
                    print(f"   - {alarm['alarm_code']}: {alarm['name']}")
                if alarm_count > 3:
                    print(f"   ... 還有 {alarm_count - 3} 個異常")
            print()
        
    except Exception as e:
        print(f"分類顯示失敗: {e}")

def display_critical_issues():
    """顯示關鍵問題"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 關鍵問題識別 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/IntegratedAlarms")
        if response.status_code != 200:
            print(f"無法獲取統合異常信息: {response.text}")
            return
        
        result = response.json()
        critical_issues = result['critical_issues']
        
        if not critical_issues:
            print("✅ 無關鍵問題")
            return
        
        print(f"🔴 發現 {len(critical_issues)} 個關鍵問題:")
        
        for i, issue in enumerate(critical_issues, 1):
            severity_icon = "🔴" if issue['severity'] == "critical" else "🟠"
            print(f"\n{i}. {severity_icon} {issue['title']}")
            print(f"   類型: {issue['type']}")
            print(f"   嚴重程度: {issue['severity']}")
            print(f"   描述: {issue['description']}")
            print(f"   來源: {issue['source']}")
            print(f"   建議措施: {issue['action_required']}")
        
    except Exception as e:
        print(f"關鍵問題顯示失敗: {e}")

def display_recommended_actions():
    """顯示建議措施"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 建議措施 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/IntegratedAlarms")
        if response.status_code != 200:
            print(f"無法獲取統合異常信息: {response.text}")
            return
        
        result = response.json()
        actions = result['recommended_actions']
        
        print(f"📋 系統建議 {len(actions)} 項措施:")
        for i, action in enumerate(actions, 1):
            print(f"{i}. {action}")
        
    except Exception as e:
        print(f"建議措施顯示失敗: {e}")

def display_active_alarms_summary():
    """顯示活躍異常摘要"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 活躍異常摘要 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/IntegratedAlarms")
        if response.status_code != 200:
            print(f"無法獲取統合異常信息: {response.text}")
            return
        
        result = response.json()
        summary = result['active_alarms_summary']
        
        print(f"總活躍異常: {summary['total_active']}")
        
        # 按優先級顯示
        by_priority = summary['by_priority']
        print(f"\n按優先級分組:")
        print(f"  🔴 高優先級: {by_priority['high']['count']} 項")
        print(f"  🟡 中優先級: {by_priority['medium']['count']} 項")
        print(f"  🟢 低優先級: {by_priority['low']['count']} 項")
        
        # 顯示高優先級異常
        if by_priority['high']['count'] > 0:
            print(f"\n🔴 高優先級異常:")
            for alarm in by_priority['high']['alarms']:
                print(f"  - {alarm['alarm_code']}: {alarm['name']}")
        
        # 嚴重程度評估
        severity = summary['severity_assessment']
        print(f"\n嚴重程度評估: {severity['level']}")
        print(f"描述: {severity['description']}")
        
    except Exception as e:
        print(f"活躍異常摘要顯示失敗: {e}")

def generate_system_report():
    """生成系統報告"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 系統狀態報告 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/IntegratedAlarms")
        if response.status_code != 200:
            print(f"無法獲取統合異常信息: {response.text}")
            return
        
        result = response.json()
        
        print(f"報告時間: {result['timestamp']}")
        print(f"系統健康評分: {result['system_health_score']}/100")
        
        overview = result['system_overview']
        print(f"綜合狀態: {overview['integrated_status']}")
        
        # 生成狀態等級
        health_score = result['system_health_score']
        if health_score >= 90:
            health_level = "優秀"
            health_icon = "🟢"
        elif health_score >= 70:
            health_level = "良好"
            health_icon = "🟡"
        elif health_score >= 50:
            health_level = "一般"
            health_icon = "🟠"
        else:
            health_level = "差"
            health_icon = "🔴"
        
        print(f"健康等級: {health_icon} {health_level}")
        
        # 關鍵指標
        alarm_status = overview['alarm_status']
        print(f"\n關鍵指標:")
        print(f"  總異常數: {alarm_status['total_alarms']}")
        print(f"  關鍵異常數: {alarm_status['critical_alarms']}")
        print(f"  系統運行: {'是' if overview['system_status']['running'] else '否'}")
        print(f"  需要關注: {'是' if overview['operational_summary']['needs_attention'] else '否'}")
        
        # 建議
        actions = result['recommended_actions']
        print(f"\n優先建議:")
        for action in actions[:3]:  # 只顯示前3個建議
            print(f"  • {action}")
        
    except Exception as e:
        print(f"報告生成失敗: {e}")

if __name__ == "__main__":
    # 等待服務啟動
    print("等待API服務啟動...")
    time.sleep(3)
    
    test_cdu_integrated_alarms_api()
    display_integrated_overview()
    display_alarm_categories()
    display_critical_issues()
    display_recommended_actions()
    display_active_alarms_summary()
    generate_system_report()
    
    print("\n=== 測試完成 ===")
    print("CDU統合異常信息API功能測試完成！")
