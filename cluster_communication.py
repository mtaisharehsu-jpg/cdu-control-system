import asyncio
import json
import socket
import ssl
import struct
import logging
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime
import paho.mqtt.client as mqtt
import can
from dataclasses import dataclass
import threading
import time

logger = logging.getLogger(__name__)

@dataclass
class Message:
    """通訊訊息格式"""
    message_type: str
    source_node: str
    target_node: str
    timestamp: datetime
    payload: Dict[str, Any]
    sequence_id: int = 0
    
    def to_bytes(self) -> bytes:
        """序列化為位元組"""
        data = {
            'type': self.message_type,
            'source': self.source_node,
            'target': self.target_node,
            'timestamp': self.timestamp.isoformat(),
            'payload': self.payload,
            'seq_id': self.sequence_id
        }
        return json.dumps(data).encode('utf-8')
    
    @classmethod
    def from_bytes(cls, data: bytes) -> 'Message':
        """從位元組反序列化"""
        json_data = json.loads(data.decode('utf-8'))
        return cls(
            message_type=json_data['type'],
            source_node=json_data['source'],
            target_node=json_data['target'],
            timestamp=datetime.fromisoformat(json_data['timestamp']),
            payload=json_data['payload'],
            sequence_id=json_data.get('seq_id', 0)
        )

class CANBusHandler:
    """CAN Bus 2.0B 處理器 - 實時控制指令"""
    
    def __init__(self, interface: str = 'can0', bitrate: int = 500000):
        self.interface = interface
        self.bitrate = bitrate
        self.bus = None
        self.running = False
        self.message_handlers: Dict[str, Callable] = {}
        
    def start(self):
        """啟動CAN Bus通訊"""
        try:
            # 配置CAN interface
            import os
            os.system(f'sudo ip link set {self.interface} type can bitrate {self.bitrate}')
            os.system(f'sudo ip link set up {self.interface}')
            
            self.bus = can.interface.Bus(channel=self.interface, bustype='socketcan')
            self.running = True
            
            # 啟動接收執行緒
            threading.Thread(target=self._receive_loop, daemon=True).start()
            logger.info(f"CAN Bus started on {self.interface} at {self.bitrate} bps")
            
        except Exception as e:
            logger.error(f"Failed to start CAN Bus: {e}")
            
    def stop(self):
        """停止CAN Bus通訊"""
        self.running = False
        if self.bus:
            self.bus.shutdown()
            
    def send_heartbeat(self, node_id: str, term: int):
        """發送心跳訊息"""
        if not self.bus:
            return
            
        # CAN ID: 0x100 + node_number (CDU_01 -> 1)
        node_num = int(node_id.split('_')[1])
        can_id = 0x100 + node_num
        
        # 心跳資料: [type(1), term(4), timestamp(4)]
        timestamp = int(time.time())
        data = struct.pack('<BII', 0x01, term, timestamp)
        
        message = can.Message(arbitration_id=can_id, data=data, is_extended_id=False)
        try:
            self.bus.send(message)
            logger.debug(f"Sent heartbeat from {node_id}")
        except Exception as e:
            logger.error(f"Failed to send CAN heartbeat: {e}")
            
    def send_vote_request(self, candidate_id: str, term: int):
        """發送投票請求"""
        if not self.bus:
            return
            
        node_num = int(candidate_id.split('_')[1])
        can_id = 0x200 + node_num  # 投票請求ID範圍
        
        data = struct.pack('<BII', 0x02, term, int(time.time()))
        message = can.Message(arbitration_id=can_id, data=data, is_extended_id=False)
        
        try:
            self.bus.send(message)
            logger.debug(f"Sent vote request from {candidate_id}")
        except Exception as e:
            logger.error(f"Failed to send vote request: {e}")
            
    def send_load_command(self, target_node: str, load_kw: float):
        """發送負載調度指令"""
        if not self.bus:
            return
            
        node_num = int(target_node.split('_')[1])
        can_id = 0x300 + node_num  # 負載指令ID範圍
        
        # 負載資料: [type(1), load_kw(4), reserved(3)]
        load_int = int(load_kw * 100)  # 精度到0.01kW
        data = struct.pack('<BIxxx', 0x03, load_int)
        
        message = can.Message(arbitration_id=can_id, data=data, is_extended_id=False)
        try:
            self.bus.send(message)
            logger.info(f"Sent load command to {target_node}: {load_kw}kW")
        except Exception as e:
            logger.error(f"Failed to send load command: {e}")
            
    def register_handler(self, message_type: str, handler: Callable):
        """註冊訊息處理器"""
        self.message_handlers[message_type] = handler
        
    def _receive_loop(self):
        """接收訊息迴圈"""
        while self.running:
            try:
                message = self.bus.recv(timeout=0.1)
                if message:
                    self._handle_can_message(message)
            except Exception as e:
                logger.error(f"CAN receive error: {e}")
                
    def _handle_can_message(self, message: can.Message):
        """處理CAN訊息"""
        try:
            # 解析CAN ID獲取訊息類型和來源節點
            if 0x100 <= message.arbitration_id <= 0x106:  # 心跳
                msg_type = 'heartbeat'
                node_num = message.arbitration_id - 0x100
            elif 0x200 <= message.arbitration_id <= 0x206:  # 投票請求
                msg_type = 'vote_request'
                node_num = message.arbitration_id - 0x200
            elif 0x300 <= message.arbitration_id <= 0x306:  # 負載指令
                msg_type = 'load_command'
                node_num = message.arbitration_id - 0x300
            else:
                return
                
            source_node = f"CDU_{node_num:02d}"
            
            # 解析資料
            if len(message.data) >= 1:
                data_type = message.data[0]
                
                if data_type == 0x01 and msg_type == 'heartbeat':  # 心跳
                    if len(message.data) >= 9:
                        _, term, timestamp = struct.unpack('<BII', message.data)
                        handler = self.message_handlers.get('heartbeat')
                        if handler:
                            handler(source_node, term, timestamp)
                            
                elif data_type == 0x02 and msg_type == 'vote_request':  # 投票請求
                    if len(message.data) >= 9:
                        _, term, timestamp = struct.unpack('<BII', message.data)
                        handler = self.message_handlers.get('vote_request')
                        if handler:
                            handler(source_node, term)
                            
                elif data_type == 0x03 and msg_type == 'load_command':  # 負載指令
                    if len(message.data) >= 5:
                        _, load_int = struct.unpack('<BI', message.data[:5])
                        load_kw = load_int / 100.0
                        handler = self.message_handlers.get('load_command')
                        if handler:
                            handler(source_node, load_kw)
                            
        except Exception as e:
            logger.error(f"Error handling CAN message: {e}")

