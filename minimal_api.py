#!/usr/bin/env python3
"""
最簡化版API，只包含前端需要的核心功能
模擬PLC1-Temp4數據用於測試
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime
from typing import List, Dict, Any
import time
import random

app = FastAPI(
    title="Minimal CDU API for PLC1-Temp4 Testing",
    version="1.0",
    description="最簡化版CDU API用於測試PLC1-Temp4集成"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 模擬感測器數據
mock_sensor_data = {
    "Temp1": {"value": 19.3, "health": "OK", "unit": "°C"},
    "Temp2": {"value": 65.5, "health": "OK", "unit": "°C"},
    "Temp3": {"value": 25.1, "health": "OK", "unit": "°C"},
    "Press1": {"value": 10.5, "health": "OK", "unit": "Bar"},
    "Press2": {"value": 8.2, "health": "OK", "unit": "Bar"},
    "PLC1-Temp4": {"value": 54.3, "health": "OK", "unit": "°C", "raw_value": 543},  # PLC R10020: 543 -> 54.3°C
    "PLC1-Temp5": {"value": 63.2, "health": "OK", "unit": "°C", "raw_value": 632},  # PLC R10021: 632 -> 63.2°C
    "PLC1-Press1": {"value": 12.5, "health": "OK", "unit": "Bar", "raw_value": 1250},  # PLC R10030: 1250 -> 12.5 Bar
    "PLC1-Flow1": {"value": 87.4, "health": "OK", "unit": "L/min", "raw_value": 874}  # PLC R10040: 874 -> 87.4 L/min
}

@app.get("/")
async def root():
    return {
        "message": "Minimal CDU API for PLC1-Temp4 Testing",
        "version": "1.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/test")
async def api_test():
    """API連接測試端點"""
    return {
        "status": "ok",
        "message": "Minimal CDU API is running",
        "timestamp": datetime.now().isoformat(),
        "blocks_count": len(mock_sensor_data)
    }

@app.get("/api/v1/sensors/readings")
async def get_all_sensor_readings():
    """獲取所有感測器的即時讀數"""
    
    readings = []
    
    for block_id, data in mock_sensor_data.items():
        # 添加一些隨機變化以模擬真實數據
        base_value = data["value"]
        variation = random.uniform(-0.5, 0.5)  # ±0.5的變化
        current_value = round(base_value + variation, 1)
        
        reading = {
            'block_id': block_id,
            'block_type': get_block_type(block_id),
            'value': current_value,
            'status': 'Enabled',
            'health': data["health"],
            'unit': data["unit"]
        }
        
        # 根據感測器類型添加額外資訊
        if block_id == "PLC1-Temp4":
            reading['device'] = None
            reading['modbus_address'] = None
            reading['register'] = 20
            reading['ip_address'] = "10.10.40.8"
            reading['port'] = 502
            reading['unit_id'] = 1
        elif block_id == "PLC1-Temp5":
            reading['device'] = None
            reading['modbus_address'] = None
            reading['register'] = 21
            reading['ip_address'] = "10.10.40.8"
            reading['port'] = 502
            reading['unit_id'] = 1
        elif block_id == "PLC1-Press1":
            reading['device'] = None
            reading['modbus_address'] = None
            reading['register'] = 30
            reading['ip_address'] = "10.10.40.8"
            reading['port'] = 502
            reading['unit_id'] = 1
        elif block_id == "PLC1-Flow1":
            reading['device'] = None
            reading['modbus_address'] = None
            reading['register'] = 40
            reading['ip_address'] = "10.10.40.8"
            reading['port'] = 502
            reading['unit_id'] = 1
        elif block_id.startswith("Temp"):
            reading['device'] = "COM7"
            reading['modbus_address'] = 4
            reading['register'] = int(block_id[-1]) - 1 if block_id[-1].isdigit() else 0
        elif block_id.startswith("Press"):
            reading['device'] = "COM7"
            reading['modbus_address'] = 5
            reading['register'] = int(block_id[-1]) + 1 if block_id[-1].isdigit() else 2
        
        readings.append(reading)
    
    return readings

@app.get("/api/v1/function-blocks/config")
async def get_function_blocks_config():
    """獲取功能區塊配置"""
    
    config_blocks = []
    
    for block_id, data in mock_sensor_data.items():
        block_config = {
            'block_id': block_id,
            'block_type': get_block_type(block_id),
            'unit': data["unit"]
        }
        
        # 根據感測器類型設定配置
        if block_id == "PLC1-Temp4":
            block_config.update({
                'sensor_category': 'temperature',
                'ip_address': "10.10.40.8",
                'port': 502,
                'unit_id': 1,
                'register': 20,
                'device': None,
                'modbus_address': None,
                'start_register': None,
                'min_actual': 0.0,
                'max_actual': 100.0,
                'precision': 0.1
            })
        elif block_id == "PLC1-Temp5":
            block_config.update({
                'sensor_category': 'temperature',
                'ip_address': "10.10.40.8",
                'port': 502,
                'unit_id': 1,
                'register': 21,
                'device': None,
                'modbus_address': None,
                'start_register': None,
                'min_actual': 0.0,
                'max_actual': 100.0,
                'precision': 0.1
            })
        elif block_id == "PLC1-Press1":
            block_config.update({
                'sensor_category': 'pressure',
                'ip_address': "10.10.40.8",
                'port': 502,
                'unit_id': 1,
                'register': 30,
                'device': None,
                'modbus_address': None,
                'start_register': None,
                'min_actual': 0.0,
                'max_actual': 20.0,
                'precision': 0.01
            })
        elif block_id == "PLC1-Flow1":
            block_config.update({
                'sensor_category': 'flow',
                'ip_address': "10.10.40.8",
                'port': 502,
                'unit_id': 1,
                'register': 40,
                'device': None,
                'modbus_address': None,
                'start_register': None,
                'min_actual': 0.0,
                'max_actual': 200.0,
                'precision': 0.1
            })
        elif 'Temp' in block_id:
            block_config.update({
                'sensor_category': 'temperature',
                'device': 'COM7',
                'modbus_address': 4,
                'register': int(block_id[-1]) - 1 if block_id[-1].isdigit() else 0,
                'ip_address': None,
                'port': None,
                'unit_id': None,
                'start_register': None,
                'min_actual': 0.0,
                'max_actual': 100.0,
                'precision': 0.1
            })
        elif 'Press' in block_id:
            block_config.update({
                'sensor_category': 'pressure',
                'device': 'COM7',
                'modbus_address': 5,
                'register': int(block_id[-1]) + 1 if block_id[-1].isdigit() else 2,
                'ip_address': None,
                'port': None,
                'unit_id': None,
                'start_register': None,
                'min_actual': 0.0,
                'max_actual': 15.0,
                'precision': 0.01
            })
        
        config_blocks.append(block_config)
    
    return {
        'machine_name': '動態分散式功能區塊模型',
        'description': f'模擬配置，包含 {len(config_blocks)} 個功能區塊（包括 PLC1-Temp4）',
        'function_blocks': config_blocks,
        'timestamp': datetime.now().isoformat()
    }

def get_block_type(block_id: str) -> str:
    """根據block_id推斷區塊類型"""
    if block_id.startswith("PLC1-"):
        return "MitsubishiPLCBlock"
    elif block_id.startswith("Temp"):
        return "TempSensorBlock"
    elif block_id.startswith("Press"):
        return "PressSensorBlock"
    else:
        return "UnknownBlock"

if __name__ == "__main__":
    print("Starting Minimal CDU API on port 8001...")
    print("This API includes PLC sensors: PLC1-Temp4, PLC1-Temp5, PLC1-Press1, PLC1-Flow1")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")