#!/usr/bin/env python3
"""
測試CDU數值寫入API功能
"""

import requests
import json
import time

def test_cdu_values_api():
    """測試CDU數值寫入API"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== CDU數值寫入API測試 ===")
    
    # 1. 測試獲取數值狀態
    print("\n1. 測試獲取數值狀態")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Values")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("CDU數值狀態:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

def display_values_status():
    """顯示數值狀態詳情"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== CDU數值狀態詳情 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Values")
        if response.status_code != 200:
            print(f"無法獲取數值狀態: {response.text}")
            return
        
        result = response.json()
        values = result['values_status']
        
        print("數值設定狀態:")
        for param_name, param_info in values.items():
            status_icon = "🟢" if param_info['status'] == "正常" else "⚪" if param_info['status'] == "讀取失敗" else "🟡"
            print(f"{status_icon} {param_name}: {param_info['description']}")
            print(f"   暫存器: R{param_info['register_address']}")
            print(f"   當前值: {param_info['actual_value']} {param_info['unit']}")
            print(f"   暫存器值: {param_info['register_value']}")
            print(f"   數值範圍: {param_info['value_range']}")
            print(f"   狀態: {param_info['status']}")
            if 'error' in param_info:
                print(f"   錯誤: {param_info['error']}")
            print()
        
    except Exception as e:
        print(f"處理失敗: {e}")

def test_value_writing():
    """測試數值寫入"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 數值寫入測試 ===")
    
    # 測試各種數值寫入
    test_cases = [
        {"parameter": "temp_setting", "value": 25.5, "description": "溫度設定 25.5℃"},
        {"parameter": "flow_setting", "value": 30.0, "description": "流量設定 30.0 LPM"},
        {"parameter": "fan_speed", "value": 75.0, "description": "風扇轉速 75%"},
        {"parameter": "pump1_speed", "value": 80.0, "description": "水泵1轉速 80%"},
        {"parameter": "pump2_speed", "value": 85.0, "description": "水泵2轉速 85%"}
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. 測試: {test_case['description']}")
        
        try:
            # 執行數值寫入
            response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/Values/Write",
                json={"parameter": test_case["parameter"], "value": test_case["value"]},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ 寫入成功")
                print(f"   輸入值: {result['input_value']} {result['unit']}")
                print(f"   暫存器值: {result['register_value']}")
                print(f"   實際值: {result['actual_value']} {result['unit']}")
                print(f"   狀態: {result['status']}")
            else:
                print(f"   ❌ 寫入失敗: {response.text}")
                
        except Exception as e:
            print(f"   ❌ 請求失敗: {e}")
        
        # 等待一下再執行下一個操作
        time.sleep(2)

def test_invalid_values():
    """測試無效數值"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 無效數值測試 ===")
    
    invalid_test_cases = [
        {"parameter": "temp_setting", "value": -10.0, "description": "溫度設定 -10℃ (低於範圍)"},
        {"parameter": "temp_setting", "value": 70.0, "description": "溫度設定 70℃ (超出範圍)"},
        {"parameter": "fan_speed", "value": 150.0, "description": "風扇轉速 150% (超出範圍)"},
        {"parameter": "invalid_param", "value": 50.0, "description": "無效參數"},
        {"parameter": "pump1_speed", "value": -5.0, "description": "水泵1轉速 -5% (負值)"}
    ]
    
    for i, test_case in enumerate(invalid_test_cases, 1):
        print(f"\n{i}. 測試無效數值: {test_case['description']}")
        
        try:
            response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/Values/Write",
                json={"parameter": test_case["parameter"], "value": test_case["value"]},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   狀態碼: {response.status_code}")
            
            if response.status_code == 400:
                result = response.json()
                print(f"   ✅ 正確拒絕無效數值")
                print(f"   錯誤信息: {result.get('detail', '未知錯誤')}")
            else:
                print(f"   ⚠️ 未預期的響應: {response.text}")
                
        except Exception as e:
            print(f"   ❌ 請求失敗: {e}")

