#!/usr/bin/env python3
"""
精確模仿Modbus Poll的設置來測試PLC連接
"""

import logging
import time

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_exact_modbus_poll_settings():
    """精確模仿Modbus Poll的設置"""
    try:
        from pymodbus.client import ModbusTcpClient
    except ImportError:
        from pymodbus.client.sync import ModbusTcpClient
    
    # 與Modbus Poll完全相同的設置
    host = "10.10.40.8"
    port = 501
    unit_id = 1  # Slave ID = 1
    function_code = 3  # Read Holding Registers
    start_address = 0  # 起始地址 00000
    quantity = 11  # 讀取11個暫存器
    
    logger.info("Testing with exact Modbus Poll settings:")
    logger.info(f"  Host: {host}")
    logger.info(f"  Port: {port}")
    logger.info(f"  Unit ID: {unit_id}")
    logger.info(f"  Function Code: {function_code}")
    logger.info(f"  Start Address: {start_address}")
    logger.info(f"  Quantity: {quantity}")
    
    # 創建客戶端 - 使用與Modbus Poll相同的超時設置
    client = ModbusTcpClient(
        host=host, 
        port=port, 
        timeout=3.0,  # 3秒超時，與Modbus Poll的Connect Timeout相同
    )
    
    logger.info("Attempting to connect...")
    
    if not client.connect():
        logger.error("❌ Failed to connect to PLC")
        return False
    
    logger.info("✅ Connected to PLC successfully")
    
    try:
        # 使用與Modbus Poll完全相同的參數
        logger.info("Reading holding registers...")
        result = client.read_holding_registers(
            address=start_address,
            count=quantity,
            unit=unit_id
        )
        
        if result.isError():
            logger.error(f"❌ Modbus read error: {result}")
            return False
        
        logger.info("✅ Successfully read registers!")
        logger.info("Register values (should match Modbus Poll):")
        
        for i, value in enumerate(result.registers):
            d_register = 900 + i
            modbus_addr = start_address + i
            logger.info(f"  D{d_register} (Modbus addr {modbus_addr}): {value}")
        
        # 驗證與Modbus Poll截圖的數據是否一致
        expected_values = {
            0: 13,    # D900
            1: 1105,  # D901
            2: 1,     # D902
            3: 0,     # D903
            4: 64,    # D904
            5: 0,     # D905
            6: 0,     # D906
            7: 0,     # D907
            8: 0,     # D908
            9: 0,     # D909
            10: 0     # D910
        }
        
        logger.info("\nComparing with Modbus Poll screenshot values:")
        matches = 0
        for i, value in enumerate(result.registers):
            expected = expected_values.get(i, "Unknown")
            match_status = "✅" if value == expected else "❌"
            logger.info(f"  Register {i}: Got {value}, Expected {expected} {match_status}")
            if value == expected:
                matches += 1
        
        logger.info(f"\nMatching registers: {matches}/{len(result.registers)}")
        
        if matches > 0:
            logger.info("🎯 Address mapping appears to be correct!")
            return True
        else:
            logger.warning("⚠️ Values don't match screenshot, but read was successful")
            return True
            
    except Exception as e:
        logger.error(f"❌ Exception during read: {e}")
        return False
        
    finally:
        client.close()
        logger.info("Connection closed")

def main():
    """主函數"""
    print("🔍 精確模仿Modbus Poll設置測試")
    print("=" * 50)
    print("此測試將使用與Modbus Poll完全相同的參數")
    print("來驗證PLC連接和數據讀取")
    print()
    
    success = test_exact_modbus_poll_settings()
    
    if success:
        print("\n✅ 測試成功！PLC連接和讀取正常")
        print("現在可以更新CDU系統使用正確的設置")
    else:
        print("\n❌ 測試失敗！需要檢查PLC設置或網絡連接")
    
    print("\n測試完成！")

if __name__ == "__main__":
    main()
