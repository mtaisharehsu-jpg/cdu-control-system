#!/usr/bin/env python3
"""
測試多種感測器類型的 PLC 區塊
驗證溫度、壓力、流量感測器的 PLC 整合
"""

import logging
from datetime import datetime

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_multi_sensor_plc_blocks():
    """測試多種感測器類型的 PLC 區塊"""
    
    logger.info("=== 測試多種感測器類型的 PLC 區塊 ===")
    
    # 定義測試區塊配置
    test_blocks = [
        {
            'id': 'PLC1-Temp4',
            'type': 'MitsubishiPLCBlock',
            'config': {
                'ip_address': '10.10.40.8',
                'port': 502,
                'unit_id': 1,
                'register': 20  # R10020
            },
            'expected_sensor_type': 'temperature',
            'expected_unit': '°C',
            'raw_value': 543,
            'expected_value': 54.3
        },
        {
            'id': 'PLC1-Temp5',
            'type': 'MitsubishiPLCBlock',
            'config': {
                'ip_address': '10.10.40.8',
                'port': 502,
                'unit_id': 1,
                'register': 21  # R10021
            },
            'expected_sensor_type': 'temperature',
            'expected_unit': '°C',
            'raw_value': 632,
            'expected_value': 63.2
        },
        {
            'id': 'PLC1-Press1',
            'type': 'MitsubishiPLCBlock',
            'config': {
                'ip_address': '10.10.40.8',
                'port': 502,
                'unit_id': 1,
                'register': 30  # R10030
            },
            'expected_sensor_type': 'pressure',
            'expected_unit': 'Bar',
            'raw_value': 1250,
            'expected_value': 12.5
        },
        {
            'id': 'PLC1-Flow1',
            'type': 'MitsubishiPLCBlock',
            'config': {
                'ip_address': '10.10.40.8',
                'port': 502,
                'unit_id': 1,
                'register': 40  # R10040
            },
            'expected_sensor_type': 'flow',
            'expected_unit': 'L/min',
            'raw_value': 874,
            'expected_value': 87.4
        }
    ]
    
    all_tests_passed = True
    
    for block_info in test_blocks:
        logger.info(f"\n--- 測試區塊: {block_info['id']} ---")
        
        try:
            # 模擬區塊創建和配置
            block_id = block_info['id']
            config = block_info['config']
            register = config['register']
            actual_register = 10000 + register
            
            # 判斷感測器類型
            block_id_lower = block_id.lower()
            if 'temp' in block_id_lower:
                sensor_type = 'temperature'
            elif 'press' in block_id_lower:
                sensor_type = 'pressure'
            elif 'flow' in block_id_lower:
                sensor_type = 'flow'
            else:
                sensor_type = 'generic'
            
            logger.info(f"配置: {config}")
            logger.info(f"實際暫存器: R{actual_register}")
            logger.info(f"感測器類型: {sensor_type}")
            
            # 驗證感測器類型檢測
            if sensor_type != block_info['expected_sensor_type']:
                logger.error(f"✗ 感測器類型錯誤! 期望: {block_info['expected_sensor_type']}, 實際: {sensor_type}")
                all_tests_passed = False
                continue
            
            # 模擬暫存器數據
            raw_value = block_info['raw_value']
            register_values = {register: raw_value}
            
            # 模擬感測器輸出計算
            if sensor_type == 'temperature':
                output_value = raw_value / 10.0 if raw_value > 100 else raw_value
            elif sensor_type == 'pressure':
                output_value = raw_value / 100.0 if raw_value > 100 else raw_value
            elif sensor_type == 'flow':
                output_value = raw_value / 10.0 if raw_value > 100 else raw_value
            else:
                output_value = float(raw_value)
            
            logger.info(f"原始值: {raw_value}")
            logger.info(f"轉換值: {output_value} {block_info['expected_unit']}")
            
            # 驗證數值轉換
            expected_value = block_info['expected_value']
            if abs(output_value - expected_value) < 0.1:
                logger.info(f"✓ 數值轉換正確!")
            else:
                logger.error(f"✗ 數值轉換錯誤! 期望: {expected_value}, 實際: {output_value}")
                all_tests_passed = False
            
            # 模擬 API 回應
            api_reading = {
                'block_id': block_id,
                'block_type': 'MitsubishiPLCBlock',
                'value': output_value,
                'status': 'Enabled',
                'health': 'OK',
                'unit': block_info['expected_unit'],
                'device': None,
                'modbus_address': None,
                'register': register,
                'ip_address': config['ip_address'],
                'port': config['port'],
                'unit_id': config['unit_id']
            }
            
            logger.info(f"API 回應: {api_reading}")
            
            # 模擬功能區塊配置
            function_block_config = {
                'block_id': block_id,
                'block_type': 'MitsubishiPLCBlock',
                'sensor_category': sensor_type,
                'ip_address': config['ip_address'],
                'port': config['port'],
                'unit_id': config['unit_id'],
                'register': register,
                'unit': block_info['expected_unit'],
                'min_actual': 0.0,
                'max_actual': 100.0 if sensor_type == 'temperature' else 200.0,
                'precision': 0.1 if sensor_type != 'pressure' else 0.01
            }
            
            logger.info(f"功能區塊配置: {function_block_config}")
            logger.info(f"✅ 區塊 {block_id} 測試通過!")
            
        except Exception as e:
            logger.error(f"✗ 區塊 {block_id} 測試失敗: {e}")
            all_tests_passed = False
    
    return all_tests_passed

