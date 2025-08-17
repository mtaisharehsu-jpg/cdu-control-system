#!/usr/bin/env python3
"""
簡單的PLC連接測試
"""

import sys
from datetime import datetime

def test_plc_simple():
    """簡單的PLC連接測試"""
    try:
        from pymodbus.client import ModbusTcpClient
        
        print("=== 簡單PLC連接測試 ===")
        print(f"測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 測試IP地址列表
        test_ips = ["10.10.40.8", "192.168.3.39"]
        
        for ip in test_ips:
            print(f"\n--- 測試 {ip}:502 ---")
            
            try:
                client = ModbusTcpClient(host=ip, port=502, timeout=3)
                
                if client.connect():
                    print(f"✅ 成功連接到 {ip}")
                    
                    try:
                        # 使用關鍵字參數方式
                        result = client.read_holding_registers(address=1, count=1)
                        
                        if hasattr(result, 'registers'):
                            value = result.registers[0]
                            print(f"✅ 成功讀取 R10001 = {value} (0x{value:04X})")
                            
                            # 讀取異常暫存器範圍
                            result_batch = client.read_holding_registers(address=1, count=5)
                            if hasattr(result_batch, 'registers'):
                                print("✅ 成功讀取異常暫存器 R10001-R10005:")
                                for i, reg_value in enumerate(result_batch.registers):
                                    reg_addr = 10001 + i
                                    active_bits = bin(reg_value).count('1')
                                    print(f"   R{reg_addr} = {reg_value} (0x{reg_value:04X}) - 活躍異常: {active_bits}")
                                
                                return {"status": "success", "ip": ip, "registers": result_batch.registers}
                        else:
                            print(f"❌ 讀取失敗: {result}")
                            
                    except Exception as e:
                        print(f"❌ 讀取暫存器錯誤: {e}")
                    
                    client.close()
                else:
                    print(f"❌ 無法連接到 {ip}")
                    
            except Exception as e:
                print(f"❌ 連接錯誤: {e}")
        
        return {"status": "failed", "message": "No successful PLC connections"}
        
    except ImportError as e:
        print(f"❌ pymodbus not available: {e}")
        return {"status": "error", "message": "pymodbus not available"}

if __name__ == "__main__":
    result = test_plc_simple()
    
    if result["status"] == "success":
        print(f"\n🎉 PLC硬體連接成功!")
        print(f"📍 IP地址: {result['ip']}")
        print(f"📊 異常暫存器數據: {result['registers']}")
        print(f"\n下一步: 更新系統配置以使用硬體模式")
    else:
        print(f"\n⚠️ PLC連接測試未成功")
        print(f"💡 系統將繼續使用模擬模式")