#!/usr/bin/env python3
"""
三菱F5U PLC整合演示
啟動所有組件並測試PLC連接
"""

import os
import time
import threading
import subprocess
import logging
import signal
import sys
from datetime import datetime

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 全局變量
processes = []
running = True

def signal_handler(sig, frame):
    """處理Ctrl+C信號"""
    global running
    print("\n正在停止所有服務...")
    running = False
    stop_all_processes()
    sys.exit(0)

def start_process(command, name):
    """啟動子進程"""
    try:
        logger.info(f"Starting {name}...")
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        processes.append((process, name))
        logger.info(f"{name} started with PID {process.pid}")
        return process
    except Exception as e:
        logger.error(f"Error starting {name}: {e}")
        return None

def stop_all_processes():
    """停止所有子進程"""
    for process, name in processes:
        try:
            logger.info(f"Stopping {name} (PID: {process.pid})...")
            process.terminate()
            process.wait(timeout=5)
            logger.info(f"{name} stopped")
        except Exception as e:
            logger.error(f"Error stopping {name}: {e}")
            try:
                process.kill()
            except:
                pass

def monitor_process_output(process, name):
    """監控進程輸出"""
    for line in iter(process.stdout.readline, ''):
        if not running:
            break
        if line.strip():
            print(f"[{name}] {line.strip()}")
    
    if process.poll() is not None:
        logger.warning(f"{name} exited with code {process.returncode}")

def start_mock_plc_server():
    """啟動模擬PLC服務器"""
    from pymodbus.server.sync import StartTcpServer
    from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
    from pymodbus.device import ModbusDeviceIdentification
    
    # 創建初始數據
    initial_values = [0] * 2000
    # D900-D910設置一些測試值
    for i in range(11):
        initial_values[900 + i] = (i + 1) * 1000
    
    # 創建數據存儲
    store = ModbusSlaveContext(
        di=ModbusSequentialDataBlock(0, [0]*2000),
        co=ModbusSequentialDataBlock(0, [0]*2000),
        hr=ModbusSequentialDataBlock(0, initial_values),  # Holding Registers (D暫存器)
        ir=ModbusSequentialDataBlock(0, [0]*2000)
    )
    context = ModbusServerContext(slaves=store, single=True)
    
    # 設備識別
    identity = ModbusDeviceIdentification()
    identity.VendorName = 'Mitsubishi Electric'
    identity.ProductCode = 'F5U'
    identity.ProductName = 'Mock F5U PLC'
    
    # 啟動服務器
    logger.info("Starting mock PLC server on localhost:502")
    StartTcpServer(context, identity=identity, address=('localhost', 502))

def update_plc_data(context):
    """定期更新PLC數據"""
    import random
    
    while running:
        try:
            # 更新D900-D910的值
            for i in range(11):
                address = 900 + i
                value = random.randint(1000, 9999)
                context[0].setValues(3, address, [value])  # 3 = Holding Registers
            
            logger.debug("Updated PLC data")
            time.sleep(5)
        except Exception as e:
            logger.error(f"Error updating PLC data: {e}")
            time.sleep(5)

def test_plc_connection():
    """測試PLC連接"""
    import requests
    import json
    
    base_url = "http://localhost:8000"
    
    try:
        # 等待CDU系統啟動
        logger.info("Waiting for CDU system to start...")
        time.sleep(10)
        
        # 測試PLC端點
        logger.info("Testing PLC endpoint...")
        response = requests.get(f"{base_url}/plc")
        if response.status_code == 200:
            data = response.json()
            logger.info("✅ PLC endpoint accessible")
            logger.info(f"PLC count: {data.get('plc_count', 0)}")
            
            # 測試特定PLC
            logger.info("Testing PLC detail endpoint...")
            response = requests.get(f"{base_url}/plc/MitsubishiPLC1")
            if response.status_code == 200:
                plc_data = response.json()
                logger.info("✅ PLC detail endpoint accessible")
                logger.info(f"PLC Status: {plc_data.get('status', 'Unknown')}")
                logger.info(f"Connected: {plc_data.get('connected', False)}")
                
                # 持續監控PLC數據
                logger.info("Starting PLC data monitoring...")
                while running:
                    response = requests.get(f"{base_url}/plc/MitsubishiPLC1/registers")
                    if response.status_code == 200:
                        reg_data = response.json()
                        registers = reg_data.get('registers', {})
                        
                        if registers:
                            logger.info("📊 PLC Register Data:")
                            for reg_name, reg_value in registers.items():
                                logger.info(f"  {reg_name}: {reg_value}")
                        else:
                            logger.info("📊 No register data available")
                    
                    time.sleep(5)
            else:
                logger.error(f"❌ PLC detail endpoint error: {response.status_code}")
        else:
            logger.error(f"❌ PLC endpoint error: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error testing PLC connection: {e}")

def main():
    """主函數"""
    # 註冊信號處理器
    signal.signal(signal.SIGINT, signal_handler)
    
    print("🏭 三菱F5U PLC整合演示")
    print("=" * 50)
    print("此演示將啟動以下組件:")
    print("1. 模擬PLC服務器 (localhost:502)")
    print("2. CDU分散式系統 (localhost:8000)")
    print("3. PLC數據監控")
    print()
    print("按Ctrl+C停止所有服務")
    print("=" * 50)
    
    try:
        # 啟動模擬PLC服務器
        plc_server_thread = threading.Thread(
            target=start_mock_plc_server,
            daemon=True
        )
        plc_server_thread.start()
        logger.info("Mock PLC server thread started")
        
        # 等待PLC服務器啟動
        time.sleep(2)
        
        # 啟動CDU系統
        cdu_process = start_process(
            "python simple_distributed_main.py",
            "CDU System"
        )
        
        # 監控CDU輸出
        cdu_monitor_thread = threading.Thread(
            target=monitor_process_output,
            args=(cdu_process, "CDU"),
            daemon=True
        )
        cdu_monitor_thread.start()
        
        # 啟動PLC連接測試
        plc_test_thread = threading.Thread(
            target=test_plc_connection,
            daemon=True
        )
        plc_test_thread.start()
        
        # 等待所有線程完成
        while running:
            time.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Error in main: {e}")
    finally:
        stop_all_processes()
        logger.info("Demo stopped")

if __name__ == "__main__":
    main()
