#!/usr/bin/env python3
"""
三菱PLC連接測試腳本
用於測試PLC Modbus TCP連接功能
"""

import time
import threading
import logging
from datetime import datetime

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_mock_plc_server(host='localhost', port=5020):
    """創建模擬PLC服務器"""
    try:
        from pymodbus.server.sync import StartTcpServer
        from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
        from pymodbus.device import ModbusDeviceIdentification
        
        # 創建數據存儲
        # 初始化D900-D910的模擬數據
        initial_values = [0] * 1000
        # D900-D910設置一些測試值
        initial_values[900] = 1234   # D900
        initial_values[901] = 5678   # D901
        initial_values[902] = 9012   # D902
        initial_values[903] = 3456   # D903
        initial_values[904] = 7890   # D904
        initial_values[905] = 2468   # D905
        initial_values[906] = 1357   # D906
        initial_values[907] = 9753   # D907
        initial_values[908] = 8642   # D908
        initial_values[909] = 1111   # D909
        initial_values[910] = 2222   # D910
        
        store = ModbusSlaveContext(
            di=ModbusSequentialDataBlock(0, [0]*1000),
            co=ModbusSequentialDataBlock(0, [0]*1000),
            hr=ModbusSequentialDataBlock(0, initial_values),  # Holding Registers (D暫存器)
            ir=ModbusSequentialDataBlock(0, [0]*1000)
        )
        context = ModbusServerContext(slaves=store, single=True)
        
        # 設備識別
        identity = ModbusDeviceIdentification()
        identity.VendorName = 'Mitsubishi Electric'
        identity.ProductCode = 'F5U'
        identity.VendorUrl = 'http://www.mitsubishielectric.com'
        identity.ProductName = 'Mock F5U PLC'
        identity.ModelName = 'F5U-32MR'
        identity.MajorMinorRevision = '1.0'
        
        # 啟動服務器
        logger.info(f"Starting mock PLC server on {host}:{port}")
        StartTcpServer(context, identity=identity, address=(host, port))
        
    except ImportError:
        logger.error("pymodbus library not found. Cannot create mock server.")
    except Exception as e:
        logger.error(f"Error starting mock PLC server: {e}")

def test_plc_connection(host='localhost', port=5020):
    """測試PLC連接"""
    try:
        from pymodbus.client.sync import ModbusTcpClient
        
        logger.info(f"Testing connection to PLC at {host}:{port}")
        
        # 創建客戶端
        client = ModbusTcpClient(host=host, port=port, timeout=3)
        
        # 連接
        if client.connect():
            logger.info("✅ Successfully connected to PLC")
            
            # 讀取D900-D910
            result = client.read_holding_registers(address=900, count=11, unit=1)
            
            if not result.isError():
                logger.info("✅ Successfully read D registers:")
                for i, value in enumerate(result.registers):
                    register_addr = 900 + i
                    logger.info(f"  D{register_addr}: {value}")
            else:
                logger.error(f"❌ Error reading registers: {result}")
            
            # 關閉連接
            client.close()
            logger.info("Connection closed")
            
        else:
            logger.error("❌ Failed to connect to PLC")
            
    except ImportError:
        logger.error("pymodbus library not found")
    except Exception as e:
        logger.error(f"Error testing PLC connection: {e}")

def test_cdu_plc_integration():
    """測試CDU系統的PLC整合"""
    import requests
    import json
    
    base_url = "http://localhost:8000"
    
    logger.info("Testing CDU PLC integration...")
    
    try:
        # 測試PLC端點
        response = requests.get(f"{base_url}/plc")
        if response.status_code == 200:
            data = response.json()
            logger.info("✅ PLC endpoint accessible")
            logger.info(f"PLC count: {data.get('plc_count', 0)}")
            
            # 測試特定PLC
            response = requests.get(f"{base_url}/plc/MitsubishiPLC1")
            if response.status_code == 200:
                plc_data = response.json()
                logger.info("✅ PLC detail endpoint accessible")
                logger.info(f"PLC Status: {plc_data.get('status', 'Unknown')}")
                logger.info(f"Connected: {plc_data.get('connected', False)}")
                logger.info(f"Register count: {plc_data.get('register_count', 0)}")
                
                # 顯示暫存器數據
                registers = plc_data.get('registers', {})
                if registers:
                    logger.info("📊 Register data:")
                    for reg_name, reg_value in registers.items():
                        logger.info(f"  {reg_name}: {reg_value}")
                else:
                    logger.info("📊 No register data available")
            else:
                logger.error(f"❌ PLC detail endpoint error: {response.status_code}")
        else:
            logger.error(f"❌ PLC endpoint error: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error testing CDU PLC integration: {e}")

def main():
    """主函數"""
    print("三菱F5U PLC連接測試")
    print("=" * 50)
    
    # 選擇測試模式
    print("選擇測試模式:")
    print("1. 啟動模擬PLC服務器")
    print("2. 測試PLC連接")
    print("3. 測試CDU系統PLC整合")
    print("4. 全部測試")
    
    choice = input("請選擇 (1-4): ").strip()
    
    if choice == "1":
        print("啟動模擬PLC服務器...")
        create_mock_plc_server()
        
    elif choice == "2":
        host = input("PLC IP地址 (預設: localhost): ").strip() or "localhost"
        port = input("PLC端口 (預設: 5020): ").strip() or "5020"
        test_plc_connection(host, int(port))
        
    elif choice == "3":
        test_cdu_plc_integration()
        
    elif choice == "4":
        print("執行全部測試...")
        
        # 啟動模擬服務器
        print("\n1. 啟動模擬PLC服務器...")
        server_thread = threading.Thread(
            target=create_mock_plc_server, 
            args=('localhost', 5020),
            daemon=True
        )
        server_thread.start()
        time.sleep(2)  # 等待服務器啟動
        
        # 測試連接
        print("\n2. 測試PLC連接...")
        test_plc_connection('localhost', 5020)
        
        # 測試CDU整合
        print("\n3. 測試CDU系統整合...")
        test_cdu_plc_integration()
        
        print("\n測試完成！")
        
    else:
        print("無效選擇")

if __name__ == "__main__":
    main()
