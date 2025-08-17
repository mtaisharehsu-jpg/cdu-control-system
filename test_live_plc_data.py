#!/usr/bin/env python3
"""
測試API服務中的實時PLC數據
"""

import requests
import json
from datetime import datetime

def test_api_plc_data():
    """測試API中的PLC數據"""
    print("=== 測試API服務中的PLC數據 ===")
    print(f"測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 測試CDU異常端點
        response = requests.get("http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Alarms", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            print("\n📊 API異常數據分析:")
            print(f"   成功: {data.get('success', False)}")
            print(f"   時間戳: {data.get('timestamp', 'N/A')}")
            
            alarm_registers = data.get('alarm_registers', {})
            print(f"   異常暫存器數量: {len(alarm_registers)}")
            
            total_active = 0
            for reg_name, reg_data in alarm_registers.items():
                reg_value = reg_data.get('register_value', 0)
                active_count = reg_data.get('active_count', 0)
                total_active += active_count
                
                print(f"   {reg_name}: {reg_value} (0x{reg_value:04X}) - 活躍: {active_count}")
            
            print(f"\n📈 異常統計:")
            alarm_summary = data.get('alarm_summary', {})
            print(f"   總異常數量: {alarm_summary.get('total_alarms', 0)}")
            print(f"   系統狀態: {alarm_summary.get('overall_status', 'N/A')}")
            
            active_alarms = data.get('active_alarms', [])
            if active_alarms:
                print(f"\n🚨 活躍異常 ({len(active_alarms)}個):")
                for alarm in active_alarms[:5]:  # 只顯示前5個
                    print(f"   - {alarm.get('alarm_code', 'N/A')}: {alarm.get('name', 'N/A')}")
            else:
                print("\n✅ 無活躍異常 (可能在使用模擬數據)")
            
            return {
                "status": "success",
                "data": data,
                "using_real_data": total_active > 0
            }
            
        else:
            print(f"❌ API請求失敗: {response.status_code}")
            print(f"   錯誤: {response.text}")
            return {"status": "error", "message": f"HTTP {response.status_code}"}
            
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        return {"status": "error", "message": str(e)}

def compare_with_direct_plc():
    """與直接PLC讀取進行比較"""
    print("\n=== 比較API數據與直接PLC數據 ===")
    
    # 直接讀取PLC數據
    try:
        from pymodbus.client import ModbusTcpClient
        
        client = ModbusTcpClient(host="10.10.40.8", port=502, timeout=3)
        
        if client.connect():
            result = client.read_holding_registers(address=1, count=5)  # R10001-R10005
            
            if hasattr(result, 'registers'):
                plc_values = result.registers
                print(f"🔗 直接PLC讀取: {plc_values}")
                
                # 比較與API的數據
                api_result = test_api_plc_data()
                
                if api_result["status"] == "success":
                    api_registers = api_result["data"]["alarm_registers"]
                    api_values = []
                    for i in range(5):
                        reg_name = f"R{10001+i}"
                        if reg_name in api_registers:
                            api_values.append(api_registers[reg_name]["register_value"])
                        else:
                            api_values.append(0)
                    
                    print(f"📊 API服務讀取: {api_values}")
                    
                    if plc_values == api_values:
                        print("✅ API與PLC數據一致 - 硬體模式正常工作")
                        return True
                    else:
                        print("⚠️ API與PLC數據不一致 - 可能仍在模擬模式")
                        return False
                else:
                    print("❌ API測試失敗")
                    return False
            else:
                print("❌ 直接PLC讀取失敗")
                return False
                
            client.close()
        else:
            print("❌ 無法連接到PLC")
            return False
            
    except Exception as e:
        print(f"❌ PLC比較測試失敗: {e}")
        return False

def suggest_hardware_mode_fix():
    """建議硬體模式修復方案"""
    print("\n=== 硬體模式切換建議 ===")
    
    print("如果API仍在使用模擬數據，可能的原因和解決方案:")
    print()
    print("1. 🔧 PLC塊未正確初始化")
    print("   - 檢查配置文件中PLC塊的設定")
    print("   - 確認IP地址、端口和Unit ID正確")
    print()
    print("2. 🔄 需要重新啟動服務") 
    print("   - 停止API服務: pkill -f simple_distributed_main.py")
    print("   - 重新啟動: python3 simple_distributed_main.py")
    print()
    print("3. 📝 配置文件問題")
    print("   - 檢查 distributed_cdu_config.yaml 中的PLC配置")
    print("   - 確認PLC塊被正確載入")
    print()
    print("4. 🌐 網路連接問題")
    print("   - 確認PLC設備在線: ping 10.10.40.8")
    print("   - 檢查防火牆設定")

def main():
    """主程序"""
    print("=" * 60)
    print("API服務PLC數據測試")
    print("=" * 60)
    
    # 測試API數據
    api_result = test_api_plc_data()
    
    if api_result["status"] == "success":
        if api_result.get("using_real_data", False):
            print("\n🎉 API正在使用真實的PLC數據!")
        else:
            print("\n⚠️ API可能在使用模擬數據")
            # 與直接PLC數據比較
            is_hardware_mode = compare_with_direct_plc()
            
            if not is_hardware_mode:
                suggest_hardware_mode_fix()
    else:
        print("\n❌ API測試失敗")
        suggest_hardware_mode_fix()

if __name__ == "__main__":
    main()