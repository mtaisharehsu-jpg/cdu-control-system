
from .base_block import BaseBlock
import ctypes
import logging

# 載入 C 語言函式庫
import platform

# 根據作業系統選擇正確的庫文件
if platform.system() == "Windows":
    HAL_LIB_PATH = './hal/lib-cdu-hal.dll'
else:
    HAL_LIB_PATH = './hal/lib-cdu-hal.so'

try:
    c_lib = ctypes.CDLL(HAL_LIB_PATH)
    # 定義 C 函式的返回類型和參數類型
    c_lib.uart_read_di_pin.restype = ctypes.c_int
    c_lib.uart_read_di_pin.argtypes = [ctypes.c_char_p, ctypes.c_int]
    logging.info(f"Successfully loaded HAL library for LiquidLevelSensorBlock from: {HAL_LIB_PATH}")
except OSError as e:
    logging.error(f"Error loading HAL library: {e}. Running in simulation mode.")
    c_lib = None

class LiquidLevelSensorBlock(BaseBlock):
    def __init__(self, block_id, config):
        super().__init__(block_id, config)
        self.device = config.get('device', '/dev/ttyUSB0') # USB-to-UART 通常是 ttyUSBn
        self.pin_number = config.get('pin')
        
        # Output
        self.output_level_status = "Normal" # e.g., Normal, High, Low
        self.output_status = "Disabled"
        self.output_health = "OK"

    def update(self):
        try:
            if c_lib:
                c_device = self.device.encode('utf-8')
                pin_state = c_lib.uart_read_di_pin(c_device, self.pin_number)

                if pin_state == 1:
                    self.output_level_status = "High"
                elif pin_state == 0:
                    self.output_level_status = "Normal"
                else:
                    self.output_level_status = "Error"

                self.output_status = "Enabled"
                self.output_health = "OK"
            else:
                # 沒有 HAL 庫時，設定為 Error 表示無法讀取
                self.output_level_status = "Error"
                self.output_status = "Disabled"
                self.output_health = "Critical"

        except Exception as e:
            self.output_health = "Critical"
            self.output_status = "Faulted"
            self.output_level_status = "Error"
            print(f"Error updating LiquidLevelSensorBlock '{self.block_id}': {e}")

