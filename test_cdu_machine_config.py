#!/usr/bin/env python3
"""
測試CDU機種配置API功能
"""

import requests
import json
import time

def test_machine_config_api():
    """測試CDU機種配置API"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== CDU機種配置API測試 ===")
    
    # 1. 測試獲取所有機種配置
    print("\n1. 測試獲取所有機種配置")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("機種配置列表:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

def display_machine_configs():
    """顯示機種配置詳情"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 機種配置詳情 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig")
        if response.status_code != 200:
            print(f"無法獲取機種配置: {response.text}")
            return
        
        result = response.json()
        machine_configs = result['machine_configs']
        current_machine = result['current_machine']
        
        print(f"當前使用機種: {current_machine}")
        print(f"總機種數量: {result['total_machines']}")
        
        print("\n可用機種:")
        for machine_type, config in machine_configs.items():
            current_icon = "🟢" if machine_type == current_machine else "⚪"
            print(f"{current_icon} {machine_type}: {config['machine_name']}")
            print(f"   描述: {config['description']}")
            
            # 統計感測器數量
            sensor_config = config['sensor_config']
            total_sensors = 0
            for sensor_type, type_config in sensor_config.items():
                sensor_count = len(type_config.get('sensors', {}))
                total_sensors += sensor_count
                print(f"   {sensor_type}: {sensor_count}個感測器")
            
            print(f"   總感測器數: {total_sensors}")
            print(f"   創建時間: {config.get('created_time', 'N/A')}")
            print()
        
    except Exception as e:
        print(f"處理失敗: {e}")

def test_create_custom_machine():
    """測試創建自定義機種"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 創建自定義機種測試 ===")
    
    # 定義自定義機種配置
    custom_config = {
        "machine_type": "cdu_test",
        "machine_name": "測試CDU機種",
        "description": "用於測試的自定義CDU機種配置",
        "sensor_config": {
            "temperature": {
                "name": "溫度訊息",
                "sensors": {
                    "test_temp_t1": {
                        "register": 10111,
                        "description": "測試溫度T1",
                        "precision": 0.1,
                        "range": "100~800 (對應10~80℃)",
                        "unit": "℃",
                        "min_raw": 100,
                        "max_raw": 800,
                        "min_actual": 10.0,
                        "max_actual": 80.0,
                        "conversion_factor": 0.1
                    },
                    "test_temp_t2": {
                        "register": 10112,
                        "description": "測試溫度T2",
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
            "pressure": {
                "name": "壓力訊息",
                "sensors": {
                    "test_pressure_p1": {
                        "register": 10082,
                        "description": "測試壓力P1",
                        "precision": 0.01,
                        "range": "5~600 (對應0.05~6bar)",
                        "unit": "bar",
                        "min_raw": 5,
                        "max_raw": 600,
                        "min_actual": 0.05,
                        "max_actual": 6.0,
                        "conversion_factor": 0.01
                    }
                }
            },
            "flow": {
                "name": "流量訊息",
                "sensors": {
                    "test_flow_f1": {
                        "register": 10062,
                        "description": "測試流量F1",
                        "precision": 1,
                        "range": "0~700 (對應0~70LPM)",
                        "unit": "LPM",
                        "min_raw": 0,
                        "max_raw": 700,
                        "min_actual": 0,
                        "max_actual": 70,
                        "conversion_factor": 0.1
                    }
                }
            },
            "io": {
                "name": "輸入輸出訊息",
                "sensors": {
                    "test_switch_x1": {
                        "register": 10141,
                        "description": "測試開關X1",
                        "precision": 0,
                        "range": "0~1",
                        "unit": "",
                        "status_map": {0: "關閉", 1: "開啟"}
                    }
                }
            }
        }
    }
    
    print("創建自定義機種配置...")
    try:
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig",
            json=custom_config,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 機種創建成功")
            print(f"機種類型: {result['machine_type']}")
            print(f"機種名稱: {result['machine_name']}")
            print(f"描述: {result['description']}")
        else:
            print(f"❌ 機種創建失敗: {response.text}")
            
    except Exception as e:
        print(f"❌ 請求失敗: {e}")

def test_switch_machine():
    """測試切換機種"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 機種切換測試 ===")
    
    # 測試切換到不同機種
    test_machines = ["cdu_compact", "cdu_advanced", "cdu_test", "default"]
    
    for machine_type in test_machines:
        print(f"\n切換到機種: {machine_type}")
        
        try:
            response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig/Set",
                json={"machine_type": machine_type},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"  狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"  ✅ 切換成功")
                print(f"  當前機種: {result['machine_type']}")
                print(f"  機種名稱: {result['machine_name']}")
                
                # 驗證切換結果
                time.sleep(1)
                verify_response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig")
                if verify_response.status_code == 200:
                    verify_result = verify_response.json()
                    current_machine = verify_result['current_machine']
                    if current_machine == machine_type:
                        print(f"  ✅ 切換驗證成功")
                    else:
                        print(f"  ⚠️ 切換驗證失敗: 預期 {machine_type}, 實際 {current_machine}")
            else:
                print(f"  ❌ 切換失敗: {response.text}")
                
        except Exception as e:
            print(f"  ❌ 請求失敗: {e}")

