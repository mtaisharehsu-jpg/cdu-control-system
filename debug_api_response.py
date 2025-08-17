#!/usr/bin/env python3
"""
診斷API響應腳本
檢查PLC1-Press12到PLC1-Press18的API響應數值
"""

import requests
import json

def test_api_response():
    """測試API響應中的壓力感測器數值"""
    
    try:
        # 調用API
        response = requests.get('http://localhost:8001/api/v1/sensors/readings')
        
        if response.status_code == 200:
            data = response.json()
            
            print("=== PLC壓力感測器API響應檢查 ===")
            
            # 篩選出PLC1-Press12到PLC1-Press18
            target_sensors = [f'PLC1-Press{i}' for i in range(12, 19)]
            
            for sensor_id in target_sensors:
                sensor_data = None
                for item in data:
                    if item.get('block_id') == sensor_id:
                        sensor_data = item
                        break
                
                if sensor_data:
                    print(f"{sensor_id}:")
                    print(f"  API回應值: {sensor_data.get('value')} {sensor_data.get('unit')}")
                    print(f"  狀態: {sensor_data.get('status')}")
                    print(f"  健康: {sensor_data.get('health')}")
                    print(f"  暫存器: {sensor_data.get('register')}")
                    print("")
                else:
                    print(f"{sensor_id}: 未找到數據")
            
            # 檢查是否有重複數值
            print("=== 數值重複檢查 ===")
            values = {}
            for item in data:
                block_id = item.get('block_id')
                if block_id and 'Press1' in block_id and len(block_id) > 10:  # PLC1-Press1X
                    value = item.get('value')
                    if value in values:
                        values[value].append(block_id)
                    else:
                        values[value] = [block_id]
            
            for value, block_ids in values.items():
                if len(block_ids) > 1:
                    print(f"重複數值 {value}: {block_ids}")
                    
        else:
            print(f"API請求失敗: {response.status_code}")
            
    except Exception as e:
        print(f"錯誤: {e}")

if __name__ == "__main__":
    test_api_response()