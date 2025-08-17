#!/usr/bin/env python3
"""
測試CDU感測器API功能
"""

import requests
import json
import time

def test_cdu_sensors_api():
    """測試CDU感測器API"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== CDU感測器API測試 ===")
    
    # 1. 測試獲取所有感測器數據
    print("\n1. 測試獲取所有感測器數據")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Sensors")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("CDU感測器數據:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

def test_sensor_types():
    """測試各類型感測器"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 各類型感測器測試 ===")
    
    sensor_types = ["temperature", "pressure", "flow", "io"]
    
    for sensor_type in sensor_types:
        print(f"\n測試 {sensor_type} 感測器:")
        
        try:
            response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Sensors?sensor_type={sensor_type}")
            print(f"  狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                sensors_data = result.get("sensors_data", {})
                
                for type_key, type_info in sensors_data.items():
                    print(f"  類型: {type_info['type_name']}")
                    summary = type_info['summary']
                    print(f"  總數: {summary['count']}, 正常: {summary['active']}, 錯誤: {summary['errors']}")
                    
                    # 顯示前3個感測器
                    sensors = type_info['sensors']
                    count = 0
                    for sensor_name, sensor_info in sensors.items():
                        if count >= 3:
                            break
                        if not sensor_info.get('is_reserved', False):
                            status_icon = "🟢" if sensor_info['is_active'] else "🔴"
                            print(f"    {status_icon} {sensor_name}: {sensor_info['description']}")
                            print(f"       值: {sensor_info['actual_value']} {sensor_info['unit']}")
                            print(f"       狀態: {sensor_info['status']}")
                            count += 1
            else:
                print(f"  錯誤: {response.text}")
                
        except Exception as e:
            print(f"  請求失敗: {e}")

def test_specific_sensors():
    """測試特定感測器"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 特定感測器測試 ===")
    
    # 測試重要的感測器
    important_sensors = [
        {"type": "temperature", "name": "secondary_return_temp_t11", "desc": "二次側回水溫度T11"},
        {"type": "temperature", "name": "secondary_tank_temp_t12", "desc": "二次側水箱溫度T12"},
        {"type": "pressure", "name": "secondary_inlet_pressure_p12", "desc": "二次側入水壓力P12"},
        {"type": "flow", "name": "secondary_outlet_flow_f2", "desc": "二次側出水量F2"},
        {"type": "io", "name": "tank_level_switch_x17", "desc": "二次側水箱液位開關X17"}
    ]
    
    for sensor in important_sensors:
        print(f"\n測試: {sensor['desc']}")
        
        try:
            response = requests.get(
                f"{base_url}/Systems/CDU1/Oem/CDU/Sensors",
                params={"sensor_type": sensor["type"], "sensor_name": sensor["name"]}
            )
            
            print(f"  狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                sensors_data = result.get("sensors_data", {})
                
                for type_info in sensors_data.values():
                    sensors = type_info['sensors']
                    if sensor["name"] in sensors:
                        sensor_info = sensors[sensor["name"]]
                        print(f"  暫存器: R{sensor_info['register_address']}")
                        print(f"  原始值: {sensor_info['raw_value']}")
                        print(f"  實際值: {sensor_info['actual_value']} {sensor_info['unit']}")
                        print(f"  狀態: {sensor_info['status']}")
                        print(f"  範圍: {sensor_info.get('range', 'N/A')}")
            else:
                print(f"  錯誤: {response.text}")
                
        except Exception as e:
            print(f"  請求失敗: {e}")

def test_batch_read():
    """測試批量讀取"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 批量讀取測試 ===")
    
    # 測試批量讀取多種類型
    test_cases = [
        {
            "sensor_types": ["temperature", "pressure"],
            "include_reserved": False,
            "description": "溫度和壓力感測器 (不含預留)"
        },
        {
            "sensor_types": ["flow", "io"],
            "include_reserved": True,
            "description": "流量和IO感測器 (含預留)"
        },
        {
            "sensor_types": ["temperature", "pressure", "flow", "io"],
            "include_reserved": False,
            "description": "所有感測器 (不含預留)"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. 測試: {test_case['description']}")
        
        try:
            response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/Sensors/BatchRead",
                json={
                    "sensor_types": test_case["sensor_types"],
                    "include_reserved": test_case["include_reserved"]
                },
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                batch_summary = result.get("batch_summary", {})
                
                print(f"   總感測器數: {batch_summary['total_sensors']}")
                print(f"   正常感測器數: {batch_summary['active_sensors']}")
                print(f"   錯誤感測器數: {batch_summary['error_sensors']}")
                print(f"   感測器類型數: {batch_summary['sensor_types_count']}")
                print(f"   包含預留: {'是' if result['include_reserved'] else '否'}")
                
                # 顯示各類型摘要
                sensors_data = result.get("sensors_data", {})
                for type_key, type_info in sensors_data.items():
                    summary = type_info['summary']
                    print(f"   {type_info['type_name']}: {summary['count']}個 (正常:{summary['active']}, 錯誤:{summary['errors']})")
            else:
                print(f"   錯誤: {response.text}")
                
        except Exception as e:
            print(f"   請求失敗: {e}")

def test_sensor_post_read():
    """測試POST方式讀取感測器"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== POST方式讀取測試 ===")
    
    test_requests = [
        {"sensor_type": "temperature", "description": "讀取所有溫度感測器"},
        {"sensor_type": "pressure", "sensor_name": "secondary_inlet_pressure_p12", "description": "讀取特定壓力感測器"},
        {"sensor_type": "io", "description": "讀取所有IO感測器"}
    ]
    
    for i, test_req in enumerate(test_requests, 1):
        print(f"\n{i}. 測試: {test_req['description']}")
        
        try:
            response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/Sensors/Read",
                json=test_req,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                sensor_summary = result.get("sensor_summary", {})
                
                print(f"   總感測器數: {sensor_summary['total_sensors']}")
                print(f"   正常感測器數: {sensor_summary['active_sensors']}")
                print(f"   錯誤感測器數: {sensor_summary['error_sensors']}")
                
                # 顯示感測器詳情
                sensors_data = result.get("sensors_data", {})
                for type_info in sensors_data.values():
                    sensors = type_info['sensors']
                    active_sensors = [name for name, info in sensors.items() if info.get('is_active', False)]
                    if active_sensors:
                        print(f"   正常感測器: {', '.join(active_sensors[:3])}")
                        if len(active_sensors) > 3:
                            print(f"   ... 還有 {len(active_sensors) - 3} 個")
            else:
                print(f"   錯誤: {response.text}")
                
        except Exception as e:
            print(f"   請求失敗: {e}")

def display_sensor_summary():
    """顯示感測器摘要"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 感測器摘要 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Sensors")
        if response.status_code != 200:
            print(f"無法獲取感測器數據: {response.text}")
            return
        
        result = response.json()
        sensor_summary = result.get("sensor_summary", {})
        
        print(f"總感測器數量: {sensor_summary['total_sensors']}")
        print(f"正常感測器數量: {sensor_summary['active_sensors']}")
        print(f"錯誤感測器數量: {sensor_summary['error_sensors']}")
        
        print("\n各類型感測器統計:")
        sensor_types = sensor_summary.get("sensor_types", {})
        for type_name, type_summary in sensor_types.items():
            print(f"  {type_name}: {type_summary['count']}個 (正常:{type_summary['active']}, 錯誤:{type_summary['errors']})")
        
        # 顯示關鍵感測器狀態
        print("\n關鍵感測器狀態:")
        sensors_data = result.get("sensors_data", {})
        
        key_sensors = [
            ("temperature", "secondary_return_temp_t11", "回水溫度"),
            ("temperature", "secondary_tank_temp_t12", "水箱溫度"),
            ("pressure", "secondary_inlet_pressure_p12", "入水壓力"),
            ("flow", "secondary_outlet_flow_f2", "出水流量"),
            ("io", "tank_level_switch_x17", "液位開關")
        ]
        
        for sensor_type, sensor_name, display_name in key_sensors:
            if sensor_type in sensors_data:
                sensors = sensors_data[sensor_type]['sensors']
                if sensor_name in sensors:
                    sensor_info = sensors[sensor_name]
                    status_icon = "🟢" if sensor_info['is_active'] else "🔴"
                    print(f"  {status_icon} {display_name}: {sensor_info['actual_value']} {sensor_info['unit']} ({sensor_info['status']})")
        
    except Exception as e:
        print(f"處理失敗: {e}")

if __name__ == "__main__":
    # 等待服務啟動
    print("等待API服務啟動...")
    time.sleep(3)
    
    test_cdu_sensors_api()
    test_sensor_types()
    test_specific_sensors()
    test_batch_read()
    test_sensor_post_read()
    display_sensor_summary()
    
    print("\n=== 測試完成 ===")
    print("CDU感測器API功能測試完成！")