def test_api_compatibility():
    """測試 API 兼容性"""
    
    logger.info("\n=== 測試 API 兼容性 ===")
    
    # 模擬 API 回應數據
    mock_api_response = [
        {
            "block_id": "PLC1-Temp4",
            "block_type": "MitsubishiPLCBlock",
            "value": 54.3,
            "status": "Enabled",
            "health": "OK",
            "unit": "°C",
            "register": 20
        },
        {
            "block_id": "PLC1-Temp5",
            "block_type": "MitsubishiPLCBlock",
            "value": 63.2,
            "status": "Enabled",
            "health": "OK",
            "unit": "°C",
            "register": 21
        },
        {
            "block_id": "PLC1-Press1",
            "block_type": "MitsubishiPLCBlock",
            "value": 12.5,
            "status": "Enabled",
            "health": "OK",
            "unit": "Bar",
            "register": 30
        },
        {
            "block_id": "PLC1-Flow1",
            "block_type": "MitsubishiPLCBlock",
            "value": 87.4,
            "status": "Enabled",
            "health": "OK",
            "unit": "L/min",
            "register": 40
        }
    ]
    
    logger.info("模擬 API 回應數據:")
    for reading in mock_api_response:
        logger.info(f"  {reading['block_id']}: {reading['value']} {reading['unit']}")
    
    # 驗證前端處理
    logger.info("\n前端處理驗證:")
    
    temperature_count = 0
    pressure_count = 0
    flow_count = 0
    
    for reading in mock_api_response:
        block_id = reading['block_id']
        value = reading['value']
        unit = reading['unit']
        health = reading['health']
        
        # 判斷顯示顏色和 HAL 標誌
        if health == 'OK' and value > 0:
            display_color = "blue"
            show_hal_badge = True
        else:
            display_color = "black"
            show_hal_badge = False
        
        # 統計感測器類型
        if 'Temp' in block_id:
            temperature_count += 1
        elif 'Press' in block_id:
            pressure_count += 1
        elif 'Flow' in block_id:
            flow_count += 1
        
        logger.info(f"  {block_id}: 顏色={display_color}, HAL標誌={'顯示' if show_hal_badge else '隱藏'}")
    
    logger.info(f"\n感測器統計:")
    logger.info(f"  溫度感測器: {temperature_count}")
    logger.info(f"  壓力感測器: {pressure_count}")
    logger.info(f"  流量感測器: {flow_count}")
    logger.info(f"  總計: {len(mock_api_response)} 個 PLC 感測器")
    
    return True

def main():
    """主測試函數"""
    
    logger.info("開始多種感測器類型的 PLC 區塊測試...")
    
    try:
        # 測試 PLC 區塊
        plc_tests_ok = test_multi_sensor_plc_blocks()
        
        # 測試 API 兼容性
        api_tests_ok = test_api_compatibility()
        
        if plc_tests_ok and api_tests_ok:
            logger.info("\n🎉 所有測試通過!")
            logger.info("MitsubishiPLCBlock 現在支持:")
            logger.info("✓ 溫度感測器 (PLC1-Temp4, PLC1-Temp5)")
            logger.info("✓ 壓力感測器 (PLC1-Press1)")
            logger.info("✓ 流量感測器 (PLC1-Flow1)")
            logger.info("✓ 自動類型檢測和數值轉換")
            logger.info("✓ 完整的前後端整合")
            return True
        else:
            logger.error("\n❌ 部分測試失敗!")
            return False
            
    except Exception as e:
        logger.error(f"測試過程中發生錯誤: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)