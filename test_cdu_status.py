#!/usr/bin/env python3
"""
測試CDU機組狀態API功能
"""

import requests
import json
import time

def test_cdu_status_api():
    """測試CDU機組狀態API"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("=== CDU機組狀態API測試 ===")
    
    # 1. 測試獲取CDU機組狀態
    print("\n1. 測試獲取CDU機組狀態")
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Status")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("CDU機組狀態:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤: {response.text}")
    except Exception as e:
        print(f"請求失敗: {e}")

def display_cdu_status_details():
    """詳細顯示CDU狀態信息"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== CDU機組狀態詳細分析 ===")
    
    try:
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Status")
        if response.status_code != 200:
            print(f"無法獲取狀態: {response.text}")
            return
        
        result = response.json()
        
        print(f"R10000暫存器值: {result['register_value']} (0x{result['register_hex']}) (二進制: {result['register_binary']})")
        print(f"整體狀態: {result['summary']['overall_status']}")
        
        print("\n=== 16個bit位狀態詳情 ===")
        status_bits = result['status_bits']
        
        # 按bit位順序顯示
        for bit_num in range(16):
            bit_key = f"bit{bit_num}"
            if bit_key in status_bits:
                bit_info = status_bits[bit_key]
                active_indicator = "🟢" if bit_info['active'] else "⚪"
                print(f"bit{bit_num:2d}: {active_indicator} {bit_info['name']} = {bit_info['status']} ({bit_info['description']})")
        
        print("\n=== 關鍵狀態摘要 ===")
        summary = result['summary']
        print(f"電源開啟: {'是' if summary['power_on'] else '否'}")
        print(f"運轉中: {'是' if summary['running'] else '否'}")
        print(f"待機: {'是' if summary['standby'] else '否'}")
        print(f"補水中: {'是' if summary['water_filling'] else '否'}")
        print(f"異常: {'是' if summary['abnormal'] else '否'}")
        print(f"整體狀態: {summary['overall_status']}")
        
    except Exception as e:
        print(f"處理失敗: {e}")

def test_different_status_values():
    """測試不同的狀態值 (通過寫入R10000來模擬)"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== 測試不同狀態值 ===")
    
    # 測試不同的狀態組合
    test_cases = [
        {"value": 0x0001, "desc": "僅電源開啟 (bit0=1)"},
        {"value": 0x0003, "desc": "電源開啟+運轉中 (bit0=1, bit1=1)"},
        {"value": 0x0005, "desc": "電源開啟+待機 (bit0=1, bit2=1)"},
        {"value": 0x0011, "desc": "電源開啟+補水中 (bit0=1, bit4=1)"},
        {"value": 0x0081, "desc": "電源開啟+異常 (bit0=1, bit7=1)"},
        {"value": 0x0000, "desc": "全部關閉"},
        {"value": 0xFFFF, "desc": "全部開啟"}
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. 測試: {test_case['desc']} (值: 0x{test_case['value']:04X})")
        
        # 先寫入測試值到R10000
        try:
            write_response = requests.post(
                f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Write",
                json={"register_address": 10000, "value": test_case['value']},
                headers={"Content-Type": "application/json"}
            )
            
            if write_response.status_code != 200:
                print(f"  寫入失敗: {write_response.text}")
                continue
            
            # 等待一下讓值生效
            time.sleep(1)
            
            # 讀取狀態
            status_response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Status")
            if status_response.status_code == 200:
                result = status_response.json()
                summary = result['summary']
                print(f"  整體狀態: {summary['overall_status']}")
                print(f"  電源: {'開' if summary['power_on'] else '關'}, "
                      f"運轉: {'是' if summary['running'] else '否'}, "
                      f"待機: {'是' if summary['standby'] else '否'}, "
                      f"補水: {'是' if summary['water_filling'] else '否'}, "
                      f"異常: {'是' if summary['abnormal'] else '否'}")
            else:
                print(f"  讀取狀態失敗: {status_response.text}")
                
        except Exception as e:
            print(f"  測試失敗: {e}")

def test_bit_analysis():
    """測試bit位分析功能"""
    base_url = "http://localhost:8001/redfish/v1"
    
    print("\n=== bit位分析測試 ===")
    
    # 設置一個特定的測試值
    test_value = 0x0093  # 二進制: 0000000010010011
    # bit0=1 (電源開啟), bit1=1 (運轉中), bit4=1 (補水中), bit7=1 (異常)
    
    try:
        # 寫入測試值
        write_response = requests.post(
            f"{base_url}/Systems/CDU1/Oem/CDU/Registers/Write",
            json={"register_address": 10000, "value": test_value},
            headers={"Content-Type": "application/json"}
        )
        
        if write_response.status_code != 200:
            print(f"寫入測試值失敗: {write_response.text}")
            return
        
        time.sleep(1)
        
        # 讀取並分析狀態
        response = requests.get(f"{base_url}/Systems/CDU1/Oem/CDU/Status")
        if response.status_code == 200:
            result = response.json()
            
            print(f"測試值: 0x{test_value:04X} ({test_value}) 二進制: {test_value:016b}")
            print(f"預期: bit0=1, bit1=1, bit4=1, bit7=1")
            
            status_bits = result['status_bits']
            print("\n活躍的bit位:")
            for bit_num in range(16):
                bit_key = f"bit{bit_num}"
                if bit_key in status_bits and status_bits[bit_key]['active']:
                    bit_info = status_bits[bit_key]
                    print(f"  bit{bit_num}: {bit_info['name']} = {bit_info['status']}")
            
            print(f"\n整體狀態判斷: {result['summary']['overall_status']}")
            
        else:
            print(f"讀取狀態失敗: {response.text}")
            
    except Exception as e:
        print(f"bit位分析測試失敗: {e}")

if __name__ == "__main__":
    # 等待服務啟動
    print("等待API服務啟動...")
    time.sleep(3)
    
    test_cdu_status_api()
    display_cdu_status_details()
    test_different_status_values()
    test_bit_analysis()
    
    print("\n=== 測試完成 ===")
    print("CDU機組狀態API功能測試完成！")
