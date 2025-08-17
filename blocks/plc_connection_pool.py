"""
PLC 連接池管理器
用於管理多個 PLC 區塊共享的 Modbus TCP 連接
"""

import logging
import time
from typing import Dict, Optional, List, Tuple
from threading import Lock
import threading

logger = logging.getLogger(__name__)

class PLCConnectionPool:
    """PLC 連接池管理器 - 單例模式"""
    
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return
            
        self.connections: Dict[str, 'ModbusTcpClient'] = {}
        self.connection_locks: Dict[str, Lock] = {}
        self.last_used: Dict[str, float] = {}
        self.connection_timeout = 300  # 5分鐘超時
        self.max_connections_per_host = 3  # 每個主機最多3個連接
        self.connection_counts: Dict[str, int] = {}
        
        # 啟動清理線程
        self.cleanup_thread = threading.Thread(target=self._cleanup_connections, daemon=True)
        self.cleanup_thread.start()
        
        self._initialized = True
        logger.info("PLC Connection Pool initialized")
    
    def get_connection_key(self, ip_address: str, port: int) -> str:
        """生成連接鍵值"""
        return f"{ip_address}:{port}"
    
    def get_connection(self, ip_address: str, port: int, timeout: int = 3) -> Optional['ModbusTcpClient']:
        """獲取或創建連接"""
        key = self.get_connection_key(ip_address, port)
        
        with self._lock:
            # 檢查連接數限制
            current_count = self.connection_counts.get(ip_address, 0)
            if current_count >= self.max_connections_per_host:
                logger.warning(f"Connection limit reached for {ip_address} ({current_count}/{self.max_connections_per_host})")
                return None
            
            # 檢查是否已有連接
            if key in self.connections:
                client = self.connections[key]
                if client.connected:
                    self.last_used[key] = time.time()
                    return client
                else:
                    # 連接已斷開，移除
                    self._remove_connection(key, ip_address)
            
            # 創建新連接
            try:
                # 嘗試新版本的pymodbus導入
                try:
                    from pymodbus.client import ModbusTcpClient
                except ImportError:
                    from pymodbus.client.sync import ModbusTcpClient
                
                client = ModbusTcpClient(
                    host=ip_address,
                    port=port,
                    timeout=timeout
                )
                
                if client.connect():
                    self.connections[key] = client
                    self.connection_locks[key] = Lock()
                    self.last_used[key] = time.time()
                    self.connection_counts[ip_address] = current_count + 1
                    
                    logger.info(f"Created new PLC connection: {key} (count: {self.connection_counts[ip_address]})")
                    return client
                else:
                    logger.error(f"Failed to connect to PLC: {key}")
                    return None
                    
            except Exception as e:
                logger.error(f"Error creating PLC connection: {e}")
                return None
    
    def _remove_connection(self, key: str, ip_address: str):
        """移除連接"""
        if key in self.connections:
            try:
                self.connections[key].close()
            except:
                pass
            del self.connections[key]
            
        if key in self.connection_locks:
            del self.connection_locks[key]
            
        if key in self.last_used:
            del self.last_used[key]
            
        # 更新連接計數
        if ip_address in self.connection_counts:
            self.connection_counts[ip_address] = max(0, self.connection_counts[ip_address] - 1)
    
    def batch_read_registers(self, ip_address: str, port: int, unit_id: int, 
                           register_list: List[Tuple[int, str]]) -> Dict[str, Optional[int]]:
        """批量讀取暫存器
        
        Args:
            ip_address: PLC IP地址
            port: PLC端口
            unit_id: Modbus單元ID
            register_list: [(register_address, block_id), ...] 暫存器地址和區塊ID列表
            
        Returns:
            {block_id: value, ...} 讀取結果
        """
        results = {}
        connection = self.get_connection(ip_address, port)
        
        if not connection:
            logger.error(f"No connection available for {ip_address}:{port}")
            for _, block_id in register_list:
                results[block_id] = None
            return results
        
        key = self.get_connection_key(ip_address, port)
        
        # 使用連接鎖確保線程安全
        with self.connection_locks.get(key, Lock()):
            try:
                # 按暫存器地址排序以優化讀取
                sorted_registers = sorted(register_list, key=lambda x: x[0])
                
                # 嘗試批量讀取連續的暫存器
                current_batch = []
                current_start = None
                
                for register_addr, block_id in sorted_registers:
                    modbus_addr = register_addr  # 假設直接使用相對地址
                    
                    if current_start is None:
                        current_start = modbus_addr
                        current_batch = [(modbus_addr, block_id)]
                    elif modbus_addr == current_batch[-1][0] + 1:
                        # 連續暫存器，加入批次
                        current_batch.append((modbus_addr, block_id))
                    else:
                        # 不連續，處理當前批次
                        self._process_batch(connection, unit_id, current_start, current_batch, results)
                        # 開始新批次
                        current_start = modbus_addr
                        current_batch = [(modbus_addr, block_id)]
                
                # 處理最後一個批次
                if current_batch:
                    self._process_batch(connection, unit_id, current_start, current_batch, results)
                
                self.last_used[key] = time.time()
                
            except Exception as e:
                logger.error(f"Batch read error for {ip_address}:{port}: {e}")
                for _, block_id in register_list:
                    results[block_id] = None
        
        return results
    
    def _process_batch(self, connection, unit_id: int, start_addr: int, 
                      batch: List[Tuple[int, str]], results: Dict[str, Optional[int]]):
        """處理一個批次的暫存器讀取"""
        try:
            count = len(batch)
            response = connection.read_holding_registers(
                address=start_addr,
                count=count
            )
            
            if response.isError():
                logger.error(f"Modbus read error: {response}")
                for _, block_id in batch:
                    results[block_id] = None
            else:
                for i, (_, block_id) in enumerate(batch):
                    results[block_id] = response.registers[i]
                    
        except Exception as e:
            logger.error(f"Batch processing error: {e}")
            for _, block_id in batch:
                results[block_id] = None
    
    def _cleanup_connections(self):
        """清理閒置連接的背景線程"""
        while True:
            try:
                time.sleep(60)  # 每分鐘檢查一次
                current_time = time.time()
                
                with self._lock:
                    keys_to_remove = []
                    
                    for key, last_used_time in self.last_used.items():
                        if current_time - last_used_time > self.connection_timeout:
                            keys_to_remove.append(key)
                    
                    for key in keys_to_remove:
                        ip_address = key.split(':')[0]
                        logger.info(f"Cleaning up idle connection: {key}")
                        self._remove_connection(key, ip_address)
                        
            except Exception as e:
                logger.error(f"Connection cleanup error: {e}")

# 全局連接池實例
plc_pool = PLCConnectionPool()