def test_sensor_config_effect():
    """測試機種配置對感測器的影響"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 機種配置影響測試 ===")
    
    # 測試不同機種的感測器配置
    test_machines = ["cdu_compact", "cdu_advanced"]
    
    for machine_type in test_machines:
        print(f"\n測試機種: {machine_type}")
        
        # 切換到指定機種
        try:
            switch_response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig/Set",
                json={"machine_type": machine_type}
            )
            
            if switch_response.status_code == 200:
                print(f"  已切換到 {machine_type}")
                
                # 等待配置生效
                time.sleep(2)
                
                # 讀取感測器數據
                sensor_response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Sensors")
                
                if sensor_response.status_code == 200:
                    sensor_result = sensor_response.json()
                    sensor_summary = sensor_result.get("sensor_summary", {})
                    
                    print(f"  總感測器數: {sensor_summary['total_sensors']}")
                    print(f"  正常感測器數: {sensor_summary['active_sensors']}")
                    
                    # 顯示各類型感測器數量
                    sensor_types = sensor_summary.get("sensor_types", {})
                    for type_name, type_summary in sensor_types.items():
                        print(f"    {type_name}: {type_summary['count']}個")
                else:
                    print(f"  ❌ 讀取感測器失敗: {sensor_response.text}")
            else:
                print(f"  ❌ 切換機種失敗: {switch_response.text}")
                
        except Exception as e:
            print(f"  ❌ 測試失敗: {e}")

def test_delete_machine():
    """測試刪除機種配置"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 刪除機種配置測試 ===")
    
    # 先確保不是當前使用的機種
    print("1. 切換到默認機種")
    try:
        switch_response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig/Set",
            json={"machine_type": "default"}
        )
        
        if switch_response.status_code == 200:
            print("  ✅ 已切換到默認機種")
        else:
            print(f"  ❌ 切換失敗: {switch_response.text}")
            return
    except Exception as e:
        print(f"  ❌ 切換失敗: {e}")
        return
    
    # 嘗試刪除測試機種
    print("2. 刪除測試機種 cdu_test")
    try:
        delete_response = requests.delete(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig/cdu_test")
        
        print(f"  狀態碼: {delete_response.status_code}")
        
        if delete_response.status_code == 200:
            result = delete_response.json()
            print(f"  ✅ 刪除成功")
            print(f"  已刪除機種: {result['machine_type']}")
        else:
            print(f"  ❌ 刪除失敗: {delete_response.text}")
            
    except Exception as e:
        print(f"  ❌ 請求失敗: {e}")
    
    # 嘗試刪除當前使用的機種 (應該失敗)
    print("3. 嘗試刪除當前使用的機種 (應該失敗)")
    try:
        delete_response = requests.delete(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig/default")
        
        print(f"  狀態碼: {delete_response.status_code}")
        
        if delete_response.status_code == 400:
            print(f"  ✅ 正確拒絕刪除當前機種")
            print(f"  錯誤信息: {delete_response.json().get('detail', '未知錯誤')}")
        else:
            print(f"  ⚠️ 未預期的響應: {delete_response.text}")
            
    except Exception as e:
        print(f"  ❌ 請求失敗: {e}")

def display_final_status():
    """顯示最終狀態"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 最終狀態 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig")
        if response.status_code == 200:
            result = response.json()
            
            print(f"當前機種: {result['current_machine']}")
            print(f"可用機種數量: {result['total_machines']}")
            
            print("\n可用機種列表:")
            for machine_type, config in result['machine_configs'].items():
                current_icon = "🟢" if machine_type == result['current_machine'] else "⚪"
                print(f"  {current_icon} {machine_type}: {config['machine_name']}")
        else:
            print(f"無法獲取最終狀態: {response.text}")
            
    except Exception as e:
        print(f"獲取最終狀態失敗: {e}")

if __name__ == "__main__":
    # 等待服務啟動
    print("等待API服務啟動...")
    time.sleep(3)
    
    test_machine_config_api()
    display_machine_configs()
    test_create_custom_machine()
    test_switch_machine()
    test_sensor_config_effect()
    test_delete_machine()
    display_final_status()
    
    print("\n=== 測試完成 ===")
    print("CDU機種配置API功能測試完成！")
