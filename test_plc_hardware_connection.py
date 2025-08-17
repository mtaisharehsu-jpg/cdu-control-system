#!/usr/bin/env python3
"""
PLC硬體連接測試和切換腳本
測試三菱PLC連接並切換到硬體模式
"""

import sys
import time
from datetime import datetime

def test_plc_connection():
    """測試PLC硬體連接"""
    print("=== PLC硬體連接測試 ===")
    print(f"測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 導入pymodbus
        from pymodbus.client import ModbusTcpClient
        print("✅ pymodbus library imported successfully")
    except ImportError:
        print("❌ pymodbus not found. Installing...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pymodbus", "--break-system-packages"])
        from pymodbus.client import ModbusTcpClient
        print("✅ pymodbus installed and imported")
    
    # PLC連接參數 (從配置文件中讀取)
    plc_configs = [
        {"ip": "10.10.40.8", "port": 502, "unit_id": 1, "name": "測試機PLC"},
        {"ip": "192.168.3.39", "port": 502, "unit_id": 1, "name": "LA12A PLC"},
    ]
    
    successful_connections = []
    
    for config in plc_configs:
        print(f"\n--- 測試 {config['name']} ({config['ip']}:{config['port']}) ---")
        
        try:
            # 創建Modbus客戶端
            client = ModbusTcpClient(
                host=config['ip'],
                port=config['port'],
                timeout=5
            )
            
            # 嘗試連接
            if client.connect():
                print(f"✅ 成功連接到 {config['name']}")
                
                # 測試讀取R10001暫存器 (異常暫存器第一個)
                try:
                    result = client.read_holding_registers(
                        address=1,  # R10001對應Modbus地址1
                        count=1,
                        slave=config['unit_id']  # pymodbus 3.x 使用 slave 而不是 unit
                    )
                    
                    if not result.isError():
                        register_value = result.registers[0]
                        print(f"✅ 成功讀取 R10001 = {register_value} (0x{register_value:04X})")
                        
                        # 測試讀取異常暫存器範圍 R10001-R10005
                        result_batch = client.read_holding_registers(
                            address=1,  # R10001對應Modbus地址1
                            count=5,    # R10001-R10005 (5個暫存器)
                            slave=config['unit_id']  # pymodbus 3.x 使用 slave
                        )
                        
                        if not result_batch.isError():
                            print("✅ 成功讀取異常暫存器 R10001-R10005:")
                            for i, value in enumerate(result_batch.registers):
                                reg_addr = 10001 + i
                                print(f"   R{reg_addr} = {value} (0x{value:04X}) - 活躍異常: {bin(value).count('1')}")
                            
                            successful_connections.append({
                                **config,
                                "alarm_registers": result_batch.registers,
                                "connection_test": "PASS"
                            })
                        else:
                            print(f"❌ 批量讀取異常暫存器失敗: {result_batch}")
                    else:
                        print(f"❌ 讀取R10001失敗: {result}")
                        
                except Exception as e:
                    print(f"❌ 讀取暫存器時發生錯誤: {e}")
                
                client.close()
                
            else:
                print(f"❌ 無法連接到 {config['name']} ({config['ip']}:{config['port']})")
                
        except Exception as e:
            print(f"❌ 連接 {config['name']} 時發生錯誤: {e}")
    
    return successful_connections

def configure_plc_for_alarms(plc_config):
    """為警報系統配置PLC連接"""
    print(f"\n=== 配置PLC警報系統 ===")
    
    # 創建警報專用的PLC塊配置
    alarm_plc_config = {
        "id": "PLC-AlarmMonitor",
        "type": "MitsubishiPLCBlock",
        "ip_address": plc_config["ip"],
        "port": plc_config["port"], 
        "unit_id": plc_config["unit_id"],
        "start_register": 10001,  # R10001 開始
        "register_count": 5,      # R10001-R10005 (5個暫存器)
        "modbus_start_address": 1, # R10001對應Modbus地址1
        "description": "警報監控專用PLC塊"
    }
    
    print(f"✅ 為 {plc_config['name']} 創建警報監控配置:")
    print(f"   IP地址: {alarm_plc_config['ip_address']}:{alarm_plc_config['port']}")
    print(f"   暫存器範圍: R{alarm_plc_config['start_register']}-R{alarm_plc_config['start_register'] + alarm_plc_config['register_count'] - 1}")
    print(f"   Modbus地址: {alarm_plc_config['modbus_start_address']}-{alarm_plc_config['modbus_start_address'] + alarm_plc_config['register_count'] - 1}")
    
    return alarm_plc_config

