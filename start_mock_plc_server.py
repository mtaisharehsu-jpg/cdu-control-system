#!/usr/bin/env python3
"""
啟動模擬三菱F5U PLC服務器
用於演示和測試PLC連接功能
"""

import time
import logging
import threading
from datetime import datetime

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_dynamic_plc_data():
    """創建動態變化的PLC數據"""
    import random
    
    # 模擬一些動態數據
    base_time = int(time.time()) % 10000
    
    return {
        900: base_time,                           # D900: 時間戳
        901: random.randint(1000, 2000),         # D901: 隨機值1
        902: random.randint(500, 1500),          # D902: 隨機值2
        903: int(time.time() % 3600),            # D903: 小時內秒數
        904: random.randint(0, 100),             # D904: 百分比值
        905: random.randint(200, 800),           # D905: 溫度值 (x10)
        906: random.randint(50, 150),            # D906: 壓力值 (x10)
        907: random.randint(0, 3600),            # D907: 運行時間
        908: random.randint(0, 1),               # D908: 狀態標誌
        909: random.randint(1000, 9999),         # D909: 設備ID
        910: random.randint(0, 65535)            # D910: 校驗碼
    }

def update_plc_data_periodically(context):
    """定期更新PLC數據"""
    while True:
        try:
            # 生成新的動態數據
            new_data = create_dynamic_plc_data()
            
            # 更新Holding Registers
            slave_context = context[1]  # 獲取從站1的上下文
            hr_context = slave_context.store['h']  # Holding Registers
            
            for address, value in new_data.items():
                hr_context.setValues(address, [value])
            
            logger.debug(f"Updated PLC data: D900={new_data[900]}, D901={new_data[901]}")
            
            # 每5秒更新一次
            time.sleep(5)
            
        except Exception as e:
            logger.error(f"Error updating PLC data: {e}")
            time.sleep(5)

def start_mock_plc_server(host='0.0.0.0', port=502):
    """啟動模擬PLC服務器"""
    try:
        try:
            # 新版本pymodbus (3.x)
            from pymodbus.server import StartTcpServer
            from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
            from pymodbus.device import ModbusDeviceIdentification
        except ImportError:
            # 舊版本pymodbus (2.x)
            from pymodbus.server.sync import StartTcpServer
            from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
            from pymodbus.device import ModbusDeviceIdentification
        
        logger.info("Initializing mock Mitsubishi F5U PLC server...")
        
        # 創建初始數據
        initial_data = create_dynamic_plc_data()
        initial_values = [0] * 2000  # 擴展到2000個暫存器
        
        # 設置D900-D910的初始值
        for address, value in initial_data.items():
            initial_values[address] = value
        
        # 創建數據存儲
        store = ModbusSlaveContext(
            di=ModbusSequentialDataBlock(0, [0]*2000),      # Discrete Inputs
            co=ModbusSequentialDataBlock(0, [0]*2000),      # Coils
            hr=ModbusSequentialDataBlock(0, initial_values), # Holding Registers (D暫存器)
            ir=ModbusSequentialDataBlock(0, [0]*2000)       # Input Registers
        )
        context = ModbusServerContext(slaves=store, single=True)
        
        # 設備識別信息
        identity = ModbusDeviceIdentification()
        identity.VendorName = 'Mitsubishi Electric'
        identity.ProductCode = 'F5U'
        identity.VendorUrl = 'http://www.mitsubishielectric.com'
        identity.ProductName = 'Mock F5U PLC'
        identity.ModelName = 'F5U-32MR'
        identity.MajorMinorRevision = '1.0'
        
        # 啟動數據更新線程
        update_thread = threading.Thread(
            target=update_plc_data_periodically, 
            args=(context,),
            daemon=True
        )
        update_thread.start()
        logger.info("Started PLC data update thread")
        
        # 顯示初始數據
        logger.info("Initial D register values:")
        for address, value in initial_data.items():
            logger.info(f"  D{address}: {value}")
        
        logger.info(f"🏭 Starting Mitsubishi F5U PLC server on {host}:{port}")
        logger.info("📊 D900-D910 registers available with dynamic data")
        logger.info("🔄 Data updates every 5 seconds")
        logger.info("Press Ctrl+C to stop the server")
        
        # 啟動服務器 (這會阻塞)
        try:
            # 新版本pymodbus (3.x)
            StartTcpServer(context=context, identity=identity, address=(host, port))
        except TypeError:
            # 舊版本pymodbus (2.x)
            StartTcpServer(context, identity=identity, address=(host, port))
        
    except ImportError:
        logger.error("❌ pymodbus library not found. Please install: pip install pymodbus")
    except Exception as e:
        logger.error(f"❌ Error starting mock PLC server: {e}")

def main():
    """主函數"""
    print("🏭 三菱F5U PLC模擬服務器")
    print("=" * 50)
    print("此服務器模擬三菱F5U PLC，提供D900-D910暫存器數據")
    print("可用於測試CDU系統的PLC連接功能")
    print()
    
    # 配置選項
    host = input("服務器IP地址 (預設: 0.0.0.0): ").strip() or "0.0.0.0"
    port_input = input("服務器端口 (預設: 502): ").strip()
    port = int(port_input) if port_input else 502
    
    print(f"\n啟動PLC服務器於 {host}:{port}")
    print("D暫存器範圍: D900-D910")
    print("數據更新間隔: 5秒")
    print()
    
    try:
        start_mock_plc_server(host, port)
    except KeyboardInterrupt:
        print("\n👋 PLC服務器已停止")
    except Exception as e:
        print(f"\n❌ 服務器錯誤: {e}")

if __name__ == "__main__":
    main()