class ModbusTCPHandler:
    """Modbus TCP 處理器 - 設備狀態查詢"""
    
    def __init__(self, port: int = 502):
        self.port = port
        self.server = None
        self.running = False
        self.register_map = {}  # 暫存器映射
        
    def start(self):
        """啟動Modbus TCP服務器"""
        try:
            from pymodbus.server.sync import StartTcpServer
            from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
            
            # 創建資料區塊
            store = ModbusSlaveContext(
                di=ModbusSequentialDataBlock(0, [0]*1000),
                co=ModbusSequentialDataBlock(0, [0]*1000),
                hr=ModbusSequentialDataBlock(0, [0]*1000),
                ir=ModbusSequentialDataBlock(0, [0]*1000)
            )
            context = ModbusServerContext(slaves=store, single=True)
            
            # 啟動服務器
            threading.Thread(
                target=StartTcpServer, 
                args=(context,), 
                kwargs={'address': ('0.0.0.0', self.port)},
                daemon=True
            ).start()
            
            self.running = True
            logger.info(f"Modbus TCP server started on port {self.port}")
            
        except Exception as e:
            logger.error(f"Failed to start Modbus TCP server: {e}")
            
    def update_register(self, address: int, value: int):
        """更新暫存器值"""
        self.register_map[address] = value
        
    def query_remote_status(self, ip: str, node_id: str) -> Dict[str, Any]:
        """查詢遠端節點狀態"""
        try:
            from pymodbus.client.sync import ModbusTcpClient
            
            client = ModbusTcpClient(ip, port=self.port)
            client.connect()
            
            # 讀取標準狀態暫存器
            result = client.read_holding_registers(1000, 10, unit=1)
            if not result.isError():
                registers = result.registers
                status = {
                    'node_id': node_id,
                    'current_load_kw': registers[0] / 100.0,
                    'max_capacity_kw': registers[1] / 100.0,
                    'health_score': registers[2] / 100.0,
                    'temperature': registers[3] / 10.0,
                    'pressure': registers[4] / 100.0,
                    'pump1_rpm': registers[5],
                    'pump2_rpm': registers[6],
                    'status_flags': registers[7],
                    'error_code': registers[8],
                    'timestamp': registers[9]
                }
                client.close()
                return status
            else:
                logger.error(f"Modbus read error from {ip}")
                
        except Exception as e:
            logger.error(f"Failed to query Modbus status from {ip}: {e}")
            
        return {}

