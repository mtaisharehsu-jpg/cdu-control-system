#!/usr/bin/env python3
"""
簡化的CDU機種配置API測試
"""

import requests
import json
import time

def test_get_machine_configs():
    """測試獲取機種配置"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== 獲取機種配置測試 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig")
        print(f"狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 獲取成功")
            print(f"當前機種: {result['current_machine']}")
            print(f"總機種數量: {result['total_machines']}")
            
            print("\n可用機種:")
            for machine_type, config in result['machine_configs'].items():
                current_icon = "🟢" if machine_type == result['current_machine'] else "⚪"
                print(f"  {current_icon} {machine_type}: {config['machine_name']}")
                print(f"     描述: {config['description']}")
                
                # 統計感測器數量
                sensor_config = config['sensor_config']
                total_sensors = 0
                for sensor_type, type_config in sensor_config.items():
                    sensor_count = len(type_config.get('sensors', {}))
                    total_sensors += sensor_count
                
                print(f"     感測器總數: {total_sensors}")
            
            return True
        else:
            print(f"❌ 獲取失敗: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 請求失敗: {e}")
        return False

def test_switch_machine():
    """測試切換機種"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 機種切換測試 ===")
    
    # 測試切換到緊湊型CDU
    print("1. 切換到緊湊型CDU")
    try:
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig/Set",
            json={"machine_type": "cdu_compact"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ 切換成功到: {result['machine_name']}")
        else:
            print(f"   ❌ 切換失敗: {response.text}")
            
    except Exception as e:
        print(f"   ❌ 請求失敗: {e}")
    
    # 等待配置生效
    time.sleep(2)
    
    # 驗證切換結果
    print("2. 驗證切換結果")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig")
        if response.status_code == 200:
            result = response.json()
            current_machine = result['current_machine']
            if current_machine == "cdu_compact":
                print(f"   ✅ 切換驗證成功: {current_machine}")
            else:
                print(f"   ⚠️ 切換驗證失敗: 預期 cdu_compact, 實際 {current_machine}")
        else:
            print(f"   ❌ 驗證失敗: {response.text}")
    except Exception as e:
        print(f"   ❌ 驗證失敗: {e}")

def test_sensor_config_effect():
    """測試機種配置對感測器的影響"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 感測器配置影響測試 ===")
    
    # 測試不同機種的感測器數量
    machines_to_test = [
        ("cdu_compact", "緊湊型CDU"),
        ("cdu_advanced", "高級CDU"),
        ("default", "標準CDU")
    ]
    
    for machine_type, machine_name in machines_to_test:
        print(f"\n測試 {machine_name} ({machine_type}):")
        
        # 切換機種
        try:
            switch_response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig/Set",
                json={"machine_type": machine_type},
                headers={"Content-Type": "application/json"}
            )
            
            if switch_response.status_code == 200:
                print(f"  ✅ 已切換到 {machine_name}")
                
                # 等待配置生效
                time.sleep(2)
                
                # 讀取感測器數據
                sensor_response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Sensors")
                
                if sensor_response.status_code == 200:
                    sensor_result = sensor_response.json()
                    sensor_summary = sensor_result.get("sensor_summary", {})
                    
                    print(f"  總感測器數: {sensor_summary['total_sensors']}")
                    print(f"  正常感測器數: {sensor_summary['active_sensors']}")
                    print(f"  錯誤感測器數: {sensor_summary['error_sensors']}")
                    
                    # 顯示各類型感測器數量
                    sensor_types = sensor_summary.get("sensor_types", {})
                    for type_name, type_summary in sensor_types.items():
                        print(f"    {type_name}: {type_summary['count']}個 (正常:{type_summary['active']})")
                else:
                    print(f"  ❌ 讀取感測器失敗: {sensor_response.text}")
            else:
                print(f"  ❌ 切換機種失敗: {switch_response.text}")
                
        except Exception as e:
            print(f"  ❌ 測試失敗: {e}")

def test_create_simple_machine():
    """測試創建簡單機種"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 創建簡單機種測試 ===")
    
    # 定義簡單的機種配置
    simple_config = {
        "machine_type": "cdu_simple",
        "machine_name": "簡單CDU機種",
        "description": "只包含基本感測器的簡單CDU機種",
        "sensor_config": {
            "temperature": {
                "name": "溫度訊息",
                "sensors": {
                    "main_temp": {
                        "register": 10111,
                        "description": "主要溫度",
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
                    "main_pressure": {
                        "register": 10082,
                        "description": "主要壓力",
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
                    "main_flow": {
                        "register": 10062,
                        "description": "主要流量",
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
                    "main_switch": {
                        "register": 10141,
                        "description": "主要開關",
                        "precision": 0,
                        "range": "0~1",
                        "unit": "",
                        "status_map": {0: "關閉", 1: "開啟"}
                    }
                }
            }
        }
    }
    
    print("創建簡單機種配置...")
    try:
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig",
            json=simple_config,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 機種創建成功")
            print(f"機種類型: {result['machine_type']}")
            print(f"機種名稱: {result['machine_name']}")
            
            # 測試切換到新創建的機種
            print("\n測試切換到新機種...")
            switch_response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig/Set",
                json={"machine_type": "cdu_simple"},
                headers={"Content-Type": "application/json"}
            )
            
            if switch_response.status_code == 200:
                print("✅ 成功切換到新機種")
                
                # 驗證感測器配置
                time.sleep(2)
                sensor_response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Sensors")
                if sensor_response.status_code == 200:
                    sensor_result = sensor_response.json()
                    sensor_summary = sensor_result.get("sensor_summary", {})
                    print(f"新機種感測器總數: {sensor_summary['total_sensors']}")
                    
            else:
                print(f"❌ 切換到新機種失敗: {switch_response.text}")
        else:
            print(f"❌ 機種創建失敗: {response.text}")
            
    except Exception as e:
        print(f"❌ 請求失敗: {e}")

def display_final_summary():
    """顯示最終摘要"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 最終摘要 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/MachineConfig")
        if response.status_code == 200:
            result = response.json()
            
            print(f"🎯 當前使用機種: {result['current_machine']}")
            print(f"📊 可用機種總數: {result['total_machines']}")
            
            print("\n📋 機種列表:")
            for machine_type, config in result['machine_configs'].items():
                current_icon = "🟢" if machine_type == result['current_machine'] else "⚪"
                print(f"  {current_icon} {machine_type}: {config['machine_name']}")
            
            print(f"\n✅ CDU機種配置系統運行正常！")
        else:
            print(f"❌ 無法獲取最終狀態: {response.text}")
            
    except Exception as e:
        print(f"❌ 獲取最終狀態失敗: {e}")

if __name__ == "__main__":
    print("CDU機種配置API簡化測試")
    print("=" * 40)
    
    # 等待服務啟動
    time.sleep(2)
    
    # 執行測試
    if test_get_machine_configs():
        test_switch_machine()
        test_sensor_config_effect()
        test_create_simple_machine()
        display_final_summary()
    else:
        print("❌ 基本功能測試失敗，跳過其他測試")
    
    print("\n🎉 測試完成！")
