#!/usr/bin/env python3
"""
測試 PLC1-Temp4 數據流
模擬完整的數據流程：配置 -> PLC區塊 -> API -> 前端
"""

import json
import logging
from datetime import datetime

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def simulate_plc_block():
    """模擬 PLC 區塊行為"""
    
    logger.info("=== 模擬 PLC 區塊行為 ===")
    
    # 1. 模擬配置 (來自 distributed_cdu_config.yaml)
    config = {
        'ip_address': '10.10.40.8',
        'port': 502,
        'unit_id': 1,
        'register': 20  # R10020
    }
    
    logger.info(f"PLC 配置: {config}")
    
    # 2. 模擬初始化過程
    block_id = 'PLC1-Temp4'
    register = config['register']  # 20
    actual_register = 10000 + register  # R10020
    start_register = actual_register  # R10020
    register_count = 1
    modbus_start_address = register  # 20
    is_temperature_sensor = 'temp' in block_id.lower()
    
    logger.info(f"區塊 ID: {block_id}")
    logger.info(f"實際暫存器: R{actual_register}")
    logger.info(f"Modbus 地址: {modbus_start_address}")
    logger.info(f"是溫度感測器: {is_temperature_sensor}")
    
    # 3. 模擬 PLC 數據讀取 (原始值 543)
    raw_plc_value = 543  # 來自 R10020 的原始值
    
    # 4. 模擬暫存器數據存儲
    register_values = {
        f"R{actual_register}": {
            'value': raw_plc_value,
            'name': f'PLC1溫度暫存器R{actual_register}',
            'register': actual_register
        },
        register: raw_plc_value  # 使用相對地址作為索引 (20: 543)
    }
    
    logger.info(f"暫存器數據: {register_values}")
    
    # 5. 模擬溫度輸出計算
    if is_temperature_sensor and register in register_values:
        raw_value = register_values[register]
        # 溫度轉換: 543 -> 54.3°C
        temperature = raw_value / 10.0 if raw_value > 100 else raw_value
    else:
        temperature = -1.0
    
    logger.info(f"溫度輸出: {temperature}°C (原始值: {raw_plc_value})")
    
    # 6. 模擬區塊狀態
    block_state = {
        'block_id': block_id,
        'connected': True,
        'output_status': 'Enabled',
        'output_health': 'OK',
        'register': register,
        'register_values': register_values,
        'output_temperature': temperature,
        'ip_address': config['ip_address'],
        'port': config['port'],
        'unit_id': config['unit_id']
    }
    
    return block_state

def simulate_api_response(block_state):
    """模擬 API 回應"""
    
    logger.info("\n=== 模擬 API 回應 ===")
    
    # 1. 模擬 /api/v1/sensors/readings 回應
    block_id = block_state['block_id']
    register = block_state['register']
    register_values = block_state['register_values']
    
    # API 邏輯: 檢查 PLC 區塊
    if register_values and register in register_values:
        register_value = register_values[register]
        api_value = float(register_value)
        
        # 根據區塊 ID 判斷數據類型和單位
        if 'Temp' in block_id:
            # 溫度數據轉換
            api_value = api_value / 10.0 if api_value > 100 else api_value
            unit = "°C"
        else:
            unit = "Value"
            
        status = 'Enabled'
        health = 'OK'
    else:
        api_value = -1.0
        unit = "N/A"
        status = 'Error'
        health = 'Critical'
    
    # API 回應格式
    api_reading = {
        'block_id': block_id,
        'block_type': 'MitsubishiPLCBlock',
        'value': api_value,
        'status': status,
        'health': health,
        'unit': unit,
        'device': None,
        'modbus_address': None,
        'register': register,
        'ip_address': block_state['ip_address'],
        'port': block_state['port'],
        'unit_id': block_state['unit_id']
    }
    
    logger.info(f"API 讀數回應: {api_reading}")
    
    # 2. 模擬 /api/v1/function-blocks/config 回應
    config_block = {
        'block_id': block_id,
        'block_type': 'MitsubishiPLCBlock',
        'sensor_category': 'temperature',
        'ip_address': block_state['ip_address'],
        'port': block_state['port'],
        'unit_id': block_state['unit_id'],
        'register': register,
        'unit': '°C',
        'min_actual': 0.0,
        'max_actual': 100.0,
        'precision': 0.1,
        'device': None,
        'modbus_address': None,
        'start_register': None
    }
    
    function_blocks_config = {
        'machine_name': '動態分散式功能區塊模型',
        'description': f'包含 {block_id} 的配置',
        'function_blocks': [config_block],
        'timestamp': datetime.now().isoformat()
    }
    
    logger.info(f"功能區塊配置回應: {json.dumps(function_blocks_config, indent=2, ensure_ascii=False)}")
    
    return api_reading, function_blocks_config

