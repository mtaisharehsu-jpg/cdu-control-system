import ctypes
import logging
from .base_block import BaseBlock

# 載入 C 語言的 HAL 共享函式庫
# 這是 Python 與 C 溝通的橋樑
import platform
import os

# 根據作業系統選擇正確的庫文件
if platform.system() == "Windows":
    HAL_LIB_PATH = './hal/lib-cdu-hal.dll'
else:
    HAL_LIB_PATH = './lib-cdu-hal.so'

try:
    hal_lib = ctypes.CDLL(HAL_LIB_PATH)
    # 定義 C 函式的返回類型和參數類型
    hal_lib.hal_modbus_connect.restype = ctypes.POINTER(ctypes.c_void_p)
    hal_lib.hal_modbus_connect.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_int]
    hal_lib.hal_modbus_disconnect.argtypes = [ctypes.POINTER(ctypes.c_void_p)]
    hal_lib.hal_modbus_write_register.restype = ctypes.c_int
    hal_lib.hal_modbus_write_register.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_int, ctypes.c_int]
    hal_lib.hal_modbus_read_registers.restype = ctypes.c_int
    hal_lib.hal_modbus_read_registers.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_int, ctypes.c_int, ctypes.POINTER(ctypes.c_uint16)]
    logging.info(f"Successfully loaded HAL library from: {HAL_LIB_PATH}")
except OSError as e:
    logging.error(f"Error loading HAL library: {e}. Running in simulation mode.")
    # 在非 Jetson 環境下進行開發時，可以進行模擬
    hal_lib = None

class PumpVFDBlock(BaseBlock):
    """
    控制變頻器 (VFD) 的功能區塊。
    """
    def __init__(self, block_id, config):
        super().__init__(block_id, config)
        
        # 從設定檔讀取 Modbus 參數
        self.modbus_addr = self.config['modbus_address']
        self.device_port = self.config.get('device', '/dev/ttyTHS1') # RS-485 端口
        self.baud_rate = self.config.get('baud', 9600)
        self.ctx = None # Modbus context
        
        # 定義 Inputs (可由 API 或其他 Block 寫入)
        self.input_target_rpm = 0.0
        self.input_enable = True

        # 定義 Outputs (供 API 或其他 Block 讀取)
        self.output_current_rpm = 0.0
        self.output_power_watts = 0.0
        self.output_status = "Disabled"
        self.output_health = "OK"
        
        # 初始化與硬體的連接
        if hal_lib:
            self.ctx = hal_lib.hal_modbus_connect(self.device_port.encode('utf-8'), self.baud_rate, self.modbus_addr)
            if not self.ctx:
                self.output_health = "Error"
                self.output_status = "Communication Failed"
                logging.error(f"Failed to connect to Modbus device for block '{self.id}'")

    def update(self):
        """在每個控制迴圈中被調用"""
        if not self.ctx or not hal_lib:
            # 若無硬體連接，則進入模擬模式
            self._simulate_pump_operation()
            return

        # 1. 執行控制邏輯 (寫入)
        try:
            if self.input_enable:
                target_val = int(self.input_target_rpm)
                # 假設目標轉速暫存器位址是 0x1000
                hal_lib.hal_modbus_write_register(self.ctx, 0x1000, target_val)
                self.output_status = "Enabled"
            else:
                hal_lib.hal_modbus_write_register(self.ctx, 0x1000, 0)
                self.output_status = "Disabled"
        except Exception as e:
            logging.error(f"Error writing to VFD '{self.id}': {e}")
            self.output_health = "Error"

        # 2. 讀取硬體狀態 (讀取)
        try:
            # 假設實際轉速暫存器位址是 0x2000
            read_buffer = (ctypes.c_uint16 * 1)()
            if hal_lib.hal_modbus_read_registers(self.ctx, 0x2000, 1, read_buffer) == 0:
                self.output_current_rpm = float(read_buffer[0])
                self.output_health = "OK"
            else:
                self.output_health = "Error"
                # 在讀取失敗時，將讀數歸零以表示狀態未知
                self.output_current_rpm = 0.0
        except Exception as e:
            logging.error(f"Error reading from VFD '{self.id}': {e}")
            self.output_health = "Error"

    def _simulate_pump_operation(self):
        """模擬泵浦運行，用於沒有硬體時的測試"""
        import random

        if self.input_enable and self.input_target_rpm > 0:
            # 模擬泵浦逐漸達到目標轉速
            diff = self.input_target_rpm - self.output_current_rpm
            if abs(diff) > 1:
                # 每次更新接近目標轉速一點
                self.output_current_rpm += diff * 0.1 + random.uniform(-5, 5)
            else:
                self.output_current_rpm = self.input_target_rpm + random.uniform(-10, 10)

            # 確保轉速不為負數
            self.output_current_rpm = max(0, self.output_current_rpm)
            self.output_status = "Enabled"

            # 模擬功率消耗（簡單的線性關係）
            self.output_power_watts = self.output_current_rpm * 0.5 + random.uniform(-50, 50)
        else:
            # 泵浦停止
            self.output_current_rpm = 0.0
            self.output_power_watts = 0.0
            self.output_status = "Disabled"

        self.output_health = "OK"

    def __del__(self):
        """物件被銷毀時，確保斷開 Modbus 連接，釋放資源"""
        if self.ctx and hal_lib:
            logging.info(f"Disconnecting Modbus for block '{self.id}'")
            hal_lib.hal_modbus_disconnect(self.ctx)