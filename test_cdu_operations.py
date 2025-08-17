#!/usr/bin/env python3
"""
測試CDU操作設置API功能
"""

import requests
import json
import time

def test_cdu_operations_api():
    """測試CDU操作設置API"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== CDU操作設置API測試 ===")
    
    # 1. 測試獲取操作狀態
    print("\n1. 測試獲取操作狀態")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Operations")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("CDU操作狀態:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

def display_operations_status():
    """顯示操作狀態詳情"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== CDU操作狀態詳情 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Operations")
        if response.status_code != 200:
            print(f"無法獲取操作狀態: {response.text}")
            return
        
        result = response.json()
        operations = result['operations_status']
        
        print("操作設置狀態:")
        for op_name, op_info in operations.items():
            status_icon = "🟢" if op_info['is_active'] else "⚪"
            print(f"{status_icon} {op_name}: {op_info['description']}")
            print(f"   暫存器: R{op_info['register_address']}")
            print(f"   預期值: {op_info['expected_value']}")
            print(f"   當前值: {op_info['current_value']}")
            print(f"   狀態: {op_info['status']}")
            if 'error' in op_info:
                print(f"   錯誤: {op_info['error']}")
            print()
        
    except Exception as e:
        print(f"處理失敗: {e}")

def test_operation_execution():
    """測試操作執行"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 操作執行測試 ===")
    
    # 測試各種操作
    operations_to_test = [
        {"operation": "start", "description": "CDU遠端啟動"},
        {"operation": "stop", "description": "CDU遠端停止"},
        {"operation": "fan_start", "description": "風扇遠端手動強制啟動"},
        {"operation": "fan_stop", "description": "風扇遠端手動強制停止"}
    ]
    
    for i, op_test in enumerate(operations_to_test, 1):
        print(f"\n{i}. 測試操作: {op_test['description']}")
        
        try:
            # 執行操作
            response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/Operations/Execute",
                json={"operation": op_test["operation"]},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ 操作成功")
                print(f"   暫存器: R{result['register_address']}")
                print(f"   寫入值: {result['value_written']}")
                print(f"   狀態: {result['status']}")
            else:
                print(f"   ❌ 操作失敗: {response.text}")
                
        except Exception as e:
            print(f"   ❌ 請求失敗: {e}")
        
        # 等待一下再執行下一個操作
        time.sleep(2)

def test_invalid_operations():
    """測試無效操作"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 無效操作測試 ===")
    
    invalid_operations = [
        "invalid_op",
        "restart",
        "emergency_stop",
        ""
    ]
    
    for i, invalid_op in enumerate(invalid_operations, 1):
        print(f"\n{i}. 測試無效操作: '{invalid_op}'")
        
        try:
            response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/Operations/Execute",
                json={"operation": invalid_op},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   狀態碼: {response.status_code}")
            
            if response.status_code == 400:
                result = response.json()
                print(f"   ✅ 正確拒絕無效操作")
                print(f"   錯誤信息: {result.get('detail', '未知錯誤')}")
            else:
                print(f"   ⚠️ 未預期的響應: {response.text}")
                
        except Exception as e:
            print(f"   ❌ 請求失敗: {e}")

def test_operation_verification():
    """測試操作驗證"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 操作驗證測試 ===")
    
    # 執行啟動操作
    print("1. 執行CDU啟動操作")
    try:
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Operations/Execute",
            json={"operation": "start"},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"   操作執行: {result['status']}")
            
            # 等待操作生效
            time.sleep(2)
            
            # 驗證操作狀態
            print("2. 驗證操作狀態")
            status_response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Operations")
            
            if status_response.status_code == 200:
                status_result = status_response.json()
                start_status = status_result['operations_status']['start']
                
                print(f"   啟動狀態: {start_status['status']}")
                print(f"   是否啟動: {'是' if start_status['is_active'] else '否'}")
                print(f"   當前值: {start_status['current_value']}")
                print(f"   預期值: {start_status['expected_value']}")
                
                if start_status['is_active']:
                    print("   ✅ 操作驗證成功")
                else:
                    print("   ⚠️ 操作可能未完全生效")
            else:
                print(f"   ❌ 狀態驗證失敗: {status_response.text}")
        else:
            print(f"   ❌ 操作執行失敗: {response.text}")
            
    except Exception as e:
        print(f"   ❌ 驗證測試失敗: {e}")

def test_register_values():
    """測試暫存器值"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 暫存器值測試 ===")
    
    # 測試讀取操作暫存器
    operation_registers = [10501, 10502, 10503, 10504]
    operation_names = ["啟動", "停止", "風扇啟動", "風扇停止"]
    
    for i, (register, name) in enumerate(zip(operation_registers, operation_names)):
        print(f"\n{i+1}. 讀取R{register} ({name})")
        
        try:
            response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Read",
                json={"register_address": register},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                value = result['value']
                print(f"   當前值: {value}")
                
                # 判斷操作狀態
                if register in [10501, 10503] and value == 2321:
                    print(f"   狀態: ✅ {name}已啟動")
                elif register in [10502, 10504] and value == 2322:
                    print(f"   狀態: ✅ {name}已執行")
                else:
                    print(f"   狀態: ⚪ {name}未啟動")
            else:
                print(f"   ❌ 讀取失敗: {response.text}")
                
        except Exception as e:
            print(f"   ❌ 讀取錯誤: {e}")

def monitor_operations():
    """監控操作狀態"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 操作狀態監控 (10秒) ===")
    
    start_time = time.time()
    check_count = 0
    
    while time.time() - start_time < 10:
        try:
            response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Operations")
            if response.status_code == 200:
                result = response.json()
                operations = result['operations_status']
                
                check_count += 1
                timestamp = time.strftime('%H:%M:%S')
                
                active_ops = []
                for op_name, op_info in operations.items():
                    if op_info['is_active']:
                        active_ops.append(f"{op_name}({op_info['current_value']})")
                
                if active_ops:
                    print(f"[{timestamp}] 檢查#{check_count}: 活躍操作: {', '.join(active_ops)}")
                else:
                    print(f"[{timestamp}] 檢查#{check_count}: 無活躍操作")
                    
            else:
                print(f"[{time.strftime('%H:%M:%S')}] 讀取失敗: {response.status_code}")
                
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] 監控錯誤: {e}")
        
        time.sleep(2)

if __name__ == "__main__":
    # 等待服務啟動
    print("等待API服務啟動...")
    time.sleep(3)
    
    test_cdu_operations_api()
    display_operations_status()
    test_operation_execution()
    test_invalid_operations()
    test_operation_verification()
    test_register_values()
    monitor_operations()
    
    print("\n=== 測試完成 ===")
    print("CDU操作設置API功能測試完成！")
