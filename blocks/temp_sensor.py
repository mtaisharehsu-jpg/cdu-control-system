
from .base_block import BaseBlock
import ctypes
import logging

# 載入 C 語言函式庫
# 注意：路徑可能需要根據實際部署情況調整
import platform
import os

# 獲取當前腳本所在目錄的父目錄（項目根目錄）
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 根據作業系統選擇正確的庫文件
if platform.system() == "Windows":
    HAL_LIB_PATH = os.path.join(PROJECT_ROOT, 'hal', 'lib-cdu-hal.dll')
else:
    HAL_LIB_PATH = os.path.join(PROJECT_ROOT, 'hal', 'lib-cdu-hal.so')

try:
    c_lib = ctypes.CDLL(HAL_LIB_PATH)
    # 定義 C 函式的返回類型和參數類型
    c_lib.modbus_read_temperature.restype = ctypes.c_float
    c_lib.modbus_read_temperature.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_int]
    logging.info(f"Successfully loaded HAL library for TempSensorBlock from: {HAL_LIB_PATH}")
except OSError as e:
    logging.error(f"Error loading HAL library: {e}. Running in simulation mode.")
    c_lib = None

class TempSensorBlock(BaseBlock):
    def __init__(self, block_id, config):
        super().__init__(block_id, config)
        self.device = config.get('device', '/dev/ttyTHS1')
        self.modbus_address = config.get('modbus_address')
        self.register = config.get('register', 0) # 假設溫度讀數在 register 0
        
        # Output
        self.output_temperature = 0.0
        self.output_status = "Disabled"
        self.output_health = "OK"

    def update(self):
        try:
            if c_lib:
                # 將 Python 字串轉換為 C 的 char*
                c_device = self.device.encode('utf-8')

                # 呼叫 C 函式
                temp = c_lib.modbus_read_temperature(c_device, self.modbus_address, self.register)
                self.output_temperature = temp
                self.output_status = "Enabled"
                self.output_health = "OK"
            else:
                # 沒有 HAL 庫時，設定為 -1 表示無法讀取
                self.output_temperature = -1.0
                self.output_status = "Disabled"
                self.output_health = "Critical"

            # print(f"Block '{self.block_id}': Temperature updated to {self.output_temperature}°C")

        except Exception as e:
            self.output_health = "Critical"
            self.output_status = "Faulted"
            self.output_temperature = -1.0
            print(f"Error updating TempSensorBlock '{self.block_id}': {e}")

