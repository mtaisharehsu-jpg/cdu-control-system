#!/usr/bin/env python3
"""
直接測試PLC連接和數據讀取
"""

import time
import logging
from blocks.mitsubishi_plc import MitsubishiPLCBlock

# 設定日誌
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_plc_connection():
    """測試PLC連接"""
    print("=== 直接測試PLC連接 ===")
    
    # PLC配置
    config = {
        'ip_address': '127.0.0.1',
        'port': 5020,
        'unit_id': 1,
        'start_register': 10000,
        'register_count': 11,
        'modbus_start_address': 0
    }
    
    # 創建PLC塊
    plc = MitsubishiPLCBlock('TestPLC', config)
    
    print(f"PLC配置: {config}")
    print(f"連接狀態: {plc.connected}")
    
    # 手動調用update方法幾次
    for i in range(5):
        print(f"\n--- 第 {i+1} 次更新 ---")
        plc.update()
        print(f"連接狀態: {plc.connected}")
        print(f"暫存器數據: {plc.register_values}")
        time.sleep(2)
    
    # 顯示最終結果
    print(f"\n=== 最終結果 ===")
    print(f"連接狀態: {plc.connected}")
    print(f"暫存器數量: {len(plc.register_values)}")
    print(f"暫存器數據:")
    for key, value in plc.register_values.items():
        if isinstance(value, dict):
            print(f"  {key}: {value['name']} = {value['value']}")
        else:
            print(f"  {key}: {value}")

if __name__ == "__main__":
    test_plc_connection()
