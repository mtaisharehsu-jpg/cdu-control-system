#!/usr/bin/env python3
"""
簡化的模擬PLC服務器
"""

import asyncio
import logging
from pymodbus.server import StartAsyncTcpServer
from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
from pymodbus.device import ModbusDeviceIdentification
import random
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_r_register_data():
    """創建R暫存器數據 (R10000-R10010)"""
    return {
        0: 1,                           # R10000: CDU1運轉狀態 (1=運轉)
        1: 25,                          # R10001: CDU1溫度設定 (25°C)
        2: random.randint(20, 30),      # R10002: CDU1實際溫度
        3: 1,                           # R10003: CDU1風扇狀態 (1=運轉)
        4: 1,                           # R10004: CDU1壓縮機狀態 (1=運轉)
        5: 0,                           # R10005: CDU1警報狀態 (0=正常)
        6: random.randint(50, 100),     # R10006: CDU1電流值
        7: random.randint(220, 240),    # R10007: CDU1電壓值
        8: random.randint(500, 1000),   # R10008: CDU1功率值
        9: int(time.time() % 86400),    # R10009: CDU1運轉時間
        10: 0                           # R10010: CDU1維護狀態 (0=正常)
    }

async def update_data_loop(context):
    """定期更新數據"""
    while True:
        try:
            # 生成新的R暫存器數據
            new_data = create_r_register_data()
            
            # 更新Holding Registers
            slave_context = context[1]  # 獲取從站1的上下文
            hr_context = slave_context.store['h']  # Holding Registers
            
            for address, value in new_data.items():
                hr_context.setValues(address, [value])
            
            logger.info(f"Updated R registers: R10000={new_data[0]}, R10002={new_data[2]}°C")
            
            # 每5秒更新一次
            await asyncio.sleep(5)
            
        except Exception as e:
            logger.error(f"Error updating data: {e}")
            await asyncio.sleep(5)

async def main():
    """主函數"""
    # 創建初始數據
    initial_data = create_r_register_data()
    initial_values = [0] * 2000  # 擴展到2000個暫存器
    
    # 設置R10000-R10010的初始值 (對應Modbus地址0-10)
    for address, value in initial_data.items():
        initial_values[address] = value
    
    # 創建數據存儲
    store = ModbusSlaveContext(
        di=ModbusSequentialDataBlock(0, [0]*2000),      # Discrete Inputs
        co=ModbusSequentialDataBlock(0, [0]*2000),      # Coils
        hr=ModbusSequentialDataBlock(0, initial_values), # Holding Registers
        ir=ModbusSequentialDataBlock(0, [0]*2000)       # Input Registers
    )
    
    context = ModbusServerContext(slaves=store, single=True)
    
    # 設備識別
    identity = ModbusDeviceIdentification()
    identity.VendorName = 'Mitsubishi'
    identity.ProductCode = 'F5U'
    identity.VendorUrl = 'http://github.com/riptideio/pymodbus/'
    identity.ProductName = 'Mitsubishi F5U PLC Simulator'
    identity.ModelName = 'F5U PLC'
    identity.MajorMinorRevision = '1.0'
    
    # 顯示初始數據
    logger.info("Initial R register values (R10000-R10010):")
    for address, value in initial_data.items():
        logger.info(f"  R{10000+address}: {value}")
    
    # 啟動數據更新任務
    asyncio.create_task(update_data_loop(context))
    
    logger.info("🏭 Starting Mitsubishi F5U PLC server on 127.0.0.1:5020")
    logger.info("📊 R10000-R10010 registers available (Modbus address 0-10)")
    logger.info("🔄 Data updates every 5 seconds")
    
    # 啟動服務器
    await StartAsyncTcpServer(
        context=context,
        identity=identity,
        address=("127.0.0.1", 5020)
    )

if __name__ == "__main__":
    asyncio.run(main())
