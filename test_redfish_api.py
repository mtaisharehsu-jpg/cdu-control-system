#!/usr/bin/env python3
"""
測試Redfish API功能
"""

import requests
import json
import time

def test_redfish_api():
    """測試Redfish API"""
    base_url = "http://localhost:8001"
    
    print("=== 測試Redfish API ===")
    
    # 測試服務根目錄
    print("\n1. 測試服務根目錄:")
    try:
        response = requests.get(f"{base_url}/redfish/v1/")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"連接錯誤: {e}")
    
    # 測試系統集合
    print("\n2. 測試系統集合:")
    try:
        response = requests.get(f"{base_url}/redfish/v1/Systems")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"連接錯誤: {e}")
    
    # 測試CDU1系統信息
    print("\n3. 測試CDU1系統信息:")
    try:
        response = requests.get(f"{base_url}/redfish/v1/Systems/CDU1")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"連接錯誤: {e}")
    
    # 測試機箱集合
    print("\n4. 測試機箱集合:")
    try:
        response = requests.get(f"{base_url}/redfish/v1/Chassis")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"連接錯誤: {e}")
    
    # 測試CDU1機箱信息
    print("\n5. 測試CDU1機箱信息:")
    try:
        response = requests.get(f"{base_url}/redfish/v1/Chassis/CDU1")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"連接錯誤: {e}")
    
    # 測試熱管理信息
    print("\n6. 測試熱管理信息:")
    try:
        response = requests.get(f"{base_url}/redfish/v1/Chassis/CDU1/Thermal")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"連接錯誤: {e}")
    
    # 測試電源信息
    print("\n7. 測試電源信息:")
    try:
        response = requests.get(f"{base_url}/redfish/v1/Chassis/CDU1/Power")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"連接錯誤: {e}")

def test_basic_api():
    """測試基本API是否正常"""
    base_url = "http://localhost:8001"
    
    print("=== 測試基本API ===")
    
    try:
        response = requests.get(f"{base_url}/")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"連接錯誤: {e}")

if __name__ == "__main__":
    print("等待服務啟動...")
    time.sleep(2)
    
    test_basic_api()
    test_redfish_api()
