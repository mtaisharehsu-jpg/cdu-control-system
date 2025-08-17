#!/usr/bin/env python3
"""
測試 PLC1-Temp4 功能區塊
驗證單個暫存器讀取和溫度轉換
"""

import sys
import logging
from blocks.mitsubishi_plc import MitsubishiPLCBlock

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_plc_temp4_config():
    """測試 PLC1-Temp4 配置"""
    
    # 模擬 PLC1-Temp4 配置 (來自 distributed_cdu_config.yaml)
    config = {
        'ip_address': '10.10.40.8',
        'port': 502,
        'unit_id': 1,
        'register': 20  # R10020
    }
    
    logger.info("創建 PLC1-Temp4 區塊...")
    plc_block = MitsubishiPLCBlock('PLC1-Temp4', config)
    
    # 驗證配置
    logger.info(f"PLC IP: {plc_block.ip_address}:{plc_block.port}")
    logger.info(f"單個暫存器: {plc_block.register} (R{10000 + plc_block.register})")
    logger.info(f"讀取暫存器: R{plc_block.start_register}")
    logger.info(f"Modbus 地址: {plc_block.modbus_start_address}")
    logger.info(f"是否為溫度感測器: {plc_block._is_temperature_sensor}")
    
    # 模擬暫存器數據 (因為沒有真實PLC連線)
    logger.info("\n模擬 PLC 數據...")
    plc_block.register_values[20] = 543  # 模擬讀取到的原始值 543
    plc_block.connected = True
    plc_block.output_status = "Connected"
    plc_block.output_health = "OK"
    
    # 測試溫度輸出
    temp_value = plc_block.output_temperature
    logger.info(f"溫度輸出: {temp_value}°C")
    
    # 測試狀態信息
    status_info = plc_block.get_status_info()
    logger.info(f"狀態信息: {status_info}")
    
    # 驗證結果
    expected_temp = 54.3  # 543 / 10
    if abs(temp_value - expected_temp) < 0.1:
        logger.info("✓ 溫度轉換正確!")
        return True
    else:
        logger.error(f"✗ 溫度轉換錯誤! 期望: {expected_temp}°C, 實際: {temp_value}°C")
        return False

def test_api_compatibility():
    """測試與 API 的兼容性"""
    
    logger.info("\n測試 API 兼容性...")
    
    config = {
        'ip_address': '10.10.40.8',
        'port': 502,
        'unit_id': 1,
        'register': 20
    }
    
    plc_block = MitsubishiPLCBlock('PLC1-Temp4', config)
    
    # 模擬數據
    plc_block.register_values[20] = 543
    plc_block.connected = True
    plc_block.output_status = "Enabled"
    plc_block.output_health = "OK"
    
    # 檢查 API 需要的屬性
    tests = [
        ('output_temperature', lambda: plc_block.output_temperature),
        ('output_status', lambda: plc_block.output_status),
        ('output_health', lambda: plc_block.output_health),
        ('register_values', lambda: plc_block.register_values),
        ('connected', lambda: plc_block.connected),
        ('register', lambda: plc_block.register),
        ('ip_address', lambda: plc_block.ip_address),
        ('port', lambda: plc_block.port),
        ('unit_id', lambda: plc_block.unit_id)
    ]
    
    all_passed = True
    for attr_name, getter in tests:
        try:
            value = getter()
            logger.info(f"✓ {attr_name}: {value}")
        except Exception as e:
            logger.error(f"✗ {attr_name}: 錯誤 - {e}")
            all_passed = False
    
    return all_passed

if __name__ == "__main__":
    logger.info("開始測試 PLC1-Temp4 功能區塊...")
    
    try:
        # 測試配置
        config_ok = test_plc_temp4_config()
        
        # 測試 API 兼容性
        api_ok = test_api_compatibility()
        
        if config_ok and api_ok:
            logger.info("\n🎉 所有測試通過!")
            logger.info("PLC1-Temp4 區塊應該能夠:")
            logger.info("1. 正確讀取 R10020 暫存器")
            logger.info("2. 將原始值 543 轉換為 54.3°C")
            logger.info("3. 與分散式 API 正確整合")
            sys.exit(0)
        else:
            logger.error("\n❌ 部分測試失敗!")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"測試過程中發生錯誤: {e}")
        sys.exit(1)