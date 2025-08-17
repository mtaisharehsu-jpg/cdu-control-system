#!/usr/bin/env python3
"""
測試三菱PLC的Modbus地址映射
用於確定D900-D910的正確Modbus地址
"""

import logging
import time

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_modbus_addresses():
    """測試不同的Modbus地址"""
    try:
        from pymodbus.client import ModbusTcpClient
    except ImportError:
        from pymodbus.client.sync import ModbusTcpClient
    
    # PLC連接參數
    host = "10.10.40.8"
    port = 501
    unit_id = 1
    
    logger.info(f"Testing Modbus address mapping for PLC {host}:{port}")
    
    # 創建客戶端
    client = ModbusTcpClient(host=host, port=port, timeout=3)
    
    if not client.connect():
        logger.error("Failed to connect to PLC")
        return
    
    logger.info("✅ Connected to PLC successfully")
    
    # 測試不同的地址映射
    test_addresses = [
        (0, "Direct mapping (0-10)"),
        (900, "Direct D register (900-910)"),
        (40001, "Modbus 4x addressing (40001-40011)"),
        (400900, "4x + D register (400900-400910)"),
        (4900, "4x prefix + D register (4900-4910)")
    ]
    
    for start_addr, description in test_addresses:
        logger.info(f"\nTesting {description} - Address: {start_addr}")
        
        try:
            result = client.read_holding_registers(
                address=start_addr,
                count=11,
                unit=unit_id
            )
            
            if result.isError():
                logger.warning(f"❌ Error reading from address {start_addr}: {result}")
            else:
                logger.info(f"✅ Success reading from address {start_addr}")
                logger.info("Register values:")
                for i, value in enumerate(result.registers):
                    d_register = 900 + i
                    logger.info(f"  D{d_register} (addr {start_addr + i}): {value}")
                
                # 如果成功讀取，這可能是正確的地址
                logger.info(f"🎯 Address {start_addr} appears to be correct!")
                break
                
        except Exception as e:
            logger.error(f"❌ Exception reading from address {start_addr}: {e}")
        
        time.sleep(1)  # 避免請求過於頻繁
    
    # 關閉連接
    client.close()
    logger.info("Connection closed")

def test_function_codes():
    """測試不同的功能碼"""
    try:
        from pymodbus.client import ModbusTcpClient
    except ImportError:
        from pymodbus.client.sync import ModbusTcpClient
    
    host = "10.10.40.8"
    port = 501
    unit_id = 1
    
    logger.info(f"\nTesting different function codes for PLC {host}:{port}")
    
    client = ModbusTcpClient(host=host, port=port, timeout=3)
    
    if not client.connect():
        logger.error("Failed to connect to PLC")
        return
    
    # 測試不同的功能碼和地址組合
    test_cases = [
        ("read_holding_registers", 0, "Function 03 - Holding Registers, Address 0"),
        ("read_holding_registers", 900, "Function 03 - Holding Registers, Address 900"),
        ("read_input_registers", 0, "Function 04 - Input Registers, Address 0"),
        ("read_input_registers", 900, "Function 04 - Input Registers, Address 900"),
    ]
    
    for func_name, address, description in test_cases:
        logger.info(f"\nTesting {description}")
        
        try:
            func = getattr(client, func_name)
            result = func(address=address, count=11, unit=unit_id)
            
            if result.isError():
                logger.warning(f"❌ Error: {result}")
            else:
                logger.info(f"✅ Success with {description}")
                logger.info("Values:")
                for i, value in enumerate(result.registers):
                    logger.info(f"  Register {address + i}: {value}")
                break
                
        except Exception as e:
            logger.error(f"❌ Exception: {e}")
        
        time.sleep(1)
    
    client.close()

def main():
    """主函數"""
    print("🏭 三菱PLC Modbus地址映射測試")
    print("=" * 50)
    print("此工具將測試不同的Modbus地址映射")
    print("以找到D900-D910暫存器的正確地址")
    print()
    
    try:
        # 測試地址映射
        test_modbus_addresses()
        
        # 測試功能碼
        test_function_codes()
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
    
    print("\n測試完成！")

if __name__ == "__main__":
    main()
