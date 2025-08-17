"""
三菱F5U PLC Modbus TCP 功能塊
用於讀取PLC的R暫存器數據
"""

from .base_block import BaseBlock
from .plc_connection_pool import plc_pool
import logging
import time
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class MitsubishiPLCBlock(BaseBlock):
    """三菱F5U PLC Modbus TCP 功能塊"""
    
    def __init__(self, block_id, config):
        super().__init__(block_id, config)
        
        # BaseBlock已經將block_id儲存為self.id，為了兼容性也添加block_id屬性
        self.block_id = block_id
        
        # PLC連接配置
        self.ip_address = config.get('ip_address', '10.10.40.8')
        self.port = config.get('port', 502)
        self.unit_id = config.get('unit_id', 1)
        
        # 單個暫存器配置 (優先使用) - 新增支援
        self.register = config.get('register', None)  # 例如: 20 代表 R10020
        
        # R暫存器範圍配置 (批量讀取)  
        self.start_register = config.get('start_register', 10000)  # R10000
        self.register_count = config.get('register_count', 124)     # R10000-R10123 (124個暫存器)
        self.modbus_start_address = config.get('modbus_start_address', 0)  # R10000對應Modbus地址0
        
        # 如果設定了單個暫存器，調整配置以讀取該暫存器
        if self.register is not None:
            actual_register = 10000 + self.register  # register: 20 -> R10020
            self.start_register = actual_register
            self.register_count = 1
            self.modbus_start_address = self.register  # 直接使用相對地址
            logger.info(f"Single register mode: R{actual_register} (register: {self.register})")

        # R暫存器數據名稱映射
        self.register_names = {
            10000: "CDU1運轉狀態",
            10001: "CDU1溫度設定",
            10002: "CDU1實際溫度",
            10003: "CDU1風扇狀態",
            10004: "CDU1壓縮機狀態",
            10005: "CDU1警報狀態",
            10006: "CDU1電流值",
            10007: "CDU1電壓值",
            10008: "CDU1功率值",
            10009: "CDU1運轉時間",
            10010: "CDU1維護狀態",
            10111: "一次側入水溫度T1",
            10112: "一次側出水溫度T2",
            10113: "二次側入水溫度T3",
            10114: "二次側水箱溫度T4",
            10115: "二次側入水溫度T5",
            10116: "二次側水箱溫度T6",
            10117: "二次側入水溫度T7",
            10118: "二次側水箱溫度T8",
            10119: "二次側入水溫度T9",
            10120: "二次側水箱溫度T10",
            10121: "二次側水箱溫度T11",
            10122: "二次側水箱溫度T12",
            10123: "二次側水箱溫度T13",
            10124: "二次側水箱溫度T14",
            10125: "二次側水箱溫度T15",
            10126: "二次側水箱溫度T16",
            10081: "一次側入水壓力過濾器(前)P01",
            10082: "一次側入水壓力過濾器後)P2",
            10083: "一次側出水壓力P3",
            10084: "二次側入水壓力P4",
            10085: "二次側出水壓力P5",
            10086: "二次側入水壓力P6",
            10087: "二次側出水壓力P7",
            10088: "二次側入水壓力P8",
            10089: "二次側出水壓力P9",
            10090: "二次側入水壓力P10",
            10091: "二次側出水壓力P11",
            10092: "二次側入水壓力P12",
            10093: "二次側出水壓力P13",
            10094: "二次側入水壓力P14",
            10095: "二次側出水壓力P15",
            10096: "二次側入水壓力P16",
            10097: "二次側出水壓力P17",
            10098: "二次側入水壓力P18",
            10061: "流量感測器01",
            10062: "流量感測器02",
            10063: "流量感測器03",
            10064: "流量感測器04"           
        }

        # R暫存器配置 (寫入)
        self.r_start_register = config.get('r_start_register', 10500)  # R10500
        self.r_register_count = config.get('r_register_count', 201)    # R10500-R10700 (201個暫存器)
        self.r_modbus_start_address = 500  # R10500對應Modbus地址500

        # 連接狀態 (使用連接池)
        self.client = None  # 保持兼容性，但實際使用連接池
        self.connected = False
        self.last_connection_attempt = 0
        self.connection_retry_interval = 5  # 5秒重試間隔
        self.use_connection_pool = True  # 標記使用連接池

        # 輸出數據
        self.output_status = "Disconnected"
        self.output_health = "Unknown"
        self.register_values = {}  # R暫存器值 (讀取)
        self.r_register_values = {}  # R暫存器值 (寫入緩存)
        self.last_update_time = None
        self.connection_errors = 0
        self.write_errors = 0
        
        # 根據區塊ID判斷感測器類型
        block_id_lower = block_id.lower()
        if 'temp' in block_id_lower or 'temperature' in block_id_lower:
            self._sensor_type = 'temperature'
        elif 'press' in block_id_lower or 'pressure' in block_id_lower:
            self._sensor_type = 'pressure'
        elif 'flow' in block_id_lower:
            self._sensor_type = 'flow'
        else:
            self._sensor_type = 'generic'
        
        logger.info(f"PLC block '{block_id}' detected as sensor type: {self._sensor_type}")
        
        # 初始化Modbus客戶端
        self._initialize_client()
        
        logger.info(f"Initialized Mitsubishi PLC block '{block_id}' for {self.ip_address}:{self.port}")
    
    def _initialize_client(self):
        """初始化Modbus TCP客戶端"""
        try:
            # 嘗試新版本的pymodbus導入
            try:
                from pymodbus.client import ModbusTcpClient
            except ImportError:
                # 回退到舊版本的導入
                from pymodbus.client.sync import ModbusTcpClient

            self.client = ModbusTcpClient(
                host=self.ip_address,
                port=self.port,
                timeout=3
            )
            logger.info(f"Modbus TCP client initialized for {self.ip_address}:{self.port}")
        except ImportError:
            logger.error("pymodbus library not found. Please install: pip install pymodbus")
            self.output_health = "Critical"
        except Exception as e:
            logger.error(f"Failed to initialize Modbus client: {e}")
            self.output_health = "Critical"
    
    def _connect(self):
        """連接到PLC"""
        if not self.client:
            return False
            
        try:
            if self.client.connect():
                self.connected = True
                self.output_status = "Connected"
                self.output_health = "OK"
                self.connection_errors = 0
                logger.info(f"Successfully connected to PLC {self.ip_address}:{self.port}")
                return True
            else:
                self.connected = False
                self.output_status = "Connection Failed"
                self.output_health = "Warning"
                self.connection_errors += 1
                logger.warning(f"Failed to connect to PLC {self.ip_address}:{self.port}")
                return False
        except Exception as e:
            self.connected = False
            self.output_status = "Connection Error"
            self.output_health = "Critical"
            self.connection_errors += 1
            logger.error(f"Connection error to PLC {self.ip_address}:{self.port}: {e}")
            return False
    
    def _disconnect(self):
        """斷開PLC連接"""
        if self.client and self.connected:
            try:
                self.client.close()
                self.connected = False
                self.output_status = "Disconnected"
                logger.info(f"Disconnected from PLC {self.ip_address}:{self.port}")
            except Exception as e:
                logger.error(f"Error disconnecting from PLC: {e}")
    
    def _read_r_registers(self):
        """讀取R暫存器數據 (使用連接池)"""
        if self.use_connection_pool:
            return self._read_using_connection_pool()
        else:
            return self._read_using_direct_connection()
    
    def _read_using_connection_pool(self):
        """使用連接池讀取暫存器"""
        try:
            # 準備暫存器列表
            if self.register is not None:
                # 單個暫存器模式
                register_list = [(self.register, self.block_id)]
            else:
                # 批量讀取模式
                register_list = []
                for i in range(self.register_count):
                    register_addr = self.modbus_start_address + i
                    register_list.append((register_addr, f"{self.block_id}_R{self.start_register + i}"))
            
            # 使用連接池批量讀取
            results = plc_pool.batch_read_registers(
                self.ip_address, 
                self.port, 
                self.unit_id, 
                register_list
            )
            
            # 處理讀取結果
            success = False
            for register_addr, block_key in register_list:
                value = results.get(block_key)
                
                if value is not None:
                    success = True
                    actual_register = self.start_register + (register_addr - self.modbus_start_address) if self.register is None else 10000 + self.register
                    register_key = f"R{actual_register}"
                    register_name = self.register_names.get(actual_register, f'未知暫存器R{actual_register}')
                    
                    self.register_values[register_key] = {
                        'value': value,
                        'name': register_name,
                        'register': actual_register
                    }
                    
                    # 如果是單個暫存器模式，也使用相對地址作為索引
                    if self.register is not None:
                        self.register_values[self.register] = value
                        logger.debug(f"Stored register value: register_values[{self.register}] = {value} (R{actual_register})")
            
            if success:
                self.last_update_time = time.time()
                self.output_health = "OK"
                self.output_status = "Connected"
                self.connected = True
                self.connection_errors = 0
                logger.debug(f"Successfully read registers from PLC using connection pool")
            else:
                self.output_health = "Warning"
                self.output_status = "Read Error"
                self.connected = False
                self.connection_errors += 1
                
            return success
            
        except Exception as e:
            logger.error(f"Error reading R registers using connection pool: {e}")
            self.output_health = "Warning"
            self.output_status = "Connection Error"
            self.connected = False
            self.connection_errors += 1
            return False
    
    def _read_using_direct_connection(self):
        """使用直接連接讀取暫存器 (舊方法)"""
        if not self.connected:
            return False

        logger.debug(f"Reading R registers from {self.start_register} to {self.start_register + self.register_count - 1}")

        try:
            # 讀取R暫存器 (使用功能碼03 - Read Holding Registers)
            # R10000-R10010 對應 Modbus地址 0-10
            modbus_address = self.modbus_start_address  # R10000對應Modbus地址0

            result = self.client.read_holding_registers(
                address=modbus_address,
                count=self.register_count
            )
            
            if result.isError():
                logger.error(f"Modbus read error: {result}")
                self.output_health = "Warning"
                return False
            
            # 更新暫存器值
            for i, value in enumerate(result.registers):
                register_addr = self.start_register + i
                register_key = f"R{register_addr}"
                register_name = self.register_names.get(register_addr, f'未知暫存器R{register_addr}')

                self.register_values[register_key] = {
                    'value': value,
                    'name': register_name,
                    'register': register_addr
                }
                
                # 如果是單個暫存器模式，也使用相對地址作為索引
                if self.register is not None:
                    self.register_values[self.register] = value
                    logger.info(f"Stored register value: register_values[{self.register}] = {value} (R{register_addr})")
            
            self.last_update_time = time.time()
            self.output_health = "OK"
            
            logger.debug(f"Successfully read {len(result.registers)} registers from PLC")
            return True
            
        except Exception as e:
            logger.error(f"Error reading R registers: {e}")
            self.output_health = "Warning"
            return False

    def read_single_r_register(self, register_address):
        """讀取單個R暫存器 (使用功能碼03 - Read Holding Registers)"""
        if not self.connected:
            logger.warning("PLC not connected, cannot read register")
            return None

        # 檢查地址範圍 (R10000-R11000)
        if not (10000 <= register_address <= 11000):
            logger.error(f"Register address R{register_address} out of range (R10000-R11000)")
            return None

        # 計算Modbus地址 (R10000對應Modbus地址0)
        modbus_address = register_address - 10000

        try:
            # 使用功能碼03讀取單個暫存器
            result = self.client.read_holding_registers(
                address=modbus_address,
                count=1
            )

            if result.isError():
                logger.error(f"Modbus read error for R{register_address}: {result}")
                return None

            value = result.registers[0]
            logger.debug(f"Successfully read R{register_address} = {value}")

            return {
                'value': value,
                'register': register_address,
                'modbus_address': modbus_address,
                'timestamp': time.time()
            }

        except Exception as e:
            logger.error(f"Error reading R{register_address}: {e}")
            return None

    def read_r_registers_batch(self, start_address, count):
        """批量讀取R暫存器 (使用功能碼03 - Read Holding Registers)"""
        if not self.connected:
            logger.warning("PLC not connected, cannot read registers")
            return None

        # 檢查地址範圍
        end_address = start_address + count - 1
        if not (10000 <= start_address <= 11000) or not (10000 <= end_address <= 11000):
            logger.error(f"Register range R{start_address}-R{end_address} out of range (R10000-R11000)")
            return None

        # 檢查數量限制 (最多125個暫存器，Modbus限制)
        if count > 125:
            logger.error(f"Register count {count} exceeds maximum (125)")
            return None

        # 計算Modbus地址
        modbus_start_address = start_address - 10000

        try:
            # 使用功能碼03批量讀取暫存器
            result = self.client.read_holding_registers(
                address=modbus_start_address,
                count=count
            )

            if result.isError():
                logger.error(f"Modbus batch read error for R{start_address}-R{end_address}: {result}")
                return None

            # 組織返回數據
            registers_data = {}
            for i, value in enumerate(result.registers):
                register_addr = start_address + i
                register_key = f"R{register_addr}"
                registers_data[register_key] = {
                    'value': value,
                    'register': register_addr,
                    'modbus_address': modbus_start_address + i
                }

            logger.debug(f"Successfully read {count} registers from R{start_address}")

            return {
                'registers': registers_data,
                'start_address': start_address,
                'count': count,
                'timestamp': time.time()
            }

        except Exception as e:
            logger.error(f"Error batch reading registers R{start_address}-R{end_address}: {e}")
            return None

    def write_r_register(self, register_address, value):
        """寫入單個R暫存器 (使用功能碼06 - Write Single Register)"""
        if not self.connected:
            logger.warning("PLC not connected, cannot write register")
            return False

        # 檢查地址範圍
        if not (self.r_start_register <= register_address <= self.r_start_register + self.r_register_count - 1):
            logger.error(f"Register address {register_address} out of range ({self.r_start_register}-{self.r_start_register + self.r_register_count - 1})")
            return False

        # 計算Modbus地址 (R10500對應Modbus地址500)
        modbus_address = self.r_modbus_start_address + (register_address - self.r_start_register)

        try:
            # 使用功能碼06寫入單個暫存器
            result = self.client.write_register(
                address=modbus_address,
                value=value
            )

            if result.isError():
                logger.error(f"Modbus write error for R{register_address}: {result}")
                self.write_errors += 1
                return False

            # 更新本地緩存
            self.r_register_values[f"R{register_address}"] = value
            logger.info(f"Successfully wrote R{register_address} = {value} (Modbus addr: {modbus_address})")
            return True

        except Exception as e:
            logger.error(f"Error writing R{register_address}: {e}")
            self.write_errors += 1
            return False

    def write_r_registers_batch(self, start_address, values):
        """批量寫入R暫存器 (使用功能碼16 - Write Multiple Registers)"""
        if not self.connected:
            logger.warning("PLC not connected, cannot write registers")
            return False

        # 檢查地址範圍
        end_address = start_address + len(values) - 1
        if not (self.r_start_register <= start_address <= self.r_start_register + self.r_register_count - 1):
            logger.error(f"Start address {start_address} out of range")
            return False
        if not (self.r_start_register <= end_address <= self.r_start_register + self.r_register_count - 1):
            logger.error(f"End address {end_address} out of range")
            return False

        # 計算Modbus地址
        modbus_start_address = self.r_modbus_start_address + (start_address - self.r_start_register)

        try:
            # 使用功能碼16寫入多個暫存器
            result = self.client.write_registers(
                address=modbus_start_address,
                values=values
            )

            if result.isError():
                logger.error(f"Modbus batch write error for R{start_address}-R{end_address}: {result}")
                self.write_errors += 1
                return False

            # 更新本地緩存
            for i, value in enumerate(values):
                reg_addr = start_address + i
                self.r_register_values[f"R{reg_addr}"] = value

            logger.info(f"Successfully wrote {len(values)} registers starting from R{start_address}")
            return True

        except Exception as e:
            logger.error(f"Error batch writing R registers: {e}")
            self.write_errors += 1
            return False
    
    def update(self):
        """更新PLC數據 - 在控制循環中被調用"""
        current_time = time.time()
        logger.debug(f"PLC update called, use_connection_pool: {self.use_connection_pool}")
        
        if self.use_connection_pool:
            # 使用連接池模式，直接讀取數據
            success = self._read_r_registers()
            if not success:
                self.output_status = "Read Error"
        else:
            # 傳統連接模式
            # 檢查是否需要重新連接
            if not self.connected:
                if current_time - self.last_connection_attempt > self.connection_retry_interval:
                    self.last_connection_attempt = current_time
                    self._connect()
            
            # 如果已連接，讀取數據
            if self.connected:
                success = self._read_r_registers()
                if not success:
                    # 讀取失敗，可能需要重新連接
                    self.connected = False
                    self.output_status = "Read Error"
    
    def get_register_value(self, register_name: str) -> Optional[int]:
        """獲取特定暫存器的值"""
        return self.register_values.get(register_name)
    
    def get_all_registers(self) -> Dict[str, int]:
        """獲取所有D暫存器值"""
        return self.register_values.copy()

    def get_all_r_registers(self) -> Dict[str, int]:
        """獲取所有R暫存器值"""
        return self.r_register_values.copy()

    def get_r_register_value(self, register_address: int) -> Optional[int]:
        """獲取特定R暫存器的值"""
        return self.r_register_values.get(f"R{register_address}")

    def set_r_register_value(self, register_address: int, value: int) -> bool:
        """設置R暫存器值 (寫入到PLC)"""
        return self.write_r_register(register_address, value)

    def initialize_r_registers(self, initial_values: Dict[int, int] = None):
        """初始化R暫存器值"""
        if initial_values is None:
            # 設置默認值
            initial_values = {}
            for i in range(self.r_register_count):
                reg_addr = self.r_start_register + i
                initial_values[reg_addr] = 0

        # 批量寫入初始值
        if initial_values:
            addresses = sorted(initial_values.keys())
            start_addr = addresses[0]
            values = [initial_values[addr] for addr in addresses]

            success = self.write_r_registers_batch(start_addr, values)
            if success:
                logger.info(f"Initialized {len(values)} R registers with default values")
            return success
        return True
    
    @property
    def output_temperature(self):
        """提供溫度輸出屬性，用於與溫度感測器界面兼容"""
        if self._sensor_type == 'temperature' and self.register is not None:
            if self.register in self.register_values:
                raw_value = self.register_values[self.register]
                # 將原始值轉換為溫度 (假設原始值需要除以10)
                # 例如: 543 -> 54.3°C
                return raw_value / 10.0 if raw_value > 100 else raw_value
        return -1.0  # 無效值

    @property
    def output_pressure(self):
        """提供壓力輸出屬性，用於與壓力感測器界面兼容"""
        if self._sensor_type == 'pressure' and self.register is not None:
            if self.register in self.register_values:
                raw_value = self.register_values[self.register]
                # 將原始值轉換為壓力 (假設原始值需要除以100)
                # 例如: 1050 -> 10.5 Bar
                return raw_value / 100.0 if raw_value > 100 else raw_value
        return -1.0  # 無效值
    
    @property
    def output_flow(self):
        """提供流量輸出屬性，用於與流量感測器界面兼容"""
        if self._sensor_type == 'flow' and self.register is not None:
            if self.register in self.register_values:
                raw_value = self.register_values[self.register]
                # 將原始值轉換為流量 (假設原始值需要除以10)
                # 例如: 1250 -> 125.0 L/min
                return raw_value / 10.0 if raw_value > 100 else raw_value
        return -1.0  # 無效值

    def read_register(self, register_address: int) -> Optional[int]:
        """讀取單個特定暫存器的值 (例如: R10001-R10005 異常暫存器)"""
        try:
            if self.use_connection_pool:
                # 使用連接池讀取單個暫存器
                register_list = [(register_address - 10000, f"temp_read_{register_address}")]
                results = plc_pool.batch_read_registers(
                    self.ip_address, 
                    self.port, 
                    self.unit_id, 
                    register_list
                )
                
                result_key = f"temp_read_{register_address}"
                value = results.get(result_key)
                
                if value is not None:
                    logger.debug(f"Successfully read register R{register_address} = {value}")
                    return value
                else:
                    logger.warning(f"Failed to read register R{register_address}")
                    return None
                    
            else:
                # 使用直接連接讀取
                if not self.connected:
                    logger.warning(f"PLC not connected, cannot read R{register_address}")
                    return None
                    
                # 計算Modbus地址 (R10001 = Modbus地址1)
                modbus_address = register_address - 10000
                
                result = self.client.read_holding_registers(
                    address=modbus_address,
                    count=1
                )
                
                if result.isError():
                    logger.error(f"Modbus read error for R{register_address}: {result}")
                    return None
                
                value = result.registers[0]
                logger.debug(f"Successfully read register R{register_address} = {value}")
                return value
                
        except Exception as e:
            logger.error(f"Error reading register R{register_address}: {e}")
            return None
    
    def get_status_info(self) -> Dict[str, Any]:
        """獲取詳細狀態信息"""
        info = {
            "ip_address": self.ip_address,
            "port": self.port,
            "connected": self.connected,
            "status": self.output_status,
            "health": self.output_health,
            "register_count": len(self.register_values),
            "r_register_count": len(self.r_register_values),
            "last_update": self.last_update_time,
            "connection_errors": self.connection_errors,
            "write_errors": self.write_errors,
            "registers": self.register_values,
            "r_registers": self.r_register_values,
            "r_register_range": f"R{self.r_start_register}-R{self.r_start_register + self.r_register_count - 1}",
            "r_modbus_address_range": f"{self.r_modbus_start_address}-{self.r_modbus_start_address + self.r_register_count - 1}"
        }
        
        # 根據感測器類型加入相應信息
        info["sensor_type"] = self._sensor_type
        
        if self._sensor_type == 'temperature':
            info["temperature"] = self.output_temperature
            info["is_temperature_sensor"] = True
        elif self._sensor_type == 'pressure':
            info["pressure"] = self.output_pressure
            info["is_pressure_sensor"] = True
        elif self._sensor_type == 'flow':
            info["flow"] = self.output_flow
            info["is_flow_sensor"] = True
            
        return info
    
    def __del__(self):
        """析構函數 - 確保連接被正確關閉"""
        self._disconnect()
