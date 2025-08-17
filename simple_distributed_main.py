#!/usr/bin/env python3
"""
簡化版分散式CDU系統啟動腳本
跳過一些可能有問題的組件，專注於核心功能
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import threading
import logging
import uvicorn
import time
from typing import Dict, List, Optional, Any
from datetime import datetime

# 導入分散式CDU系統組件
from distributed_engine import DistributedCDUEngine
from log_manager import get_log_manager
from snmp_alarm_manager import SNMPAlarmManager, AlarmLevel, AlarmCategory, AlarmInstance
from cdu_logging_system import get_logging_system, LogLevel

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# === 警報系統相關的Pydantic模型 ===
class AlarmThresholdUpdate(BaseModel):
    sensor_id: str = Field(..., description="感測器 ID")
    warning_min: Optional[float] = Field(None, description="警告最小值")
    warning_max: Optional[float] = Field(None, description="警告最大值")
    alert_min: Optional[float] = Field(None, description="警報最小值")
    alert_max: Optional[float] = Field(None, description="警報最大值")
    enabled: Optional[bool] = Field(None, description="是否啟用")

class SNMPSettings(BaseModel):
    enabled: bool = Field(True, description="是否啟用 SNMP")
    destination_ip: str = Field("192.168.100.100", description="目標 IP")
    port: int = Field(162, description="SNMP 埠號")
    community: str = Field("public", description="Community 字串")
    version: str = Field("v2c", description="SNMP 版本")
    warning_interval: int = Field(30, description="警告發送間隔(秒)")
    alert_interval: int = Field(10, description="警報發送間隔(秒)")

class AlarmResponse(BaseModel):
    alarm_id: str
    name: str
    category: str
    level: str
    timestamp: datetime
    message: str
    acknowledged: bool
    cleared: bool
    value: Optional[float]
    unit: Optional[str]
    device_id: Optional[str]

class AlarmStatistics(BaseModel):
    total_active: int
    total_acknowledged: int
    total_today: int
    by_category: Dict[str, int]
    by_level: Dict[str, int]

class BatchWriteRequest(BaseModel):
    start_address: int
    values: List[int]

class SimplifiedDistributedCDUAPI:
    """簡化版分散式CDU系統API"""
    
    def __init__(self, config_path: str):
        # 初始化日誌管理器
        self.log_manager = get_log_manager()

        # 初始化警報管理器
        self.alarm_manager: Optional[SNMPAlarmManager] = None
        self.security = HTTPBearer()

        # 初始化分散式引擎
        logger.info("Initializing Simplified Distributed CDU System...")
        self.log_manager.log_system_event("Initializing Simplified Distributed CDU System...")

        self.engine = DistributedCDUEngine(config_path)

        # 運行狀態標誌
        self.running = False

        # 創建FastAPI應用
        self.app = FastAPI(
            title="Simplified Distributed CDU Control System API",
            version="2.0-simplified",
            description="簡化版分散式自主CDU系統控制API"
        )

        # 配置CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # 添加API請求日誌中間件
        self._add_logging_middleware()

        # 註冊路由
        self._register_routes()

        # 啟動背景服務
        self._start_background_services()

        logger.info("Simplified Distributed CDU API initialized successfully")
        self.log_manager.log_system_event("Simplified Distributed CDU API initialized successfully")

    def _add_logging_middleware(self):
        """添加API請求日誌中間件"""
        @self.app.middleware("http")
        async def log_requests(request: Request, call_next):
            start_time = time.time()
            response = await call_next(request)
            process_time = time.time() - start_time

            # 記錄API請求
            self.log_manager.log_api_request(
                method=request.method,
                endpoint=str(request.url.path),
                status_code=response.status_code,
                response_time=process_time
            )

            return response
    
    def _register_routes(self):
        """註冊API路由"""
        
        @self.app.get("/")
        async def root():
            return {
                "message": "Welcome to the Simplified Distributed CDU Control System API",
                "version": "2.0-simplified",
                "node_id": self.engine.node_id
            }
        
        @self.app.get("/health")
        async def health_check():
            """健康檢查"""
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "node_id": self.engine.node_id,
                "engine_status": "running" if hasattr(self.engine, 'running') and self.engine.running else "unknown"
            }
        
        @self.app.get("/status")
        async def get_system_status():
            """獲取系統狀態"""
            try:
                status = self.engine.get_system_status()
                return {
                    "node_id": self.engine.node_id,
                    "status": status,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                logger.error(f"Error getting system status: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/sensors")
        async def get_all_sensors():
            """獲取所有感測器資訊"""
            try:
                sensors = {}
                for block_id, block in self.engine.blocks.items():
                    sensor_data = {
                        "id": block_id,
                        "type": type(block).__name__,
                        "status": getattr(block, 'output_status', 'unknown'),
                        "health": getattr(block, 'output_health', 'unknown')
                    }

                    # 根據感測器類型添加實際讀數
                    if hasattr(block, 'output_temperature'):
                        sensor_data["temperature"] = getattr(block, 'output_temperature', -1.0)
                        sensor_data["temperature_units"] = "°C"

                    if hasattr(block, 'output_pressure'):
                        sensor_data["pressure"] = getattr(block, 'output_pressure', -1.0)
                        sensor_data["pressure_units"] = "Bar"

                    if hasattr(block, 'output_level_status'):
                        sensor_data["level_status"] = getattr(block, 'output_level_status', 'unknown')

                    if hasattr(block, 'output_current_rpm'):
                        sensor_data["current_rpm"] = getattr(block, 'output_current_rpm', 0.0)
                        sensor_data["rpm_units"] = "RPM"

                    # 三菱PLC數據
                    if hasattr(block, 'register_values'):
                        sensor_data["plc_registers"] = getattr(block, 'register_values', {})
                        sensor_data["plc_connected"] = getattr(block, 'connected', False)
                        sensor_data["plc_ip"] = getattr(block, 'ip_address', 'unknown')

                    sensors[block_id] = sensor_data

                return sensors
            except Exception as e:
                logger.error(f"Error getting sensors: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/sensors/{sensor_id}")
        async def get_sensor_detail(sensor_id: str):
            """獲取特定感測器的詳細資訊"""
            try:
                if sensor_id not in self.engine.blocks:
                    raise HTTPException(status_code=404, detail=f"Sensor '{sensor_id}' not found")

                block = self.engine.blocks[sensor_id]

                # 強制更新感測器數據
                if hasattr(block, 'update'):
                    block.update()

                sensor_data = {
                    "id": sensor_id,
                    "type": type(block).__name__,
                    "status": getattr(block, 'output_status', 'unknown'),
                    "health": getattr(block, 'output_health', 'unknown'),
                    "last_updated": datetime.now().isoformat()
                }

                # 添加配置信息
                if hasattr(block, 'config'):
                    sensor_data["config"] = {
                        "device": getattr(block, 'device', 'unknown'),
                        "modbus_address": getattr(block, 'modbus_address', 'unknown'),
                        "register": getattr(block, 'register', 'unknown')
                    }

                # 根據感測器類型添加實際讀數
                if hasattr(block, 'output_temperature'):
                    sensor_data["temperature"] = {
                        "value": getattr(block, 'output_temperature', -1.0),
                        "units": "°C",
                        "status": "valid" if getattr(block, 'output_temperature', -1.0) >= 0 else "invalid"
                    }

                if hasattr(block, 'output_pressure'):
                    sensor_data["pressure"] = {
                        "value": getattr(block, 'output_pressure', -1.0),
                        "units": "Bar",
                        "status": "valid" if getattr(block, 'output_pressure', -1.0) >= 0 else "invalid"
                    }

                if hasattr(block, 'output_level_status'):
                    sensor_data["level"] = {
                        "status": getattr(block, 'output_level_status', 'unknown')
                    }

                if hasattr(block, 'output_current_rpm'):
                    sensor_data["rpm"] = {
                        "value": getattr(block, 'output_current_rpm', 0.0),
                        "units": "RPM"
                    }

                return sensor_data
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error getting sensor detail for {sensor_id}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/plc")
        async def get_all_plc_data():
            """獲取所有PLC數據"""
            try:
                plc_data = {}
                for block_id, block in self.engine.blocks.items():
                    if hasattr(block, 'get_status_info') and 'PLC' in type(block).__name__:
                        plc_data[block_id] = block.get_status_info()

                return {
                    "timestamp": datetime.now().isoformat(),
                    "plc_count": len(plc_data),
                    "plc_data": plc_data
                }
            except Exception as e:
                logger.error(f"Error getting PLC data: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/plc/{plc_id}")
        async def get_plc_detail(plc_id: str):
            """獲取特定PLC的詳細資訊"""
            try:
                if plc_id not in self.engine.blocks:
                    raise HTTPException(status_code=404, detail=f"PLC '{plc_id}' not found")

                block = self.engine.blocks[plc_id]

                if not hasattr(block, 'get_status_info'):
                    raise HTTPException(status_code=400, detail=f"Block '{plc_id}' is not a PLC block")

                # 強制更新PLC數據
                if hasattr(block, 'update'):
                    block.update()

                return block.get_status_info()

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error getting PLC detail for {plc_id}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/plc/{plc_id}/registers")
        async def get_plc_registers(plc_id: str):
            """獲取PLC的D暫存器數據"""
            try:
                if plc_id not in self.engine.blocks:
                    raise HTTPException(status_code=404, detail=f"PLC '{plc_id}' not found")

                block = self.engine.blocks[plc_id]

                if not hasattr(block, 'get_all_registers'):
                    raise HTTPException(status_code=400, detail=f"Block '{plc_id}' is not a PLC block")

                return {
                    "plc_id": plc_id,
                    "timestamp": datetime.now().isoformat(),
                    "connected": getattr(block, 'connected', False),
                    "d_registers": block.get_all_registers(),
                    "r_registers": getattr(block, 'get_all_r_registers', lambda: {})()
                }

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error getting PLC registers for {plc_id}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/plc/{plc_id}/write_register")
        async def write_plc_register(plc_id: str, register_address: int, value: int):
            """寫入PLC的R暫存器"""
            try:
                if plc_id not in self.engine.blocks:
                    raise HTTPException(status_code=404, detail=f"PLC '{plc_id}' not found")

                block = self.engine.blocks[plc_id]

                if not hasattr(block, 'write_r_register'):
                    raise HTTPException(status_code=400, detail=f"Block '{plc_id}' does not support register writing")

                # 記錄寫入操作
                self.log_manager.log_system_event(f"Writing R{register_address} = {value} to PLC {plc_id}")

                success = block.write_r_register(register_address, value)

                if success:
                    return {
                        "plc_id": plc_id,
                        "register": f"R{register_address}",
                        "value": value,
                        "status": "success",
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    raise HTTPException(status_code=500, detail="Failed to write register")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error writing register R{register_address} for {plc_id}: {e}")
                self.log_manager.log_error("PLCWrite", f"Error writing R{register_address}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/plc/{plc_id}/write_registers_batch")
        async def write_plc_registers_batch(plc_id: str, request: BatchWriteRequest):
            """批量寫入PLC的R暫存器"""
            try:
                if plc_id not in self.engine.blocks:
                    raise HTTPException(status_code=404, detail=f"PLC '{plc_id}' not found")

                block = self.engine.blocks[plc_id]

                if not hasattr(block, 'write_r_registers_batch'):
                    raise HTTPException(status_code=400, detail=f"Block '{plc_id}' does not support batch register writing")

                # 記錄批量寫入操作
                start_address = request.start_address
                values = request.values
                end_address = start_address + len(values) - 1
                self.log_manager.log_system_event(f"Batch writing R{start_address}-R{end_address} ({len(values)} registers) to PLC {plc_id}")

                success = block.write_r_registers_batch(start_address, values)

                if success:
                    return {
                        "plc_id": plc_id,
                        "start_register": f"R{start_address}",
                        "end_register": f"R{end_address}",
                        "count": len(values),
                        "values": values,
                        "status": "success",
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    raise HTTPException(status_code=500, detail="Failed to write registers")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error batch writing registers for {plc_id}: {e}")
                self.log_manager.log_error("PLCBatchWrite", f"Error batch writing registers: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/cluster/nodes")
        async def get_cluster_nodes():
            """獲取集群節點資訊"""
            return {
                "current_node": self.engine.node_id,
                "total_nodes": self.engine.config['CDU_System']['total_nodes'],
                "node_priority": self.engine.config['CDU_System']['priority_map'].get(self.engine.node_id, 999)
            }

        # === 前端整合API端點 ===
        @self.app.get("/api/v1/test")
        async def api_test():
            """API連接測試端點"""
            return {
                "status": "ok",
                "message": "Simplified Distributed CDU API is running",
                "timestamp": datetime.now().isoformat(),
                "blocks_count": len(self.engine.blocks)
            }

        @self.app.get("/api/v1/sensors/readings")
        async def get_all_sensor_readings():
            """獲取所有感測器的即時讀數 (公開端點用於前端整合)"""
            
            readings = []
            logger.info(f"API called: getting sensor readings from {len(self.engine.blocks)} blocks")
            
            for block_id, block in self.engine.blocks.items():
                try:
                    logger.info(f"Processing block {block_id} of type {type(block).__name__}")
                    
                    reading = {
                        'block_id': block_id,
                        'block_type': type(block).__name__,
                        'value': 0.0,
                        'status': 'Unknown',
                        'health': 'Unknown',
                        'unit': '',
                        'device': getattr(block, 'device', None),
                        'modbus_address': getattr(block, 'modbus_address', None),
                        'register': getattr(block, 'register', None)
                    }
                    
                    # 根據不同的感測器類型獲取對應的數據
                    if hasattr(block, 'output_temperature') and block.output_temperature > -1.0:
                        temp_value = block.output_temperature
                        reading['value'] = temp_value
                        reading['unit'] = "°C"
                        reading['status'] = getattr(block, 'output_status', 'Unknown')
                        reading['health'] = getattr(block, 'output_health', 'Unknown')
                        logger.info(f"Block {block_id}: Temperature = {temp_value}°C")
                    elif hasattr(block, 'output_pressure') and block.output_pressure > -1.0:
                        press_value = block.output_pressure
                        reading['value'] = press_value
                        reading['unit'] = "Bar"
                        reading['status'] = getattr(block, 'output_status', 'Unknown')
                        reading['health'] = getattr(block, 'output_health', 'Unknown')
                        logger.info(f"Block {block_id}: Pressure = {press_value} Bar")
                    elif hasattr(block, 'output_flow') and block.output_flow > -1.0:
                        flow_value = block.output_flow
                        reading['value'] = flow_value
                        reading['unit'] = "L/min"
                        reading['status'] = getattr(block, 'output_status', 'Unknown')
                        reading['health'] = getattr(block, 'output_health', 'Unknown')
                        logger.info(f"Block {block_id}: Flow = {flow_value} L/min")
                    elif hasattr(block, 'register_values') and hasattr(block, 'connected'):
                        # 處理PLC區塊
                        if getattr(block, 'connected', False):
                            single_register = getattr(block, 'register', None)
                            register_values = getattr(block, 'register_values', {})
                            
                            if register_values and single_register is not None and single_register in register_values:
                                register_value = register_values[single_register]
                                reading['value'] = float(register_value)
                                logger.info(f"Block {block_id}: PLC Single Register R{10000 + single_register} = {reading['value']}")
                                
                                # 根據區塊ID判斷數據類型和單位
                                if 'Temp' in block_id or 'temp' in block_id.lower():
                                    # 溫度數據，假設需要轉換 (例如: raw值/10 = 實際溫度)
                                    reading['value'] = reading['value'] / 10.0 if reading['value'] > 100 else reading['value']
                                    reading['unit'] = "°C"
                                elif 'Press' in block_id or 'press' in block_id.lower():
                                    # 壓力數據
                                    reading['value'] = reading['value'] / 100.0 if reading['value'] > 100 else reading['value']
                                    reading['unit'] = "Bar"
                                elif 'Flow' in block_id or 'flow' in block_id.lower():
                                    # 流量數據
                                    reading['value'] = reading['value'] / 10.0 if reading['value'] > 100 else reading['value']
                                    reading['unit'] = "L/min"
                                else:
                                    reading['unit'] = "Value"
                                
                                reading['status'] = 'Enabled'
                                reading['health'] = 'OK'
                            else:
                                reading['value'] = 0.0
                                reading['unit'] = "Value"
                                reading['status'] = 'Connected'
                                reading['health'] = 'Warning'
                        else:
                            reading['value'] = 0.0
                            reading['unit'] = "Value" 
                            reading['status'] = 'Disconnected'
                            reading['health'] = 'Critical'
                            logger.info(f"Block {block_id}: PLC Disconnected")
                    
                    readings.append(reading)
                    
                except Exception as e:
                    logger.error(f"Error reading sensor data for block {block_id}: {e}")
                    # 添加錯誤狀態的讀數
                    error_reading = {
                        'block_id': block_id,
                        'block_type': type(block).__name__,
                        'value': -1.0,
                        'status': 'Error',
                        'health': 'Critical',
                        'unit': 'N/A'
                    }
                    readings.append(error_reading)
            
            return readings

        @self.app.get("/api/v1/function-blocks/config")
        async def get_function_blocks_config():
            """獲取功能區塊配置 (公開端點用於前端動態配置)"""
            
            try:
                config_blocks = []
                logger.info(f"Getting function blocks config from {len(self.engine.blocks)} blocks")
                
                for block_id, block in self.engine.blocks.items():
                    block_config = {
                        'block_id': block_id,
                        'block_type': type(block).__name__,
                        'device': getattr(block, 'device', None),
                        'modbus_address': getattr(block, 'modbus_address', None),
                        'register': getattr(block, 'register', None),
                        'start_register': getattr(block, 'start_register', None),
                        'ip_address': getattr(block, 'ip_address', None),
                        'port': getattr(block, 'port', None),
                        'unit_id': getattr(block, 'unit_id', None)
                    }
                    
                    # 根據區塊類型和ID確定感測器類別
                    if 'Temp' in type(block).__name__:
                        block_config['sensor_category'] = 'temperature'
                        block_config['unit'] = '°C'
                        block_config['min_actual'] = 0.0
                        block_config['max_actual'] = 100.0
                        block_config['precision'] = 0.1
                    elif 'Press' in type(block).__name__:
                        block_config['sensor_category'] = 'pressure' 
                        block_config['unit'] = 'bar'
                        block_config['min_actual'] = 0.0
                        block_config['max_actual'] = 15.0
                        block_config['precision'] = 0.01
                    elif 'PLC' in type(block).__name__:
                        # 根據PLC區塊的ID判斷數據類型
                        if 'Temp' in block_id or 'temp' in block_id.lower():
                            block_config['sensor_category'] = 'temperature'
                            block_config['unit'] = '°C'
                            block_config['min_actual'] = 0.0
                            block_config['max_actual'] = 100.0
                            block_config['precision'] = 0.1
                        elif 'Press' in block_id or 'press' in block_id.lower():
                            block_config['sensor_category'] = 'pressure'
                            block_config['unit'] = 'bar'
                            block_config['min_actual'] = 0.0
                            block_config['max_actual'] = 15.0
                            block_config['precision'] = 0.01
                        elif 'Flow' in block_id or 'flow' in block_id.lower():
                            block_config['sensor_category'] = 'flow'
                            block_config['unit'] = 'L/min'
                            block_config['min_actual'] = 0.0
                            block_config['max_actual'] = 200.0
                            block_config['precision'] = 0.1
                        else:
                            # 預設為溫度
                            block_config['sensor_category'] = 'temperature'
                            block_config['unit'] = '°C'
                            block_config['min_actual'] = 0.0
                            block_config['max_actual'] = 100.0
                            block_config['precision'] = 0.1
                    else:
                        block_config['sensor_category'] = 'io'
                        block_config['unit'] = '%'
                        block_config['min_actual'] = 0.0
                        block_config['max_actual'] = 100.0
                        block_config['precision'] = 0.1
                    
                    config_blocks.append(block_config)
                    logger.info(f"Added config for block {block_id}: {block_config['sensor_category']}")
                
                return {
                    'machine_name': '動態分散式功能區塊模型',
                    'description': f'從 distributed_cdu_config.yaml 動態載入的配置，包含 {len(config_blocks)} 個功能區塊',
                    'function_blocks': config_blocks,
                    'timestamp': datetime.now().isoformat()
                }
                
            except Exception as e:
                logger.error(f"Error getting function blocks config: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to get function blocks config: {str(e)}")

        # === 警報系統API端點 ===
        
        def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(self.security)):
            """取得當前使用者 (簡化版驗證)"""
            # 這裡應該實現實際的 JWT 驗證
            return {"user_id": "admin", "role": "administrator"}

        @self.app.get("/redfish/v1/Systems/CDU1/Oem/CDU/Alarms")
        async def get_cdu_alarm_registers():
            """獲取基於R10001-R10005暫存器的完整異常信息"""
            try:
                # 異常代碼定義 (根據README_CDU_Alarms_API.md)
                alarm_definitions = self._get_alarm_definitions()
                
                # 從PLC讀取R10001-R10005暫存器
                alarm_registers = {}
                active_alarms = []
                
                for register_addr in range(10001, 10006):
                    register_data = self._read_alarm_register(register_addr)
                    if register_data:
                        alarm_registers[f"R{register_addr}"] = register_data
                        # 解析位位狀態並檢查活躍異常
                        for bit_pos in range(16):
                            alarm_code = f"A{(register_addr - 10001) * 16 + bit_pos + 1:03d}"
                            if register_data["status_bits"].get(f"bit{bit_pos}", {}).get("active", False):
                                active_alarms.append(register_data["status_bits"][f"bit{bit_pos}"])

                # 計算異常摘要
                alarm_summary = self._calculate_alarm_summary(active_alarms)

                return {
                    "success": True,
                    "alarm_registers": alarm_registers,
                    "active_alarms": active_alarms,
                    "alarm_summary": alarm_summary,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                logger.error(f"Error getting CDU alarm registers: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/redfish/v1/Chassis/CDU_Main/Alarms/", response_model=List[AlarmResponse])
        async def get_active_alarms(
            category: Optional[str] = None,
            level: Optional[str] = None,
            limit: int = 100,
            current_user: dict = Depends(get_current_user)
        ):
            """取得活躍警報列表"""
            if not self.alarm_manager:
                raise HTTPException(status_code=503, detail="Alarm manager not initialized")
            
            logging_system = get_logging_system()
            logging_system.log_api_request(
                "GET", "/redfish/v1/Chassis/CDU_Main/Alarms/", 200, 0,
                user_id=current_user["user_id"]
            )
            
            active_alarms = self.alarm_manager.get_active_alarms()
            
            # 過濾條件
            if category:
                active_alarms = [a for a in active_alarms if self.alarm_manager.get_alarm_definition(a.alarm_id).category.value == category]
            if level:
                active_alarms = [a for a in active_alarms if a.level.value == level]
            
            # 限制數量
            active_alarms = active_alarms[:limit]
            
            # 轉換為回應格式
            response_alarms = []
            for alarm in active_alarms:
                alarm_def = self.alarm_manager.get_alarm_definition(alarm.alarm_id)
                response_alarms.append(AlarmResponse(
                    alarm_id=alarm.alarm_id,
                    name=alarm_def.name if alarm_def else "Unknown",
                    category=alarm_def.category.value if alarm_def else "unknown",
                    level=alarm.level.value,
                    timestamp=alarm.timestamp,
                    message=alarm.message,
                    acknowledged=alarm.acknowledged,
                    cleared=alarm.cleared,
                    value=alarm.value,
                    unit=alarm.unit,
                    device_id=alarm.device_id
                ))
            
            return response_alarms

        @self.app.post("/redfish/v1/Chassis/CDU_Main/Alarms/{alarm_id}/Actions/Acknowledge")
        async def acknowledge_alarm(
            alarm_id: str,
            current_user: dict = Depends(get_current_user)
        ):
            """確認警報"""
            if not self.alarm_manager:
                raise HTTPException(status_code=503, detail="Alarm manager not initialized")
            
            success = self.alarm_manager.acknowledge_alarm(alarm_id)
            
            if not success:
                raise HTTPException(status_code=404, detail=f"Alarm {alarm_id} not found or already acknowledged")
            
            # 記錄使用者操作
            logging_system = get_logging_system()
            logging_system.log_user_event(
                current_user["user_id"],
                "acknowledge_alarm",
                {"alarm_id": alarm_id}
            )
            
            return {"message": f"Alarm {alarm_id} acknowledged successfully"}

        @self.app.get("/redfish/v1/Chassis/CDU_Main/Alarms/Statistics", response_model=AlarmStatistics)
        async def get_alarm_statistics(current_user: dict = Depends(get_current_user)):
            """取得警報統計資訊"""
            if not self.alarm_manager:
                raise HTTPException(status_code=503, detail="Alarm manager not initialized")
            
            active_alarms = self.alarm_manager.get_active_alarms()
            alarm_history = self.alarm_manager.get_alarm_history(1000)
            
            # 今日警報
            today = datetime.now().date()
            today_alarms = [a for a in alarm_history if a.timestamp.date() == today]
            
            # 按類別統計
            category_stats = {}
            for alarm in active_alarms:
                alarm_def = self.alarm_manager.get_alarm_definition(alarm.alarm_id)
                if alarm_def:
                    category = alarm_def.category.value
                    category_stats[category] = category_stats.get(category, 0) + 1
            
            # 按等級統計
            level_stats = {}
            for alarm in active_alarms:
                level = alarm.level.value
                level_stats[level] = level_stats.get(level, 0) + 1
            
            return AlarmStatistics(
                total_active=len(active_alarms),
                total_acknowledged=len([a for a in active_alarms if a.acknowledged]),
                total_today=len(today_alarms),
                by_category=category_stats,
                by_level=level_stats
            )

        @self.app.get("/redfish/v1/Chassis/CDU_Main/Alarms/History")
        async def get_alarm_history(
            start_date: Optional[datetime] = None,
            end_date: Optional[datetime] = None,
            limit: int = 100,
            current_user: dict = Depends(get_current_user)
        ):
            """取得警報歷史"""
            if not self.alarm_manager:
                raise HTTPException(status_code=503, detail="Alarm manager not initialized")
            
            alarm_history = self.alarm_manager.get_alarm_history(limit * 2)  # 多取一些以便過濾
            
            # 日期過濾
            if start_date:
                alarm_history = [a for a in alarm_history if a.timestamp >= start_date]
            if end_date:
                alarm_history = [a for a in alarm_history if a.timestamp <= end_date]
            
            # 限制數量
            alarm_history = alarm_history[-limit:]
            
            # 轉換格式
            response_alarms = []
            for alarm in alarm_history:
                alarm_def = self.alarm_manager.get_alarm_definition(alarm.alarm_id)
                response_alarms.append({
                    "alarm_id": alarm.alarm_id,
                    "name": alarm_def.name if alarm_def else "Unknown",
                    "category": alarm_def.category.value if alarm_def else "unknown",
                    "level": alarm.level.value,
                    "timestamp": alarm.timestamp,
                    "message": alarm.message,
                    "acknowledged": alarm.acknowledged,
                    "cleared": alarm.cleared,
                    "clear_timestamp": alarm.clear_timestamp,
                    "value": alarm.value,
                    "unit": alarm.unit,
                    "device_id": alarm.device_id
                })
            
            return response_alarms

        @self.app.put("/redfish/v1/Chassis/CDU_Main/Alarms/Settings/SNMP")
        async def update_snmp_settings(
            settings: SNMPSettings,
            current_user: dict = Depends(get_current_user)
        ):
            """更新 SNMP 設定"""
            if not self.alarm_manager:
                raise HTTPException(status_code=503, detail="Alarm manager not initialized")
            
            # 記錄設定變更
            logging_system = get_logging_system()
            logging_system.log_control_change(
                "snmp_settings",
                "previous_settings",
                settings.dict(),
                user_id=current_user["user_id"]
            )
            
            return {"message": "SNMP settings updated successfully"}

        @self.app.post("/redfish/v1/Chassis/CDU_Main/Alarms/Actions/TestSNMP")
        async def test_snmp_connection(current_user: dict = Depends(get_current_user)):
            """測試 SNMP 連接"""
            if not self.alarm_manager:
                raise HTTPException(status_code=503, detail="Alarm manager not initialized")
            
            # 發送測試警報
            test_success = self.alarm_manager.trigger_alarm(
                "S005",  # 測試警報
                custom_message="SNMP connection test"
            )
            
            if test_success:
                # 立即清除測試警報
                self.alarm_manager.clear_alarm("S005")
                return {"message": "SNMP test completed successfully"}
            else:
                raise HTTPException(status_code=500, detail="SNMP test failed")
    
    def _update_blocks(self):
        """更新所有功能塊"""
        while self.running:
            try:
                for block_id, block in self.engine.blocks.items():
                    if hasattr(block, 'update'):
                        block.update()
                        logger.debug(f"Updated block: {block_id}")

                        # 記錄感測器數據
                        if hasattr(block, 'output_temperature'):
                            temp = getattr(block, 'output_temperature', -1.0)
                            status = getattr(block, 'output_status', 'Unknown')
                            if temp >= 0:
                                self.log_manager.log_sensor_data(block_id, "Temperature", temp, "°C", status)

                        if hasattr(block, 'output_pressure'):
                            pressure = getattr(block, 'output_pressure', -1.0)
                            status = getattr(block, 'output_status', 'Unknown')
                            if pressure >= 0:
                                self.log_manager.log_sensor_data(block_id, "Pressure", pressure, "Bar", status)

                        if hasattr(block, 'output_flow'):
                            flow = getattr(block, 'output_flow', -1.0)
                            status = getattr(block, 'output_status', 'Unknown')
                            if flow >= 0:
                                self.log_manager.log_sensor_data(block_id, "Flow", flow, "L/min", status)

                        # 記錄PLC數據
                        if hasattr(block, 'register_values') and hasattr(block, 'connected'):
                            if getattr(block, 'connected', False):
                                registers = getattr(block, 'register_values', {})
                                if registers:
                                    self.log_manager.log_plc_data(block_id, registers, "Connected")

                # 每1秒更新一次 (實時監控)
                time.sleep(1)
            except Exception as e:
                logger.error(f"Error updating blocks: {e}")
                self.log_manager.log_error("BlockUpdate", f"Error updating blocks: {e}")
                time.sleep(1)

    def _get_alarm_definitions(self):
        """獲取80個異常代碼定義 (根據README_CDU_Alarms_API.md)"""
        return {
            # R10001 異常信息1 (A001-A016)
            "A001": {"bit": 0, "name": "[A001]水泵[1]異常", "description": "0=無故障 1=有故障"},
            "A002": {"bit": 1, "name": "[A002]水泵[2]異常", "description": "0=無故障 1=有故障"},
            "A003": {"bit": 2, "name": "[A003]水泵[1]通訊故障", "description": "0=無故障 1=有故障"},
            "A004": {"bit": 3, "name": "[A004]水泵[2]通訊故障", "description": "0=無故障 1=有故障"},
            "A005": {"bit": 4, "name": "[A005]備用異常5", "description": "0=無故障 1=有故障"},
            "A006": {"bit": 5, "name": "[A006]備用異常6", "description": "0=無故障 1=有故障"},
            "A007": {"bit": 6, "name": "[A007]備用異常7", "description": "0=無故障 1=有故障"},
            "A008": {"bit": 7, "name": "[A008]備用異常8", "description": "0=無故障 1=有故障"},
            "A009": {"bit": 8, "name": "[A009]內部回水T12溫度過低", "description": "0=無故障 1=有故障"},
            "A010": {"bit": 9, "name": "[A010]內部回水T12溫度過高", "description": "0=無故障 1=有故障"},
            "A011": {"bit": 10, "name": "[A011]備用異常11", "description": "0=無故障 1=有故障"},
            "A012": {"bit": 11, "name": "[A012]備用異常12", "description": "0=無故障 1=有故障"},
            "A013": {"bit": 12, "name": "[A013]備用異常13", "description": "0=無故障 1=有故障"},
            "A014": {"bit": 13, "name": "[A014]備用異常14", "description": "0=無故障 1=有故障"},
            "A015": {"bit": 14, "name": "[A015]內部回水P12水泵入水壓過低", "description": "0=無故障 1=有故障"},
            "A016": {"bit": 15, "name": "[A016]內部回水P12水泵入水壓過高", "description": "0=無故障 1=有故障"},
            
            # R10002 異常信息2 (A017-A032)
            "A017": {"bit": 0, "name": "[A017]內部回水P13水泵入水壓過低", "description": "0=無故障 1=有故障"},
            "A018": {"bit": 1, "name": "[A018]備用異常18", "description": "0=無故障 1=有故障"},
            "A019": {"bit": 2, "name": "[A019]備用異常19", "description": "0=無故障 1=有故障"},
            "A020": {"bit": 3, "name": "[A020]備用異常20", "description": "0=無故障 1=有故障"},
            "A021": {"bit": 4, "name": "[A021]備用異常21", "description": "0=無故障 1=有故障"},
            "A022": {"bit": 5, "name": "[A022]備用異常22", "description": "0=無故障 1=有故障"},
            "A023": {"bit": 6, "name": "[A023]備用異常23", "description": "0=無故障 1=有故障"},
            "A024": {"bit": 7, "name": "[A024]備用異常24", "description": "0=無故障 1=有故障"},
            "A025": {"bit": 8, "name": "[A025]內部進水F2流量計量測過低", "description": "0=無故障 1=有故障"},
            "A026": {"bit": 9, "name": "[A026]備用異常26", "description": "0=無故障 1=有故障"},
            "A027": {"bit": 10, "name": "[A027]CDU環境溫度過低", "description": "0=無故障 1=有故障"},
            "A028": {"bit": 11, "name": "[A028]CDU環境溫度過高", "description": "0=無故障 1=有故障"},
            "A029": {"bit": 12, "name": "[A029]備用異常29", "description": "0=無故障 1=有故障"},
            "A030": {"bit": 13, "name": "[A030]備用異常30", "description": "0=無故障 1=有故障"},
            "A031": {"bit": 14, "name": "[A031]備用異常31", "description": "0=無故障 1=有故障"},
            "A032": {"bit": 15, "name": "[A032]內部回水水位不足請確認補液裝置存量足夠", "description": "0=無故障 1=有故障"},
            
            # R10003 異常信息3 (A033-A048)
            "A033": {"bit": 0, "name": "[A033]水泵[1]運轉壓力未上升", "description": "0=無故障 1=有故障"},
            "A034": {"bit": 1, "name": "[A034]備用異常34", "description": "0=無故障 1=有故障"},
            "A035": {"bit": 2, "name": "[A035]CDU檢測出管路外有水", "description": "0=無故障 1=有故障"},
            "A036": {"bit": 3, "name": "[A036]二次側T12溫度檢查異常", "description": "0=無故障 1=有故障"},
            "A037": {"bit": 4, "name": "[A037]備用異常37", "description": "0=無故障 1=有故障"},
            "A038": {"bit": 5, "name": "[A038]備用異常38", "description": "0=無故障 1=有故障"},
            "A039": {"bit": 6, "name": "[A039]備用異常39", "description": "0=無故障 1=有故障"},
            "A040": {"bit": 7, "name": "[A040]備用異常40", "description": "0=無故障 1=有故障"},
            "A041": {"bit": 8, "name": "[A041]備用異常41", "description": "0=無故障 1=有故障"},
            "A042": {"bit": 9, "name": "[A042]備用異常42", "description": "0=無故障 1=有故障"},
            "A043": {"bit": 10, "name": "[A043]備用異常43", "description": "0=無故障 1=有故障"},
            "A044": {"bit": 11, "name": "[A044]水泵雙組異常關閉系統", "description": "0=無故障 1=有故障"},
            "A045": {"bit": 12, "name": "[A045]ModbusRTU連續通訊異常次數過多(溫溼度計)", "description": "0=無故障 1=有故障"},
            "A046": {"bit": 13, "name": "[A046]備用異常46", "description": "0=無故障 1=有故障"},
            "A047": {"bit": 14, "name": "[A047]備用異常47", "description": "0=無故障 1=有故障"},
            "A048": {"bit": 15, "name": "[A048]備用異常48", "description": "0=無故障 1=有故障"},
            
            # R10004 異常信息4 (A049-A064)
            "A049": {"bit": 0, "name": "[A049]備用異常49", "description": "0=無故障 1=有故障"},
            "A050": {"bit": 1, "name": "[A050]備用異常50", "description": "0=無故障 1=有故障"},
            "A051": {"bit": 2, "name": "[A051]備用異常51", "description": "0=無故障 1=有故障"},
            "A052": {"bit": 3, "name": "[A052]FX5-8AD模組[1]異常", "description": "0=無故障 1=有故障"},
            "A053": {"bit": 4, "name": "[A053]備用異常53", "description": "0=無故障 1=有故障"},
            "A054": {"bit": 5, "name": "[A054]備用異常54", "description": "0=無故障 1=有故障"},
            "A055": {"bit": 6, "name": "[A055]PLC控制器異常碼產生", "description": "0=無故障 1=有故障"},
            "A056": {"bit": 7, "name": "[A056]備用異常56", "description": "0=無故障 1=有故障"},
            "A057": {"bit": 8, "name": "[A057]加熱器水槽溫度過高", "description": "0=無故障 1=有故障"},
            "A058": {"bit": 9, "name": "[A058]備用異常58", "description": "0=無故障 1=有故障"},
            "A059": {"bit": 10, "name": "[A059]備用異常59", "description": "0=無故障 1=有故障"},
            "A060": {"bit": 11, "name": "[A060]T11a感溫棒線路異常", "description": "0=無故障 1=有故障"},
            "A061": {"bit": 12, "name": "[A061]備用異常61", "description": "0=無故障 1=有故障"},
            "A062": {"bit": 13, "name": "[A062]備用異常62", "description": "0=無故障 1=有故障"},
            "A063": {"bit": 14, "name": "[A063]備用異常63", "description": "0=無故障 1=有故障"},
            "A064": {"bit": 15, "name": "[A064]備用異常64", "description": "0=無故障 1=有故障"},
            
            # R10005 異常信息5 (A065-A080)
            "A065": {"bit": 0, "name": "[A065]T13b感溫棒線路異常", "description": "0=無故障 1=有故障"},
            "A066": {"bit": 1, "name": "[A066]P1a壓力計線路異常", "description": "0=無故障 1=有故障"},
            "A067": {"bit": 2, "name": "[A067]備用異常67", "description": "0=無故障 1=有故障"},
            "A068": {"bit": 3, "name": "[A068]備用異常68", "description": "0=無故障 1=有故障"},
            "A069": {"bit": 4, "name": "[A069]比例閥線路異常", "description": "0=無故障 1=有故障"},
            "A070": {"bit": 5, "name": "[A070]備用異常70", "description": "0=無故障 1=有故障"},
            "A071": {"bit": 6, "name": "[A071]備用異常71", "description": "0=無故障 1=有故障"},
            "A072": {"bit": 7, "name": "[A072]備用異常72", "description": "0=無故障 1=有故障"},
            "A073": {"bit": 8, "name": "[A073]備用異常73", "description": "0=無故障 1=有故障"},
            "A074": {"bit": 9, "name": "[A074]備用異常74", "description": "0=無故障 1=有故障"},
            "A075": {"bit": 10, "name": "[A075]備用異常75", "description": "0=無故障 1=有故障"},
            "A076": {"bit": 11, "name": "[A076]備用異常76", "description": "0=無故障 1=有故障"},
            "A077": {"bit": 12, "name": "[A077]備用異常77", "description": "0=無故障 1=有故障"},
            "A078": {"bit": 13, "name": "[A078]備用異常78", "description": "0=無故障 1=有故障"},
            "A079": {"bit": 14, "name": "[A079]備用異常79", "description": "0=無故障 1=有故障"},
            "A080": {"bit": 15, "name": "[A080]備用異常80", "description": "0=無故障 1=有故障"},
        }

    def _read_alarm_register(self, register_addr: int):
        """從PLC讀取警報暫存器數據"""
        try:
            # 找到合適的PLC區塊來讀取暫存器
            plc_block = None
            for block_id, block in self.engine.blocks.items():
                if hasattr(block, 'ip_address') and 'PLC' in type(block).__name__:
                    plc_block = block
                    break
            
            if not plc_block or not hasattr(plc_block, 'read_register'):
                logger.warning(f"No suitable PLC block found for reading register R{register_addr}")
                return None

            # 從PLC讀取暫存器值
            register_value = plc_block.read_register(register_addr)
            
            if register_value is None:
                logger.warning(f"Failed to read register R{register_addr} from PLC")
                register_value = 0  # 預設無異常
            
            # 解析位位狀態
            register_binary = format(register_value, '016b')
            register_hex = f"0x{register_value:04X}"
            
            status_bits = {}
            active_count = 0
            
            alarm_definitions = self._get_alarm_definitions()
            
            for bit_pos in range(16):
                bit_value = (register_value >> bit_pos) & 1
                alarm_code = f"A{(register_addr - 10001) * 16 + bit_pos + 1:03d}"
                
                if alarm_code in alarm_definitions:
                    alarm_def = alarm_definitions[alarm_code]
                    status_bits[f"bit{bit_pos}"] = {
                        "alarm_code": alarm_code,
                        "name": alarm_def["name"],
                        "description": alarm_def["description"],
                        "value": bit_value,
                        "status": "有故障" if bit_value else "無故障",
                        "active": bit_value == 1,
                        "register": register_addr,
                        "bit_position": bit_pos
                    }
                    if bit_value == 1:
                        active_count += 1

            return {
                "register_address": register_addr,
                "register_value": register_value,
                "register_hex": register_hex,
                "register_binary": register_binary,
                "status_bits": status_bits,
                "active_count": active_count
            }
            
        except Exception as e:
            logger.error(f"Error reading alarm register R{register_addr}: {e}")
            return None

    def _calculate_alarm_summary(self, active_alarms):
        """計算異常摘要統計"""
        total_alarms = len(active_alarms)
        critical_alarms_count = 0
        
        # 分類統計
        category_counts = {
            "pump_alarms": 0,
            "temp_alarms": 0,
            "pressure_alarms": 0,
            "comm_alarms": 0,
            "sensor_alarms": 0,
            "system_alarms": 0,
            "other_alarms": 0
        }
        
        # 關鍵異常識別
        critical_keywords = ["水泵", "系統", "PLC", "雙組異常", "水位不足"]
        
        for alarm in active_alarms:
            alarm_name = alarm.get("name", "")
            
            # 檢查是否為關鍵異常
            is_critical = any(keyword in alarm_name for keyword in critical_keywords)
            if is_critical:
                critical_alarms_count += 1
            
            # 分類統計
            if "水泵" in alarm_name:
                category_counts["pump_alarms"] += 1
            elif "溫度" in alarm_name or "T1" in alarm_name:
                category_counts["temp_alarms"] += 1
            elif "壓力" in alarm_name or "P1" in alarm_name:
                category_counts["pressure_alarms"] += 1
            elif "通訊" in alarm_name or "ModbusRTU" in alarm_name:
                category_counts["comm_alarms"] += 1
            elif "感溫棒" in alarm_name or "壓力計" in alarm_name:
                category_counts["sensor_alarms"] += 1
            elif "PLC" in alarm_name or "系統" in alarm_name or "模組" in alarm_name:
                category_counts["system_alarms"] += 1
            else:
                category_counts["other_alarms"] += 1
        
        # 判斷嚴重程度
        if total_alarms == 0:
            overall_status = "正常"
            severity = "Normal"
        elif critical_alarms_count > 0:
            overall_status = "嚴重異常"
            severity = "Critical"
        elif total_alarms >= 5:
            overall_status = "多項異常"
            severity = "Major"
        else:
            overall_status = "輕微異常"
            severity = "Minor"
        
        return {
            "total_alarms": total_alarms,
            "critical_alarms_count": critical_alarms_count,
            "overall_status": overall_status,
            "severity": severity,
            "category_counts": category_counts,
            "has_pump_issues": category_counts["pump_alarms"] > 0,
            "has_temp_issues": category_counts["temp_alarms"] > 0,
            "has_system_issues": category_counts["system_alarms"] > 0
        }

    def _start_background_services(self):
        """啟動背景服務"""
        try:
            # 設置運行標誌
            self.running = True

            # 初始化警報管理器
            try:
                self.alarm_manager = SNMPAlarmManager("snmp_alarm_config.json")
                logger.info("Alarm manager initialized successfully")
                
                # 註冊警報回調
                def alarm_callback(alarm: AlarmInstance):
                    logging_system = get_logging_system()
                    logging_system.log_snmp_trap(
                        alarm.alarm_id,
                        alarm.level.value,
                        alarm.message,
                        {
                            "value": alarm.value,
                            "unit": alarm.unit,
                            "device_id": alarm.device_id
                        }
                    )
                
                self.alarm_manager.register_callback(alarm_callback)
                
            except Exception as e:
                logger.warning(f"Failed to initialize alarm manager: {e}")
                self.alarm_manager = None

            # 啟動塊更新線程
            self.update_thread = threading.Thread(target=self._update_blocks, daemon=True)
            self.update_thread.start()
            logger.info("Block update thread started")

        except Exception as e:
            logger.error(f"Error starting background services: {e}")

def create_app(config_path: str = 'distributed_cdu_config.yaml') -> FastAPI:
    """創建簡化版分散式CDU應用"""
    api = SimplifiedDistributedCDUAPI(config_path)
    return api.app

def main():
    """主程式入口"""
    import sys
    
    config_path = sys.argv[1] if len(sys.argv) > 1 else 'distributed_cdu_config.yaml'
    
    try:
        app = create_app(config_path)
        
        # 啟動服務器 (使用 port 8001 以匹配前端配置)
        uvicorn.run(
            app,
            host="0.0.0.0", 
            port=8001,
            log_level="info"
        )
            
    except Exception as e:
        logger.error(f"Failed to start API server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
