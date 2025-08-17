#!/usr/bin/env python3
"""
測試CDU異常信息API功能
"""

import requests
import json
import time

def test_cdu_alarms_api():
    """測試CDU異常信息API"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== CDU異常信息API測試 ===")
    
    # 1. 測試獲取CDU異常信息
    print("\n1. 測試獲取CDU異常信息")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Alarms")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("CDU異常信息:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

def display_alarm_details():
    """詳細顯示異常信息"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== CDU異常信息詳細分析 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Alarms")
        if response.status_code != 200:
            print(f"無法獲取異常信息: {response.text}")
            return
        
        result = response.json()
        
        print(f"異常信息讀取成功，共檢查5個暫存器 (R10001-R10005)")
        
        # 顯示異常摘要
        summary = result['alarm_summary']
        print(f"\n=== 異常摘要 ===")
        print(f"總異常數量: {summary['total_alarms']}")
        print(f"關鍵異常數量: {summary['critical_alarms_count']}")
        print(f"整體狀態: {summary['overall_status']}")
        print(f"嚴重程度: {summary['severity']}")
        
        # 顯示分類統計
        print(f"\n=== 異常分類統計 ===")
        category_counts = summary['category_counts']
        print(f"水泵相關異常: {category_counts['pump_alarms']}")
        print(f"溫度相關異常: {category_counts['temp_alarms']}")
        print(f"壓力相關異常: {category_counts['pressure_alarms']}")
        print(f"通訊相關異常: {category_counts['comm_alarms']}")
        print(f"感測器相關異常: {category_counts['sensor_alarms']}")
        print(f"系統相關異常: {category_counts['system_alarms']}")
        print(f"其他異常: {category_counts['other_alarms']}")
        
        # 顯示活躍異常
        active_alarms = result['active_alarms']
        if active_alarms:
            print(f"\n=== 活躍異常列表 ({len(active_alarms)}項) ===")
            for alarm in active_alarms:
                print(f"🚨 {alarm['alarm_code']}: {alarm['name']}")
                print(f"   暫存器: R{alarm['register']}, bit{alarm['bit_position']}")
                print(f"   狀態: {alarm['status']}")
        else:
            print(f"\n✅ 無活躍異常，系統正常")
        
        # 顯示各暫存器狀態
        print(f"\n=== 各暫存器狀態 ===")
        alarm_registers = result['alarm_registers']
        for reg_key, reg_info in alarm_registers.items():
            print(f"{reg_key}: {reg_info['register_value']} (0x{reg_info['register_hex']}) "
                  f"活躍異常: {reg_info['active_count']}")
        
    except Exception as e:
        print(f"處理失敗: {e}")

def test_specific_alarms():
    """測試特定異常代碼的解析"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 特定異常代碼測試 ===")
    
    # 測試一些關鍵異常代碼
    test_cases = [
        {"register": 10001, "bit": 0, "code": "A001", "name": "水泵[1]異常"},
        {"register": 10001, "bit": 1, "code": "A002", "name": "水泵[2]異常"},
        {"register": 10001, "bit": 8, "code": "A009", "name": "內部回水T12溫度過低"},
        {"register": 10002, "bit": 15, "code": "A032", "name": "內部回水水位不足請確認補液裝置存量足夠"},
        {"register": 10003, "bit": 11, "code": "A044", "name": "水泵雙組異常關閉系統"},
        {"register": 10004, "bit": 6, "code": "A055", "name": "PLC控制器異常碼產生"},
        {"register": 10005, "bit": 4, "code": "A069", "name": "比例閥線路異常"}
    ]
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Alarms")
        if response.status_code != 200:
            print(f"無法獲取異常信息: {response.text}")
            return
        
        result = response.json()
        alarm_registers = result['alarm_registers']
        
        print("檢查特定異常代碼的映射:")
        for test_case in test_cases:
            reg_key = f"R{test_case['register']}"
            if reg_key in alarm_registers:
                reg_info = alarm_registers[reg_key]
                bit_key = f"bit{test_case['bit']}"
                if bit_key in reg_info['status_bits']:
                    bit_info = reg_info['status_bits'][bit_key]
                    expected_code = test_case['code']
                    actual_code = bit_info['alarm_code']
                    expected_name = test_case['name']
                    actual_name = bit_info['name']
                    
                    status = "✅" if expected_code == actual_code else "❌"
                    print(f"{status} {expected_code}: {expected_name}")
                    if expected_code != actual_code:
                        print(f"   預期: {expected_code}, 實際: {actual_code}")
                    if expected_name not in actual_name:
                        print(f"   名稱不匹配: {actual_name}")
        
    except Exception as e:
        print(f"特定異常測試失敗: {e}")

def test_alarm_categories():
    """測試異常分類功能"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 異常分類功能測試 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Alarms")
        if response.status_code != 200:
            print(f"無法獲取異常信息: {response.text}")
            return
        
        result = response.json()
        summary = result['alarm_summary']
        
        print("分類功能檢查:")
        print(f"水泵問題: {'是' if summary['has_pump_issues'] else '否'}")
        print(f"溫度問題: {'是' if summary['has_temp_issues'] else '否'}")
        print(f"壓力問題: {'是' if summary['has_pressure_issues'] else '否'}")
        print(f"通訊問題: {'是' if summary['has_comm_issues'] else '否'}")
        print(f"感測器問題: {'是' if summary['has_sensor_issues'] else '否'}")
        print(f"系統問題: {'是' if summary['has_system_issues'] else '否'}")
        
        # 顯示關鍵異常
        critical_alarms = summary['critical_alarms']
        if critical_alarms:
            print(f"\n關鍵異常 ({len(critical_alarms)}項):")
            for alarm in critical_alarms:
                print(f"  🔴 {alarm['alarm_code']}: {alarm['name']}")
        else:
            print(f"\n✅ 無關鍵異常")
        
    except Exception as e:
        print(f"分類測試失敗: {e}")

def monitor_alarms():
    """監控異常狀態變化"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 異常監控測試 (10秒) ===")
    
    start_time = time.time()
    check_count = 0
    
    while time.time() - start_time < 10:
        try:
            response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Alarms")
            if response.status_code == 200:
                result = response.json()
                summary = result['alarm_summary']
                
                check_count += 1
                timestamp = time.strftime('%H:%M:%S')
                print(f"[{timestamp}] 檢查#{check_count}: {summary['overall_status']} "
                      f"(總異常: {summary['total_alarms']}, 關鍵: {summary['critical_alarms_count']})")
                
                if summary['total_alarms'] > 0:
                    active_alarms = result['active_alarms']
                    for alarm in active_alarms[:3]:  # 只顯示前3個
                        print(f"  - {alarm['alarm_code']}: {alarm['name']}")
                    if len(active_alarms) > 3:
                        print(f"  ... 還有 {len(active_alarms) - 3} 個異常")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] 讀取失敗: {response.status_code}")
                
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] 監控錯誤: {e}")
        
        time.sleep(2)

if __name__ == "__main__":
    # 等待服務啟動
    print("等待API服務啟動...")
    time.sleep(3)
    
    test_cdu_alarms_api()
    display_alarm_details()
    test_specific_alarms()
    test_alarm_categories()
    monitor_alarms()
    
    print("\n=== 測試完成 ===")
    print("CDU異常信息API功能測試完成！")