def test_value_conversion():
    """測試數值轉換"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 數值轉換測試 ===")
    
    conversion_tests = [
        {"parameter": "temp_setting", "value": 0.0, "expected_register": 3000, "description": "溫度 0℃ → 3000"},
        {"parameter": "temp_setting", "value": 60.0, "expected_register": 3600, "description": "溫度 60℃ → 3600"},
        {"parameter": "fan_speed", "value": 0.0, "expected_register": 3000, "description": "風扇 0% → 3000"},
        {"parameter": "fan_speed", "value": 100.0, "expected_register": 3100, "description": "風扇 100% → 3100"},
        {"parameter": "flow_setting", "value": 30.0, "expected_register": 3300, "description": "流量 30 LPM → 3300"}
    ]
    
    for i, test in enumerate(conversion_tests, 1):
        print(f"\n{i}. 測試轉換: {test['description']}")
        
        try:
            response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/Values/Write",
                json={"parameter": test["parameter"], "value": test["value"]},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                register_value = result['register_value']
                
                if register_value == test['expected_register']:
                    print(f"   ✅ 轉換正確: {test['value']} → {register_value}")
                else:
                    print(f"   ❌ 轉換錯誤: 預期 {test['expected_register']}, 實際 {register_value}")
            else:
                print(f"   ❌ 寫入失敗: {response.text}")
                
        except Exception as e:
            print(f"   ❌ 測試失敗: {e}")

def test_value_verification():
    """測試數值驗證"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 數值驗證測試 ===")
    
    # 寫入一個測試值
    test_value = 45.5
    print(f"1. 寫入溫度設定: {test_value}℃")
    
    try:
        # 寫入數值
        write_response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Values/Write",
            json={"parameter": "temp_setting", "value": test_value},
            headers={"Content-Type": "application/json"}
        )
        
        if write_response.status_code == 200:
            write_result = write_response.json()
            print(f"   寫入狀態: {write_result['status']}")
            
            # 等待寫入生效
            time.sleep(2)
            
            # 驗證數值
            print("2. 驗證寫入結果")
            status_response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Values")
            
            if status_response.status_code == 200:
                status_result = status_response.json()
                temp_status = status_result['values_status']['temp_setting']
                
                print(f"   當前值: {temp_status['actual_value']} {temp_status['unit']}")
                print(f"   暫存器值: {temp_status['register_value']}")
                print(f"   狀態: {temp_status['status']}")
                
                if abs(temp_status['actual_value'] - test_value) < 0.1:
                    print("   ✅ 數值驗證成功")
                else:
                    print(f"   ⚠️ 數值可能有偏差: 預期 {test_value}, 實際 {temp_status['actual_value']}")
            else:
                print(f"   ❌ 狀態驗證失敗: {status_response.text}")
        else:
            print(f"   ❌ 寫入失敗: {write_response.text}")
            
    except Exception as e:
        print(f"   ❌ 驗證測試失敗: {e}")

def monitor_values():
    """監控數值狀態"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 數值狀態監控 (10秒) ===")
    
    start_time = time.time()
    check_count = 0
    
    while time.time() - start_time < 10:
        try:
            response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Values")
            if response.status_code == 200:
                result = response.json()
                values = result['values_status']
                
                check_count += 1
                timestamp = time.strftime('%H:%M:%S')
                
                # 顯示關鍵數值
                temp = values['temp_setting']['actual_value']
                flow = values['flow_setting']['actual_value']
                fan = values['fan_speed']['actual_value']
                
                print(f"[{timestamp}] 檢查#{check_count}: 溫度={temp}℃, 流量={flow}LPM, 風扇={fan}%")
                    
            else:
                print(f"[{time.strftime('%H:%M:%S')}] 讀取失敗: {response.status_code}")
                
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] 監控錯誤: {e}")
        
        time.sleep(2)

if __name__ == "__main__":
    # 等待服務啟動
    print("等待API服務啟動...")
    time.sleep(3)
    
    test_cdu_values_api()
    display_values_status()
    test_value_writing()
    test_invalid_values()
    test_value_conversion()
    test_value_verification()
    monitor_values()
    
    print("\n=== 測試完成 ===")
    print("CDU數值寫入API功能測試完成！")