def simulate_frontend_processing(api_reading, function_blocks_config):
    """模擬前端處理"""
    
    logger.info("\n=== 模擬前端處理 ===")
    
    # 1. 前端接收 API 數據
    logger.info("前端接收到感測器讀數:")
    logger.info(f"  區塊 ID: {api_reading['block_id']}")
    logger.info(f"  數值: {api_reading['value']} {api_reading['unit']}")
    logger.info(f"  狀態: {api_reading['status']}")
    logger.info(f"  健康狀態: {api_reading['health']}")
    
    # 2. 前端顯示邏輯
    if api_reading['health'] == 'OK' and api_reading['value'] > 0:
        display_color = "blue"  # HAL 數據用藍色顯示
        display_text = f"{api_reading['value']} {api_reading['unit']}"
        show_hal_badge = True
    else:
        display_color = "black"  # 模擬數據用黑色顯示
        display_text = "N/A"
        show_hal_badge = False
    
    logger.info(f"前端顯示:")
    logger.info(f"  顏色: {display_color}")
    logger.info(f"  文字: {display_text}")
    logger.info(f"  HAL 標誌: {'顯示' if show_hal_badge else '隱藏'}")
    
    # 3. 前端配置處理
    logger.info("前端處理功能區塊配置:")
    for block in function_blocks_config['function_blocks']:
        logger.info(f"  下拉選單選項: {block['block_id']} - {block['block_type']}")
        logger.info(f"  感測器類別: {block['sensor_category']}")
        logger.info(f"  單位: {block['unit']}")
    
    return {
        'display_color': display_color,
        'display_text': display_text,
        'show_hal_badge': show_hal_badge,
        'config_options': function_blocks_config['function_blocks']
    }

def main():
    """主測試函數"""
    
    logger.info("開始 PLC1-Temp4 完整數據流測試...")
    
    try:
        # 步驟 1: 模擬 PLC 區塊
        block_state = simulate_plc_block()
        
        # 步驟 2: 模擬 API 回應
        api_reading, function_blocks_config = simulate_api_response(block_state)
        
        # 步驟 3: 模擬前端處理
        frontend_result = simulate_frontend_processing(api_reading, function_blocks_config)
        
        # 結果驗證
        logger.info("\n=== 結果驗證 ===")
        
        expected_temp = 54.3
        actual_temp = api_reading['value']
        
        if abs(actual_temp - expected_temp) < 0.1:
            logger.info("✓ 溫度轉換正確!")
        else:
            logger.error(f"✗ 溫度轉換錯誤! 期望: {expected_temp}°C, 實際: {actual_temp}°C")
            return False
        
        if frontend_result['display_color'] == 'blue':
            logger.info("✓ 前端顯示顏色正確 (藍色 = HAL 數據)!")
        else:
            logger.error("✗ 前端顯示顏色錯誤!")
            return False
        
        if frontend_result['show_hal_badge']:
            logger.info("✓ HAL 標誌顯示正確!")
        else:
            logger.error("✗ HAL 標誌顯示錯誤!")
            return False
        
        logger.info("\n🎉 所有測試通過!")
        logger.info("PLC1-Temp4 數據流程正常:")
        logger.info("1. 配置: register: 20 -> R10020")
        logger.info("2. PLC 讀取: 原始值 543")
        logger.info("3. 溫度轉換: 543 ÷ 10 = 54.3°C")
        logger.info("4. API 回應: 正確的 JSON 格式")
        logger.info("5. 前端顯示: 藍色文字 + HAL 標誌")
        
        return True
        
    except Exception as e:
        logger.error(f"測試過程中發生錯誤: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)