class MQTTHandler:
    """MQTT 處理器 - 數據上傳和遠端監控"""
    
    def __init__(self, broker: str, port: int = 8883, username: str = None, 
                 password: str = None, use_tls: bool = True):
        self.broker = broker
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.client = mqtt.Client()
        self.connected = False
        self.message_handlers: Dict[str, Callable] = {}
        
    def start(self, node_id: str):
        """啟動MQTT連接"""
        try:
            # 設定TLS
            if self.use_tls:
                context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                self.client.tls_set_context(context)
                
            # 設定認證
            if self.username:
                self.client.username_pw_set(self.username, self.password)
                
            # 設定回調
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message
            
            # 連接
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            
            # 訂閱主題
            self.client.subscribe(f"cdu/commands/{node_id}")
            self.client.subscribe("cdu/commands/broadcast")
            
            logger.info(f"MQTT client started, connecting to {self.broker}:{self.port}")
            
        except Exception as e:
            logger.error(f"Failed to start MQTT client: {e}")
            
    def _on_connect(self, client, userdata, flags, rc):
        """MQTT連接回調"""
        if rc == 0:
            self.connected = True
            logger.info("MQTT connected successfully")
        else:
            logger.error(f"MQTT connection failed with code {rc}")
            
    def _on_disconnect(self, client, userdata, rc):
        """MQTT斷線回調"""
        self.connected = False
        logger.warning(f"MQTT disconnected with code {rc}")
        
    def _on_message(self, client, userdata, msg):
        """MQTT訊息回調"""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode('utf-8'))
            
            # 根據主題分發訊息
            if '/commands/' in topic:
                handler = self.message_handlers.get('command')
                if handler:
                    handler(topic, payload)
                    
        except Exception as e:
            logger.error(f"Error handling MQTT message: {e}")
            
    def publish_status(self, node_id: str, status_data: Dict[str, Any]):
        """發布狀態數據"""
        if not self.connected:
            return
            
        try:
            topic = f"cdu/status/{node_id}"
            payload = json.dumps({
                'timestamp': datetime.now().isoformat(),
                'node_id': node_id,
                'data': status_data
            })
            
            self.client.publish(topic, payload, qos=1)
            logger.debug(f"Published status for {node_id}")
            
        except Exception as e:
            logger.error(f"Failed to publish MQTT status: {e}")
            
    def publish_metrics(self, node_id: str, metrics: Dict[str, Any]):
        """發布運行指標"""
        if not self.connected:
            return
            
        try:
            topic = f"cdu/metrics/{node_id}"
            payload = json.dumps({
                'timestamp': datetime.now().isoformat(),
                'node_id': node_id,
                'metrics': metrics
            })
            
            self.client.publish(topic, payload, qos=0)
            logger.debug(f"Published metrics for {node_id}")
            
        except Exception as e:
            logger.error(f"Failed to publish MQTT metrics: {e}")
            
    def register_handler(self, message_type: str, handler: Callable):
        """註冊訊息處理器"""
        self.message_handlers[message_type] = handler

