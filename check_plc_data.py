#!/usr/bin/env python3
"""
檢查PLC R暫存器數據讀取狀況
"""

import requests
import json
import time

def check_plc_data():
    """檢查PLC數據"""
    print("=== R暫存器數據檢查 ===")
    
    try:
        # 獲取系統信息
        response = requests.get('http://localhost:8001/redfish/v1/Systems/CDU1')
        if response.status_code != 200:
            print(f"API請求失敗: {response.status_code}")
            return
        
        data = response.json()
        reg_data = data['Oem']['CDU']['RegisterData']
        
        print(f"暫存器數量: {len(reg_data)}")
        print(f"最後更新時間: {data['Oem']['CDU']['LastUpdate']}")
        print(f"系統電源狀態: {data['PowerState']}")
        print(f"系統健康狀態: {data['Status']['Health']}")
        
        print("\n=== R10000-R10010 暫存器詳細數據 ===")
        for i in range(11):  # R10000-R10010
            key = f"R{10000 + i}"
            if key in reg_data:
                info = reg_data[key]
                print(f"{key}: {info['name']} = {info['value']} (暫存器{info['register']})")
            else:
                print(f"{key}: 數據缺失")
        
        # 檢查數據是否為模擬數據
        if reg_data:
            print(f"\n=== 數據來源分析 ===")
            # 檢查是否有動態變化的數據
            r10002_temp = reg_data.get('R10002', {}).get('value', 0)
            r10006_current = reg_data.get('R10006', {}).get('value', 0)
            r10007_voltage = reg_data.get('R10007', {}).get('value', 0)
            r10008_power = reg_data.get('R10008', {}).get('value', 0)
            
            print(f"溫度值: {r10002_temp}°C")
            print(f"電流值: {r10006_current}A")
            print(f"電壓值: {r10007_voltage}V")
            print(f"功率值: {r10008_power}W")
            
            # 判斷數據來源
            if (20 <= r10002_temp <= 30 and 
                50 <= r10006_current <= 100 and 
                220 <= r10007_voltage <= 240 and 
                500 <= r10008_power <= 1000):
                print("數據來源: 可能是模擬數據 (數值在預期範圍內)")
            else:
                print("數據來源: 可能是實際PLC數據")
        else:
            print("⚠️ 警告: 沒有暫存器數據")
    
    except Exception as e:
        print(f"檢查失敗: {e}")

def check_multiple_times():
    """多次檢查以觀察數據變化"""
    print("=== 連續檢查數據變化 ===")
    
    for i in range(3):
        print(f"\n--- 第 {i+1} 次檢查 ---")
        check_plc_data()
        if i < 2:
            print("等待5秒...")
            time.sleep(5)

if __name__ == "__main__":
    check_multiple_times()
