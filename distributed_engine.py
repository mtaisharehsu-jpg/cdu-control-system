import yaml
import time
import threading
import logging
import json
import socket
import random
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import asyncio
import importlib

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class NodeState(Enum):
    FOLLOWER = "follower"
    CANDIDATE = "candidate" 
    LEADER = "leader"
    FAILED = "failed"

class NodeRole(Enum):
    MASTER = "master"
    SLAVE = "slave"

@dataclass
class NodeInfo:
    node_id: str
    ip_address: str
    port: int
    priority: int
    state: NodeState
    role: NodeRole
    last_heartbeat: datetime
    current_load_kw: float
    max_capacity_kw: float
    health_score: float
    term: int = 0
    
    def to_dict(self):
        return {
            'node_id': self.node_id,
            'ip_address': self.ip_address,
            'port': self.port,
            'priority': self.priority,
            'state': self.state.value,
            'role': self.role.value,
            'last_heartbeat': self.last_heartbeat.isoformat(),
            'current_load_kw': self.current_load_kw,
            'max_capacity_kw': self.max_capacity_kw,
            'health_score': self.health_score,
            'term': self.term
        }

class RaftConsensus:
    """Raft共識算法實現"""
    
    def __init__(self, node_id: str, cluster_nodes: List[str], priority: int):
        self.node_id = node_id
        self.cluster_nodes = cluster_nodes
        self.priority = priority
        self.current_term = 0
        self.voted_for = None
        self.state = NodeState.FOLLOWER
        self.leader_id = None
        self.last_heartbeat = datetime.now()
        self.election_timeout = 0.15 + random.uniform(0, 0.15)  # 150-300ms
        self.heartbeat_interval = 0.05  # 50ms
        self.votes_received = set()
        
    def start_election(self):
        """發起選舉"""
        if self.state == NodeState.LEADER:
            return
            
        logger.info(f"Node {self.node_id} starting election for term {self.current_term + 1}")
        self.state = NodeState.CANDIDATE
        self.current_term += 1
        self.voted_for = self.node_id
        self.votes_received = {self.node_id}
        
        # 發送投票請求給其他節點
        self._send_vote_requests()
        
    def _send_vote_requests(self):
        """發送投票請求"""
        for node in self.cluster_nodes:
            if node != self.node_id:
                # 實際實現中應透過網路發送
                logger.debug(f"Sending vote request to {node}")
                
    def receive_vote_request(self, candidate_id: str, term: int, candidate_priority: int) -> bool:
        """處理投票請求"""
        if term < self.current_term:
            return False
            
        if term > self.current_term:
            self.current_term = term
            self.voted_for = None
            self.state = NodeState.FOLLOWER
            
        # 基於優先級的投票策略
        if (self.voted_for is None or self.voted_for == candidate_id) and candidate_priority <= self.priority:
            self.voted_for = candidate_id
            self.last_heartbeat = datetime.now()
            logger.info(f"Node {self.node_id} voted for {candidate_id} in term {term}")
            return True
            
        return False
        
    def receive_vote_response(self, node_id: str, vote_granted: bool):
        """處理投票回應"""
        if self.state != NodeState.CANDIDATE:
            return
            
        if vote_granted:
            self.votes_received.add(node_id)
            
        # 檢查是否獲得多數票
        if len(self.votes_received) > len(self.cluster_nodes) // 2:
            self.become_leader()
            
    def become_leader(self):
        """成為Leader"""
        logger.info(f"Node {self.node_id} became leader for term {self.current_term}")
        self.state = NodeState.LEADER
        self.leader_id = self.node_id
        
    def receive_heartbeat(self, leader_id: str, term: int):
        """接收心跳"""
        if term >= self.current_term:
            self.current_term = term
            self.state = NodeState.FOLLOWER
            self.leader_id = leader_id
            self.last_heartbeat = datetime.now()
            self.voted_for = None
            
    def should_start_election(self) -> bool:
        """檢查是否應該發起選舉"""
        if self.state == NodeState.LEADER:
            return False
            
        time_since_heartbeat = (datetime.now() - self.last_heartbeat).total_seconds()
        return time_since_heartbeat > self.election_timeout