class ClusterCommunication:
    """集群通訊協調器"""
    
    def __init__(self, config: Dict[str, Any], node_id: str):
        self.config = config
        self.node_id = node_id
        
        # 初始化各通訊處理器
        can_config = config['Communication']['can_bus']
        self.can_handler = CANBusHandler(
            interface=can_config['interface'],
            bitrate=can_config['bitrate']
        )
        
        modbus_config = config['Communication']['modbus_tcp']
        self.modbus_handler = ModbusTCPHandler(port=modbus_config['port'])
        
        mqtt_config = config['Communication']['mqtt']
        self.mqtt_handler = MQTTHandler(
            broker=mqtt_config['broker'],
            port=mqtt_config['port'],
            username=mqtt_config['username'],
            use_tls=mqtt_config['use_tls']
        )
        
        # 訊息處理器
        self.message_handlers: Dict[str, Callable] = {}
        
    def start(self):
        """啟動所有通訊處理器"""
        self.can_handler.start()
        self.modbus_handler.start()
        self.mqtt_handler.start(self.node_id)
        
        # 註冊處理器
        self._register_handlers()
        
        logger.info(f"Cluster communication started for {self.node_id}")
        
    def stop(self):
        """停止所有通訊處理器"""
        self.can_handler.stop()
        # Modbus TCP 伺服器會自動停止
        self.mqtt_handler.client.loop_stop()
        self.mqtt_handler.client.disconnect()
        
    def _register_handlers(self):
        """註冊訊息處理器"""
        # CAN Bus 處理器
        self.can_handler.register_handler('heartbeat', self._handle_heartbeat)
        self.can_handler.register_handler('vote_request', self._handle_vote_request)
        self.can_handler.register_handler('load_command', self._handle_load_command)
        
        # MQTT 處理器
        self.mqtt_handler.register_handler('command', self._handle_mqtt_command)
        
    def _handle_heartbeat(self, source_node: str, term: int, timestamp: int):
        """處理心跳訊息"""
        handler = self.message_handlers.get('heartbeat')
        if handler:
            handler(source_node, term, timestamp)
            
    def _handle_vote_request(self, candidate_id: str, term: int):
        """處理投票請求"""
        handler = self.message_handlers.get('vote_request')
        if handler:
            handler(candidate_id, term)
            
    def _handle_load_command(self, source_node: str, load_kw: float):
        """處理負載指令"""
        handler = self.message_handlers.get('load_command')
        if handler:
            handler(source_node, load_kw)
            
    def _handle_mqtt_command(self, topic: str, payload: Dict[str, Any]):
        """處理MQTT指令"""
        handler = self.message_handlers.get('mqtt_command')
        if handler:
            handler(topic, payload)
            
    def send_heartbeat(self, term: int):
        """發送心跳 (透過CAN Bus)"""
        self.can_handler.send_heartbeat(self.node_id, term)
        
    def send_vote_request(self, term: int):
        """發送投票請求 (透過CAN Bus)"""
        self.can_handler.send_vote_request(self.node_id, term)
        
    def send_load_command(self, target_node: str, load_kw: float):
        """發送負載指令 (透過CAN Bus)"""
        self.can_handler.send_load_command(target_node, load_kw)
        
    def query_node_status(self, node_ip: str, node_id: str) -> Dict[str, Any]:
        """查詢節點狀態 (透過Modbus TCP)"""
        return self.modbus_handler.query_remote_status(node_ip, node_id)
        
    def publish_status(self, status_data: Dict[str, Any]):
        """發布狀態 (透過MQTT)"""
        self.mqtt_handler.publish_status(self.node_id, status_data)
        
    def publish_metrics(self, metrics: Dict[str, Any]):
        """發布指標 (透過MQTT)"""
        self.mqtt_handler.publish_metrics(self.node_id, metrics)
        
    def register_handler(self, message_type: str, handler: Callable):
        """註冊訊息處理器"""
        self.message_handlers[message_type] = handler