def test_real_alarm_data(plc_config):
    """測試實際的異常數據讀取"""
    print(f"\n=== 測試實際異常數據 ===")
    
    try:
        from pymodbus.client import ModbusTcpClient
        
        client = ModbusTcpClient(
            host=plc_config["ip"],
            port=plc_config["port"],
            timeout=5
        )
        
        if client.connect():
            print(f"✅ 連接到PLC {plc_config['ip']} 成功")
            
            # 讀取異常暫存器 R10001-R10005
            result = client.read_holding_registers(
                address=1,  # R10001對應Modbus地址1
                count=5,    # R10001-R10005
                slave=plc_config["unit_id"]  # pymodbus 3.x 使用 slave
            )
            
            if not result.isError():
                print("\n📊 當前異常狀態分析:")
                
                # 80個異常代碼定義 (簡化版，用於測試)
                ALARM_NAMES = {
                    10001: {0: "A001-水泵[1]異常", 1: "A002-水泵[2]異常", 8: "A009-內部回水T12溫度過低"},
                    10002: {15: "A032-內部回水水位不足請確認補液裝置存量足夠"},
                    10003: {11: "A044-水泵雙組異常關閉系統"},
                    10004: {6: "A055-PLC控制器異常碼產生"},
                    10005: {4: "A069-比例閥線路異常", 15: "A080-備用異常80"}
                }
                
                total_active_alarms = 0
                active_alarms = []
                
                for i, register_value in enumerate(result.registers):
                    register_address = 10001 + i
                    print(f"\n   R{register_address}: {register_value} (0x{register_value:04X}) [{format(register_value, '016b')}]")
                    
                    # 分析每個bit的異常狀態
                    active_bits = []
                    for bit in range(16):
                        if (register_value >> bit) & 1:
                            active_bits.append(bit)
                            total_active_alarms += 1
                            
                            # 獲取異常名稱
                            alarm_name = ALARM_NAMES.get(register_address, {}).get(bit, f"A{(register_address-10000)*16+bit+1:03d}-未定義異常")
                            active_alarms.append({
                                "register": register_address,
                                "bit": bit, 
                                "name": alarm_name,
                                "code": f"A{((register_address-10001)*16+bit+1):03d}"
                            })
                            print(f"      🚨 bit{bit}: {alarm_name}")
                    
                    if not active_bits:
                        print(f"      ✅ 無異常")
                
                print(f"\n📈 異常統計:")
                print(f"   總活躍異常數量: {total_active_alarms}")
                print(f"   系統狀態: {'🔴 有異常' if total_active_alarms > 0 else '🟢 正常'}")
                
                if active_alarms:
                    print(f"\n🚨 活躍異常列表:")
                    for alarm in active_alarms:
                        print(f"   - {alarm['code']}: {alarm['name']} (R{alarm['register']}:bit{alarm['bit']})")
                
                client.close()
                return {
                    "status": "success",
                    "total_alarms": total_active_alarms,
                    "active_alarms": active_alarms,
                    "register_values": result.registers
                }
                
            else:
                print(f"❌ 讀取異常暫存器失敗: {result}")
                client.close()
                return {"status": "error", "message": str(result)}
        else:
            print(f"❌ 無法連接到PLC")
            return {"status": "error", "message": "Connection failed"}
            
    except Exception as e:
        print(f"❌ 測試異常數據時發生錯誤: {e}")
        return {"status": "error", "message": str(e)}

def generate_hardware_config(successful_plc):
    """生成硬體模式的配置建議"""
    print(f"\n=== 硬體模式配置建議 ===")
    
    config_template = f"""
# 在 distributed_cdu_config.yaml 中添加或修改以下配置:

CDU_Blocks:
  # PLC警報監控塊 (專用於異常暫存器R10001-R10005)
  - id: PLC-AlarmMonitor
    type: MitsubishiPLCBlock
    ip_address: "{successful_plc['ip']}"
    port: {successful_plc['port']}
    unit_id: {successful_plc['unit_id']}
    start_register: 10001     # R10001開始
    register_count: 5         # R10001-R10005 (5個暫存器)  
    modbus_start_address: 1   # R10001對應Modbus地址1
    use_connection_pool: true # 使用連接池提高效率
    connection_retry_interval: 5 # 連接重試間隔(秒)
    description: "80個異常代碼監控 (A001-A080)"
"""
    
    print(config_template)
    return config_template

def main():
    """主程序"""
    print("=" * 70)
    print("PLC硬體連接測試和切換工具")
    print("=" * 70)
    
    # 1. 測試PLC連接
    successful_connections = test_plc_connection()
    
    if not successful_connections:
        print("\n❌ 沒有發現可用的PLC連接")
        print("請檢查:")
        print("  1. PLC設備是否開啟")
        print("  2. 網路連接是否正常") 
        print("  3. IP地址和端口設定是否正確")
        return
    
    print(f"\n✅ 發現 {len(successful_connections)} 個可用的PLC連接")
    
    # 2. 選擇要使用的PLC (使用第一個成功的連接)
    selected_plc = successful_connections[0]
    print(f"\n🎯 選擇 {selected_plc['name']} 作為主要PLC")
    
    # 3. 配置警報系統
    alarm_config = configure_plc_for_alarms(selected_plc)
    
    # 4. 測試實際異常數據
    alarm_data = test_real_alarm_data(selected_plc)
    
    # 5. 生成配置建議
    config_suggestion = generate_hardware_config(selected_plc)
    
    print("\n" + "=" * 70)
    print("🎉 PLC硬體連接測試完成")
    print("=" * 70)
    
    if alarm_data["status"] == "success":
        print(f"✅ PLC硬體模式已準備就緒")
        print(f"✅ 異常監控系統正常工作")
        print(f"✅ 當前異常數量: {alarm_data['total_alarms']}")
        print(f"\n🔧 下一步:")
        print(f"   1. 重新啟動API服務以載入硬體配置")
        print(f"   2. 前端將自動顯示實際的PLC異常數據")
        print(f"   3. 80個異常代碼將反映真實的設備狀態")
    else:
        print(f"⚠️  PLC連接正常但異常數據讀取有問題")
        print(f"   請檢查異常暫存器R10001-R10005的讀取權限")

if __name__ == "__main__":
    main()