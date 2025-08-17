from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import threading
import logging
import ssl
import uvicorn
from typing import Dict, List, Optional, Any
from datetime import datetime

# 導入分散式CDU系統組件
from distributed_engine import DistributedCDUEngine
from cluster_communication import ClusterCommunication
from ai_optimizer import AIOptimizer
from security_manager import SecurityManager
from api.redfish_api import redfish_router, init_redfish_api

# 設定日誌
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 安全中介軟體
security = HTTPBearer()

class DistributedCDUAPI:
    """分散式CDU系統API"""
    
    def __init__(self, config_path: str):
        # 初始化分散式引擎
        logger.info("Initializing Distributed CDU System...")
        self.engine = DistributedCDUEngine(config_path)
        
        # 初始化安全管理器
        self.security_manager = SecurityManager(self.engine.config)
        
        # 初始化集群通訊
        self.communication = ClusterCommunication(self.engine.config, self.engine.node_id)
        
        # 初始化AI優化器
        self.ai_optimizer = AIOptimizer(self.engine.config['AI_Optimization'])
        
        # 創建FastAPI應用
        self.app = FastAPI(
            title="Distributed CDU Control System API",
            version="2.0",
            description="分散式自主CDU系統控制API"
        )
        
        # 配置CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # 註冊路由
        self._register_routes()
        
        # 啟動後台服務
        self._start_background_services()
        
    def _start_background_services(self):
        """啟動後台服務"""
        # 啟動分散式引擎
        self.engine.start()
        
        # 啟動集群通訊
        self.communication.start()
        
        # 註冊通訊處理器
        self._register_communication_handlers()
        
        logger.info("Background services started")
        
    def _register_communication_handlers(self):
        """註冊通訊處理器"""
        self.communication.register_handler('heartbeat', self._handle_heartbeat)
        self.communication.register_handler('vote_request', self._handle_vote_request)
        self.communication.register_handler('load_command', self._handle_load_command)
        self.communication.register_handler('mqtt_command', self._handle_mqtt_command)
        
    def _handle_heartbeat(self, source_node: str, term: int, timestamp: int):
        """處理心跳訊息"""
        self.engine.raft.receive_heartbeat(source_node, term)
        
    def _handle_vote_request(self, candidate_id: str, term: int):
        """處理投票請求"""
        vote_granted = self.engine.raft.receive_vote_request(
            candidate_id, term, self.engine.priority
        )
        # 在實際實現中應回送投票結果
        
    def _handle_load_command(self, source_node: str, load_kw: float):
        """處理負載調度指令"""
        if self.engine.raft.state.value != 'leader':
            # 接收Master的負載調度指令
            logger.info(f"Received load command from {source_node}: {load_kw}kW")
            # 調整本地負載
            
    def _handle_mqtt_command(self, topic: str, payload: Dict[str, Any]):
        """處理MQTT指令"""
        command_type = payload.get('command')
        if command_type == 'emergency_stop':
            self.engine.emergency_shutdown()
        elif command_type == 'set_load':
            target_load = payload.get('load_kw', 0)
            # 調整負載
            
    def _register_routes(self):
        """註冊API路由"""
        
        # === 認證相關 ===
        @self.app.post("/auth/login")
        async def login(credentials: LoginRequest, request: Request):
            """使用者登入"""
            client_ip = request.client.host
            auth_result, session_token = self.security_manager.authenticate_request({
                'username': credentials.username,
                'password': credentials.password,
                'ip_address': client_ip
            })
            
            if auth_result:
                return {'token': session_token, 'message': 'Login successful'}
            else:
                raise HTTPException(status_code=401, detail=session_token or 'Authentication failed')
                
        @self.app.post("/auth/logout")
        async def logout(token: HTTPAuthorizationCredentials = Depends(security)):
            """使用者登出"""
            self.security_manager.rbac_manager.logout(token.credentials)
            return {'message': 'Logout successful'}
            
        # === 集群狀態相關 ===
        @self.app.get("/cluster/status")
        async def get_cluster_status(token: HTTPAuthorizationCredentials = Depends(security)):
            """獲取集群狀態"""
            if not self._check_permission(token.credentials, 'read', 'cluster'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            return {
                'cluster_id': self.engine.config['CDU_System']['cluster_id'],
                'node_id': self.engine.node_id,
                'role': 'master' if self.engine.raft.state.value == 'leader' else 'slave',
                'raft_state': self.engine.raft.state.value,
                'term': self.engine.raft.current_term,
                'leader_id': self.engine.raft.leader_id,
                'nodes': self.engine.nodes,
                'total_load_kw': sum(node.get('current_load_kw', 0) for node in self.engine.nodes.values()),
                'total_capacity_kw': sum(node.get('max_capacity_kw', 0) for node in self.engine.nodes.values())
            }
            
        @self.app.get("/cluster/nodes")
        async def get_cluster_nodes(token: HTTPAuthorizationCredentials = Depends(security)):
            """獲取集群節點資訊"""
            if not self._check_permission(token.credentials, 'read', 'cluster'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            return {'nodes': self.engine.nodes}
            
        @self.app.get("/cluster/consensus")
        async def get_consensus_status(token: HTTPAuthorizationCredentials = Depends(security)):
            """獲取共識狀態"""
            if not self._check_permission(token.credentials, 'read', 'cluster'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            return {
                'current_term': self.engine.raft.current_term,
                'state': self.engine.raft.state.value,
                'leader_id': self.engine.raft.leader_id,
                'voted_for': self.engine.raft.voted_for,
                'last_heartbeat': self.engine.raft.last_heartbeat.isoformat(),
                'election_timeout': self.engine.raft.election_timeout
            }
            
        # === 負載調度相關 ===
        @self.app.get("/load/distribution")
        async def get_load_distribution(token: HTTPAuthorizationCredentials = Depends(security)):
            """獲取負載分配狀態"""
            if not self._check_permission(token.credentials, 'read', 'load'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            total_load = sum(node.get('current_load_kw', 0) for node in self.engine.nodes.values())
            optimal_allocation = self.engine.load_balancer.calculate_optimal_distribution(
                self.engine.nodes, total_load
            )
            
            return {
                'current_distribution': {nid: node.get('current_load_kw', 0) 
                                      for nid, node in self.engine.nodes.items()},
                'optimal_distribution': optimal_allocation,
                'total_load_kw': total_load,
                'rebalance_needed': self.engine.load_balancer.should_rebalance(
                    {nid: node.get('current_load_kw', 0) for nid, node in self.engine.nodes.items()},
                    optimal_allocation
                )
            }
            
        @self.app.post("/load/rebalance")
        async def trigger_rebalance(token: HTTPAuthorizationCredentials = Depends(security)):
            """觸發負載重平衡"""
            if not self._check_permission(token.credentials, 'control', 'load'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            if self.engine.raft.state.value != 'leader':
                raise HTTPException(status_code=403, detail="Only master node can trigger rebalance")
                
            # 執行負載重平衡邏輯
            return {'message': 'Load rebalance triggered', 'timestamp': datetime.now().isoformat()}
            
        # === AI優化相關 ===
        @self.app.get("/ai/predictions")
        async def get_ai_predictions(token: HTTPAuthorizationCredentials = Depends(security)):
            """獲取AI預測結果"""
            if not self._check_permission(token.credentials, 'read', 'ai'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            predictions = {}
            for node_id in self.engine.nodes.keys():
                load_pred = self.ai_optimizer.predict_load(node_id)
                fault_risk = self.ai_optimizer.predict_failures(node_id)
                
                predictions[node_id] = {
                    'load_prediction': load_pred,
                    'fault_risk': fault_risk
                }
                
            return predictions
            
        @self.app.get("/ai/recommendations")
        async def get_ai_recommendations(token: HTTPAuthorizationCredentials = Depends(security)):
            """獲取AI優化建議"""
            if not self._check_permission(token.credentials, 'read', 'ai'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            recommendations = self.ai_optimizer.get_optimization_recommendations(self.engine.nodes)
            return recommendations
            
        # === 設備控制相關 (保持原有API相容性) ===
        @self.app.get("/redfish/v1/Chassis/CDU_Main/Thermal/Pumps/{pump_id}")
        async def get_pump_info(pump_id: str, token: HTTPAuthorizationCredentials = Depends(security)):
            """獲取泵浦資訊 (相容原有API)"""
            if not self._check_permission(token.credentials, 'read', 'device'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            if pump_id not in self.engine.blocks:
                raise HTTPException(status_code=404, detail=f"Pump '{pump_id}' not found")
                
            return {
                'Id': pump_id,
                'Name': f"VFD Pump {pump_id}",
                'Status': {
                    'State': self.engine.get_block_property(pump_id, 'output_status'),
                    'Health': self.engine.get_block_property(pump_id, 'output_health')
                },
                'Reading': self.engine.get_block_property(pump_id, 'output_current_rpm'),
                'ReadingUnits': "RPM"
            }
            
        @self.app.post("/redfish/v1/Chassis/CDU_Main/Thermal/Pumps/{pump_id}/Actions/Pump.SetSpeed")
        async def set_pump_speed(pump_id: str, action: SetSpeedAction, 
                               token: HTTPAuthorizationCredentials = Depends(security)):
            """設定泵浦轉速 (相容原有API)"""
            if not self._check_permission(token.credentials, 'control', 'device'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            if pump_id not in self.engine.blocks:
                raise HTTPException(status_code=404, detail=f"Pump '{pump_id}' not found")
                
            success = self.engine.set_block_property(pump_id, 'input_target_rpm', action.SpeedRPM)
            if success:
                return {'message': f"Target speed for {pump_id} set to {action.SpeedRPM} RPM"}
            else:
                raise HTTPException(status_code=500, detail="Failed to set pump speed")

        # === 感測器數據讀取 ===
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
                    
                    # 記錄區塊的所有屬性用於調試
                    block_attrs = [attr for attr in dir(block) if not attr.startswith('_')]
                    logger.info(f"Block {block_id} attributes: {block_attrs}")
                    
                    # 根據不同的感測器類型獲取對應的數據
                    if hasattr(block, 'output_temperature'):
                        temp_value = block.output_temperature
                        reading['value'] = temp_value
                        reading['unit'] = "°C"
                        reading['status'] = getattr(block, 'output_status', 'Unknown')
                        reading['health'] = getattr(block, 'output_health', 'Unknown')
                        logger.info(f"Block {block_id}: Temperature = {temp_value}°C, Status = {reading['status']}, Health = {reading['health']}")
                    elif hasattr(block, 'output_pressure'):
                        press_value = block.output_pressure
                        reading['value'] = press_value
                        reading['unit'] = "Bar"
                        reading['status'] = getattr(block, 'output_status', 'Unknown')
                        reading['health'] = getattr(block, 'output_health', 'Unknown')
                        logger.info(f"Block {block_id}: Pressure = {press_value} Bar, Status = {reading['status']}, Health = {reading['health']}")
                    elif hasattr(block, 'output_level'):
                        reading['value'] = 1.0 if getattr(block, 'output_level', 'Normal') == 'Normal' else 0.0
                        reading['unit'] = "Level"
                        reading['status'] = getattr(block, 'output_status', 'Unknown')
                        reading['health'] = getattr(block, 'output_health', 'Unknown')
                        logger.info(f"Block {block_id}: Level = {reading['value']}, Status = {reading['status']}")
                    elif hasattr(block, 'output_current_rpm'):
                        reading['value'] = getattr(block, 'output_current_rpm', 0.0)
                        reading['unit'] = "RPM"
                        reading['status'] = getattr(block, 'output_status', 'Unknown')
                        reading['health'] = getattr(block, 'output_health', 'Unknown')
                        logger.info(f"Block {block_id}: RPM = {reading['value']}, Status = {reading['status']}")
                    elif hasattr(block, 'output_rpm'):
                        reading['value'] = getattr(block, 'output_rpm', 0.0)
                        reading['unit'] = "RPM"
                        reading['status'] = getattr(block, 'output_status', 'Unknown')
                        reading['health'] = getattr(block, 'output_health', 'Unknown')
                        logger.info(f"Block {block_id}: RPM = {reading['value']}, Status = {reading['status']}")
                    elif hasattr(block, 'register_values') and hasattr(block, 'connected'):
                        # 處理PLC區塊
                        if getattr(block, 'connected', False):
                            # 檢查是否有特定的start_register或register配置
                            start_register = getattr(block, 'start_register', None)
                            single_register = getattr(block, 'register', None)
                            register_values = getattr(block, 'register_values', {})
                            
                            if register_values:
                                # 優先使用single_register (register: 20)
                                if single_register is not None and single_register in register_values:
                                    register_value = register_values[single_register]
                                    reading['value'] = float(register_value)
                                    logger.info(f"Block {block_id}: PLC Single Register R{10000 + single_register} = {reading['value']}")
                                # 其次使用start_register 
                                elif start_register is not None and start_register in register_values:
                                    register_value = register_values[start_register]
                                    reading['value'] = float(register_value)
                                    logger.info(f"Block {block_id}: PLC Start Register R{10000 + start_register} = {reading['value']}")
                                else:
                                    # 否則使用第一個register的值
                                    first_value = list(register_values.values())[0] if register_values else 0
                                    reading['value'] = float(first_value)
                                    logger.info(f"Block {block_id}: PLC First Register Value = {reading['value']}")
                                
                                # 根據區塊ID判斷數據類型和單位
                                if 'Temp' in block_id or 'temp' in block_id.lower():
                                    # 溫度數據，假設需要轉換 (例如: raw值/10 = 實際溫度)
                                    reading['value'] = reading['value'] / 10.0 if reading['value'] > 100 else reading['value']
                                    reading['unit'] = "°C"
                                elif 'Press' in block_id or 'press' in block_id.lower():
                                    # 壓力數據，假設需要轉換 (例如: raw值/100 = 實際壓力)
                                    reading['value'] = reading['value'] / 100.0 if reading['value'] > 100 else reading['value']
                                    reading['unit'] = "Bar"
                                elif 'Flow' in block_id or 'flow' in block_id.lower():
                                    reading['unit'] = "L/min"
                                else:
                                    reading['unit'] = "Value"
                                
                                reading['status'] = 'Enabled'
                                reading['health'] = 'OK'
                                logger.info(f"Block {block_id}: PLC Value = {reading['value']} {reading['unit']}, Status = Connected")
                            else:
                                reading['value'] = 0.0
                                reading['unit'] = "Value"
                                reading['status'] = 'Connected'
                                reading['health'] = 'Warning'
                                logger.info(f"Block {block_id}: PLC Connected but no register values")
                        else:
                            reading['value'] = 0.0
                            reading['unit'] = "Value" 
                            reading['status'] = 'Disconnected'
                            reading['health'] = 'Critical'
                            logger.info(f"Block {block_id}: PLC Disconnected")
                    else:
                        logger.warning(f"Block {block_id}: No recognized output attributes found")
                    
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

        # === 配置管理 ===
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
                            # 預設為流量
                            block_config['sensor_category'] = 'flow'
                            block_config['unit'] = 'L/min'
                            block_config['min_actual'] = 0.0
                            block_config['max_actual'] = 200.0
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
                
        # === 安全相關 ===
        @self.app.get("/security/status")
        async def get_security_status(token: HTTPAuthorizationCredentials = Depends(security)):
            """獲取安全狀態"""
            if not self._check_permission(token.credentials, 'read', 'security'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            return self.security_manager.get_security_status()
            
        @self.app.get("/security/audit")
        async def get_audit_logs(token: HTTPAuthorizationCredentials = Depends(security)):
            """獲取審計日誌"""
            if not self._check_permission(token.credentials, 'read', 'security'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            logs = self.security_manager.rbac_manager.get_audit_logs()
            return {'logs': [log.__dict__ for log in logs[-100:]]}  # 最近100條
            
        # === 系統管理相關 ===
        @self.app.post("/system/emergency_stop")
        async def emergency_stop(token: HTTPAuthorizationCredentials = Depends(security)):
            """緊急停機"""
            if not self._check_permission(token.credentials, 'control', 'system'):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            self.engine.emergency_shutdown()
            self.security_manager.report_security_event(
                'emergency_stop', 'Emergency shutdown triggered via API', 'high'
            )
            return {'message': 'Emergency stop executed', 'timestamp': datetime.now().isoformat()}
            
        @self.app.get("/api/v1/test")
        async def api_test():
            """API連接測試端點"""
            return {
                "status": "ok",
                "message": "Distributed CDU API is running",
                "timestamp": datetime.now().isoformat(),
                "blocks_count": len(self.engine.blocks)
            }
        
        @self.app.get("/")
        async def root():
            """根路徑"""
            return {
                'message': 'Distributed CDU Control System API v2.0',
                'node_id': self.engine.node_id,
                'status': 'online',
                'documentation': '/docs',
                'redfish_api': '/redfish/v1'
            }

        # === 註冊Redfish API ===
        self.app.include_router(redfish_router)

        # 初始化Redfish API
        init_redfish_api(self.engine)
            
    def _check_permission(self, session_token: str, action: str, resource: str) -> bool:
        """檢查權限"""
        return self.security_manager.authorize_action(session_token, action, resource)

# === Pydantic 模型 ===
class LoginRequest(BaseModel):
    username: str
    password: str

class SetSpeedAction(BaseModel):
    SpeedRPM: float

class LoadAllocationRequest(BaseModel):
    node_allocations: Dict[str, float]

# === 主程式 ===
def create_app(config_path: str = 'distributed_cdu_config.yaml') -> FastAPI:
    """創建分散式CDU應用"""
    api = DistributedCDUAPI(config_path)
    return api.app

def main():
    """主程式入口"""
    import sys
    
    config_path = sys.argv[1] if len(sys.argv) > 1 else 'distributed_cdu_config.yaml'
    
    try:
        app = create_app(config_path)
        
        # 獲取配置
        import yaml
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
            
        api_config = config['Communication']['api']
        
        if api_config['use_https']:
            # 使用HTTPS
            ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            ssl_context.load_cert_chain(api_config['cert_file'], api_config['key_file'])
            
            uvicorn.run(
                app,
                host="0.0.0.0",
                port=api_config['port'],
                ssl_context=ssl_context,
                log_level="info"
            )
        else:
            # 使用HTTP (僅開發環境)
            uvicorn.run(
                app,
                host="0.0.0.0", 
                port=api_config['port'],
                log_level="info"
            )
            
    except Exception as e:
        logger.error(f"Failed to start API server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()