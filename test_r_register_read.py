#!/usr/bin/env python3
"""
測試R暫存器讀取功能
"""

import requests
import json
import time

def test_r_register_read_api():
    """測試R暫存器讀取API功能"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== R暫存器讀取功能測試 ===")
    
    # 1. 測試讀取單個R暫存器 (POST方式)
    print("\n1. 測試讀取單個R暫存器 (POST方式) - R10000")
    try:
        read_data = {
            "register_address": 10000
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Read",
            json=read_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("讀取結果:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 2. 測試讀取單個R暫存器 (GET方式)
    print("\n2. 測試讀取單個R暫存器 (GET方式) - R10001")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Registers/10001")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("讀取結果:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 3. 測試批量讀取R暫存器
    print("\n3. 測試批量讀取R暫存器 (R10000-R10004)")
    try:
        batch_data = {
            "start_address": 10000,
            "count": 5
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/ReadBatch",
            json=batch_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("批量讀取結果:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 4. 測試讀取更大範圍的R暫存器
    print("\n4. 測試讀取更大範圍的R暫存器 (R10500-R10509)")
    try:
        batch_data = {
            "start_address": 10500,
            "count": 10
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/ReadBatch",
            json=batch_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("大範圍讀取結果:")
            print(f"成功: {result['success']}")
            print(f"訊息: {result['message']}")
            print(f"起始地址: R{result['start_address']}")
            print(f"數量: {result['count']}")
            print("暫存器值:")
            for reg_key, reg_info in result['registers'].items():
                print(f"  {reg_key}: {reg_info['value']} (Modbus地址: {reg_info['modbus_address']})")
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 5. 測試地址範圍錯誤 (超出R10000-R11000範圍)
    print("\n5. 測試地址範圍錯誤 (R12000 - 超出讀取範圍)")
    try:
        read_data = {
            "register_address": 12000  # 超出讀取範圍
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Read",
            json=read_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        print(f"錯誤響應: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 6. 測試批量讀取數量錯誤 (超過125個)
    print("\n6. 測試批量讀取數量錯誤 (數量超過125)")
    try:
        batch_data = {
            "start_address": 10000,
            "count": 150  # 超過Modbus限制
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/ReadBatch",
            json=batch_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        print(f"錯誤響應: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 7. 測試GET方式的地址範圍錯誤
    print("\n7. 測試GET方式的地址範圍錯誤 (R9999)")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Registers/9999")
        print(f"狀態碼: {response.status_code}")
        print(f"錯誤響應: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

def test_edge_cases():
    """測試邊界情況"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 邊界情況測試 ===")
    
    # 測試邊界地址
    test_cases = [
        {"address": 10000, "desc": "最小地址 R10000"},
        {"address": 11000, "desc": "最大地址 R11000"},
        {"address": 10500, "desc": "中間地址 R10500"}
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"\n{i}. {case['desc']}")
        try:
            response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Registers/{case['address']}")
            print(f"狀態碼: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"成功: R{result['register_address']} = {result['value']}")
            else:
                print(f"失敗: {response.text}")
        except Exception as e:
            print(f"請求失敗: {e}")
    
    # 測試批量讀取邊界
    print(f"\n4. 批量讀取邊界測試 (R10995-R11000, 6個暫存器)")
    try:
        batch_data = {
            "start_address": 10995,
            "count": 6
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/ReadBatch",
            json=batch_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"成功: 讀取了{result['count']}個暫存器")
            print("暫存器值:")
            for reg_key, reg_info in result['registers'].items():
                print(f"  {reg_key}: {reg_info['value']}")
        else:
            print(f"失敗: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

if __name__ == "__main__":
    # 等待服務啟動
    print("等待API服務啟動...")
    time.sleep(3)
    
    test_r_register_read_api()
    test_edge_cases()
    
    print("\n=== 測試完成 ===")
    print("注意: 如果PLC未連接，讀取操作可能會失敗，但API功能正常。")