class LoadBalancer:
    """智能負載調度器"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.normal_distribution = config['Load_Balancing']['normal_load_distribution']
        self.emergency_reserve = config['Load_Balancing']['emergency_capacity_reserve']
        self.rebalance_threshold = config['Load_Balancing']['rebalance_threshold']
        
    def calculate_optimal_distribution(self, nodes: Dict[str, NodeInfo], total_load_kw: float) -> Dict[str, float]:
        """計算最佳負載分配"""
        active_nodes = {k: v for k, v in nodes.items() if v.state != NodeState.FAILED}
        
        if not active_nodes:
            return {}
            
        # 計算總可用容量
        total_capacity = sum(node.max_capacity_kw for node in active_nodes.values())
        available_capacity = total_capacity * (1 - self.emergency_reserve)
        
        if total_load_kw > available_capacity:
            logger.warning(f"Total load {total_load_kw}kW exceeds available capacity {available_capacity}kW")
            
        # 基於容量和健康度的智能分配
        allocation = {}
        for node_id, node in active_nodes.items():
            # 考慮節點容量、健康度和正常分配比例
            base_ratio = self.normal_distribution.get(node_id, 1.0 / len(active_nodes))
            capacity_factor = node.max_capacity_kw / total_capacity
            health_factor = node.health_score
            
            adjusted_ratio = base_ratio * capacity_factor * health_factor
            allocation[node_id] = min(total_load_kw * adjusted_ratio, 
                                    node.max_capacity_kw * (1 - self.emergency_reserve))
                                    
        return allocation
        
    def should_rebalance(self, current_allocation: Dict[str, float], 
                        optimal_allocation: Dict[str, float]) -> bool:
        """檢查是否需要重新平衡"""
        for node_id in current_allocation:
            if node_id in optimal_allocation:
                diff_ratio = abs(current_allocation[node_id] - optimal_allocation[node_id]) / \
                           max(optimal_allocation[node_id], 0.1)
                if diff_ratio > self.rebalance_threshold:
                    return True
        return False

class AIOptimizer:
    """AI驅動的智能優化器"""
    
    def __init__(self, config: Dict):
        self.config = config['AI_Optimization']
        self.load_history = []
        self.efficiency_history = []
        
    def predict_load(self, current_time: datetime) -> float:
        """預測未來負載"""
        if not self.config['enable_load_prediction']:
            return 0.0
            
        # 簡化的預測模型 - 實際應使用機器學習
        if len(self.load_history) < 10:
            return 0.0
            
        # 計算趨勢
        recent_loads = self.load_history[-10:]
        avg_load = sum(recent_loads) / len(recent_loads)
        
        # 考慮時間週期性 (例如工作時間vs非工作時間)
        hour = current_time.hour
        if 9 <= hour <= 17:  # 工作時間
            return avg_load * 1.2
        else:
            return avg_load * 0.8
            
    def optimize_efficiency(self, nodes: Dict[str, NodeInfo]) -> Dict[str, Dict[str, Any]]:
        """優化運行效率"""
        if not self.config['enable_efficiency_optimization']:
            return {}
            
        optimizations = {}
        for node_id, node in nodes.items():
            # 基於負載率計算最佳運行參數
            load_ratio = node.current_load_kw / node.max_capacity_kw
            
            if load_ratio < 0.3:  # 低負載
                optimizations[node_id] = {
                    'pump_speed_ratio': 0.7,
                    'cooling_mode': 'eco'
                }
            elif load_ratio > 0.8:  # 高負載
                optimizations[node_id] = {
                    'pump_speed_ratio': 1.0,
                    'cooling_mode': 'performance'
                }
            else:  # 正常負載
                optimizations[node_id] = {
                    'pump_speed_ratio': 0.8 + load_ratio * 0.2,
                    'cooling_mode': 'balanced'
                }
                
        return optimizations
        
    def predict_failures(self, nodes: Dict[str, NodeInfo]) -> Dict[str, float]:
        """故障預測"""
        if not self.config['enable_fault_prediction']:
            return {}
            
        predictions = {}
        for node_id, node in nodes.items():
            # 簡化的故障預測模型
            risk_score = 0.0
            
            # 基於健康度
            if node.health_score < 0.8:
                risk_score += 0.3
                
            # 基於負載率
            load_ratio = node.current_load_kw / node.max_capacity_kw
            if load_ratio > 0.9:
                risk_score += 0.2
                
            predictions[node_id] = min(risk_score, 1.0)
            
        return predictions

class DistributedCDUEngine:
    """分散式自主CDU控制引擎"""
    
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.node_id = self.config['CDU_System']['node_id']
        self.cluster_nodes = [f"CDU_{i:02d}" for i in range(1, 7)]  # CDU_01 to CDU_06
        self.priority = self.config['CDU_System']['priority_map'][self.node_id]
        
        # 初始化組件
        self.raft = RaftConsensus(self.node_id, self.cluster_nodes, self.priority)
        self.load_balancer = LoadBalancer(self.config)
        self.ai_optimizer = AIOptimizer(self.config)
        
        # 節點狀態
        self.nodes = {}
        self.current_load_kw = 0.0
        self.max_capacity_kw = self.config['CDU_System']['max_capacity_kw']
        self.health_score = 1.0
        
        # 功能區塊 (保持原有架構)
        self.blocks = {}
        self._load_function_blocks()
        
        # 運行狀態
        self.running = False
        self.last_optimization = datetime.now()
        
        logger.info(f"Distributed CDU Engine initialized for node {self.node_id}")
        
    def _load_config(self, config_path: str) -> Dict:
        """載入配置檔"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
            
    def _load_function_blocks(self):
        """載入功能區塊 (保持原有架構)"""
        for block_conf in self.config.get('FunctionBlocks', []):
            block_id = block_conf.get('id')
            block_type = block_conf.get('type')
            
            if not block_id or not block_type:
                continue
                
            try:
                # 動態載入模組 (與原engine.py相同邏輯)
                if block_type == 'PumpVFDBlock':
                    module_name = "blocks.pump_vfd"
                elif block_type == 'MitsubishiPLCBlock':
                    module_name = "blocks.mitsubishi_plc"
                else:
                    type_without_block = block_type.replace('Block', '')
                    import re
                    module_name_snake_case = re.sub('([A-Z])', r'_\1', type_without_block).lower().lstrip('_')
                    module_name = f"blocks.{module_name_snake_case}"
                    
                module = importlib.import_module(module_name)
                BlockClass = getattr(module, block_type)
                self.blocks[block_id] = BlockClass(block_id, block_conf)
                logger.info(f"Loaded Block: '{block_id}' of type '{block_type}'")
            except Exception as e:
                logger.error(f"Error loading block '{block_id}': {e}")
                
    def start(self):
        """啟動分散式CDU引擎"""
        self.running = True
        
        # 啟動各個執行緒 (暫時停用Raft算法)
        # threading.Thread(target=self._raft_loop, daemon=True).start()  # 停用Raft選舉
        threading.Thread(target=self._control_loop, daemon=True).start()
        threading.Thread(target=self._optimization_loop, daemon=True).start()
        threading.Thread(target=self._communication_loop, daemon=True).start()
        
        logger.info(f"Distributed CDU Engine started for {self.node_id}")
        
    def _raft_loop(self):
        """Raft共識算法主迴圈"""
        while self.running:
            try:
                # 檢查是否需要發起選舉
                if self.raft.should_start_election():
                    self.raft.start_election()
                    
                # 如果是Leader，發送心跳
                if self.raft.state == NodeState.LEADER:
                    self._send_heartbeat()
                    
                time.sleep(0.01)  # 10ms
            except Exception as e:
                logger.error(f"Error in Raft loop: {e}")
                
    def _control_loop(self):
        """控制迴圈 (保持原有架構)"""
        while self.running:
            try:
                # 更新所有功能區塊
                for block_id, block in self.blocks.items():
                    logger.debug(f"Updating block: {block_id}")
                    block.update()
                    
                # 計算當前負載
                self._calculate_current_load()
                
                # 更新健康度
                self._update_health_score()

                # 每10秒記錄一次控制循環狀態
                if hasattr(self, '_control_loop_counter'):
                    self._control_loop_counter += 1
                else:
                    self._control_loop_counter = 1

                if self._control_loop_counter % 10 == 0:
                    logger.info(f"Control loop running, blocks updated: {len(self.blocks)}")

                time.sleep(1)  # 1s控制週期
            except Exception as e:
                logger.error(f"Error in control loop: {e}")
                
    def _optimization_loop(self):
        """AI優化迴圈"""
        while self.running:
            try:
                if (datetime.now() - self.last_optimization).total_seconds() > 60:  # 每分鐘優化一次
                    self._run_optimization()
                    self.last_optimization = datetime.now()
                    
                time.sleep(10)  # 10s檢查週期
            except Exception as e:
                logger.error(f"Error in optimization loop: {e}")
                
    def _communication_loop(self):
        """通訊處理迴圈"""
        while self.running:
            try:
                # 處理網路通訊
                self._handle_network_communication()
                time.sleep(0.1)  # 100ms
            except Exception as e:
                logger.error(f"Error in communication loop: {e}")
                
    def _send_heartbeat(self):
        """發送心跳"""
        heartbeat_data = {
            'type': 'heartbeat',
            'leader_id': self.node_id,
            'term': self.raft.current_term,
            'timestamp': datetime.now().isoformat()
        }
        # 實際實現中應透過網路發送給所有節點
        logger.debug(f"Sending heartbeat from leader {self.node_id}")
        
    def _calculate_current_load(self):
        """計算當前負載"""
        total_power = 0.0
        for block in self.blocks.values():
            if hasattr(block, 'output_power_watts'):
                total_power += getattr(block, 'output_power_watts', 0.0)
        self.current_load_kw = total_power / 1000.0
        
    def _update_health_score(self):
        """更新健康度評分"""
        health_factors = []
        
        # 基於區塊健康狀態
        for block in self.blocks.values():
            if hasattr(block, 'output_health'):
                health = getattr(block, 'output_health', 'OK')
                health_factors.append(1.0 if health == 'OK' else 0.5)
                
        # 基於負載率
        load_ratio = self.current_load_kw / self.max_capacity_kw
        if load_ratio > 0.9:
            health_factors.append(0.8)
        else:
            health_factors.append(1.0)
            
        self.health_score = sum(health_factors) / len(health_factors) if health_factors else 1.0
        
    def _run_optimization(self):
        """執行AI優化"""
        if self.raft.state == NodeState.LEADER:
            # 只有Master執行全域優化
            predicted_load = self.ai_optimizer.predict_load(datetime.now())
            efficiency_opts = self.ai_optimizer.optimize_efficiency(self.nodes)
            failure_predictions = self.ai_optimizer.predict_failures(self.nodes)
            
            logger.info(f"AI Optimization - Predicted load: {predicted_load}kW")
            
            # 基於預測調整負載分配
            if predicted_load > 0:
                optimal_allocation = self.load_balancer.calculate_optimal_distribution(
                    self.nodes, predicted_load)
                logger.info(f"Optimal allocation: {optimal_allocation}")
                
    def _handle_network_communication(self):
        """處理網路通訊"""
        # 實際實現中應處理CAN Bus、Modbus TCP、MQTT等協定
        pass
        
    def get_node_status(self) -> Dict:
        """獲取節點狀態"""
        return {
            'node_id': self.node_id,
            'state': self.raft.state.value,
            'role': 'master' if self.raft.state == NodeState.LEADER else 'slave',
            'term': self.raft.current_term,
            'leader_id': self.raft.leader_id,
            'current_load_kw': self.current_load_kw,
            'max_capacity_kw': self.max_capacity_kw,
            'health_score': self.health_score,
            'blocks_status': {bid: {
                'status': getattr(block, 'output_status', 'Unknown'),
                'health': getattr(block, 'output_health', 'Unknown')
            } for bid, block in self.blocks.items()}
        }
        
    # 保持原有API介面
    def get_block_property(self, block_id: str, prop_name: str):
        """獲取區塊屬性 (API相容性)"""
        if block_id in self.blocks:
            return getattr(self.blocks[block_id], prop_name, None)
        return None
        
    def set_block_property(self, block_id: str, prop_name: str, value):
        """設定區塊屬性 (API相容性)"""
        if block_id in self.blocks:
            logger.info(f"Setting property '{prop_name}' for block '{block_id}' to '{value}'")
            setattr(self.blocks[block_id], prop_name, value)
            return True
        return False
        
    def emergency_shutdown(self):
        """緊急停機"""
        logger.critical(f"Emergency shutdown initiated for {self.node_id}")
        self.running = False
        for block in self.blocks.values():
            if hasattr(block, 'input_enable'):
                setattr(block, 'input_enable', False)

    def stop(self):
        """停止引擎"""
        logger.info(f"Stopping Distributed CDU Engine for {self.node_id}")
        self.running = False