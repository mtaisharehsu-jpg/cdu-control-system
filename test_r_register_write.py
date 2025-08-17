#!/usr/bin/env python3
"""
測試R暫存器寫入功能
"""

import requests
import json
import time

def test_r_register_api():
    """測試R暫存器API功能"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== R暫存器寫入功能測試 ===")
    
    # 1. 測試獲取R暫存器信息
    print("\n1. 測試獲取R暫存器信息")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Registers")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("R暫存器信息:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 2. 測試寫入單個R暫存器
    print("\n2. 測試寫入單個R暫存器 (R10500)")
    try:
        write_data = {
            "register_address": 10500,
            "value": 1234
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Write",
            json=write_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("寫入結果:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 3. 測試寫入另一個R暫存器
    print("\n3. 測試寫入另一個R暫存器 (R10501)")
    try:
        write_data = {
            "register_address": 10501,
            "value": 5678
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Write",
            json=write_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("寫入結果:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 4. 測試批量寫入R暫存器
    print("\n4. 測試批量寫入R暫存器 (R10502-R10504)")
    try:
        batch_data = {
            "start_address": 10502,
            "values": [100, 200, 300]
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/WriteBatch",
            json=batch_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("批量寫入結果:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 5. 測試地址範圍錯誤
    print("\n5. 測試地址範圍錯誤 (R10000 - 超出寫入範圍)")
    try:
        write_data = {
            "register_address": 10000,  # 超出寫入範圍
            "value": 999
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Write",
            json=write_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        print(f"錯誤響應: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 6. 測試值範圍錯誤
    print("\n6. 測試值範圍錯誤 (值超過65535)")
    try:
        write_data = {
            "register_address": 10500,
            "value": 70000  # 超過16位範圍
        }
        response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Write",
            json=write_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"狀態碼: {response.status_code}")
        print(f"錯誤響應: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")
    
    # 7. 再次檢查R暫存器信息，查看緩存的值
    print("\n7. 檢查寫入後的R暫存器信息")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Registers")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("緩存的R暫存器值:")
            cached_values = data.get("cached_values", {})
            if cached_values:
                for reg, value in sorted(cached_values.items()):
                    print(f"  {reg}: {value}")
            else:
                print("  無緩存值")
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

if __name__ == "__main__":
    # 等待服務啟動
    print("等待API服務啟動...")
    time.sleep(3)
    
    test_r_register_api()
    
    print("\n=== 測試完成 ===")
    print("注意: 如果PLC未連接，寫入操作可能會失敗，但API功能正常。")
