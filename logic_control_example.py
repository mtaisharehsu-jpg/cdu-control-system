# logic_control_example.py

import time
import random

# 假設這些類別來自您專案中的 'blocks' 目錄
# 我們先定義模擬的類別，以便此範例可以獨立執行
# 在您的實際應用中，您應該直接從 blocks 模組匯入
# from blocks.liquid_level_sensor import LiquidLevelSensor
# from blocks.pump_vfd import PumpVFD

# --- Mock/模擬類別定義 (用於獨立展示) ---
class BaseBlock:
    """模擬基礎塊"""
    def __init__(self, name):
        self.name = name
        print(f"初始化塊: {self.__class__.__name__})")

    def execute(self):
        raise NotImplementedError

class LiquidLevelSensor(BaseBlock):
    """模擬液位感測器"""
    def __init__(self, name):
        super().__init__(name)
        # 從一個隨機的初始液位開始
        self._current_level = random.uniform(10.0, 90.0)

    @property
    def level(self):
        """獲取當前液位讀數"""
        return self._current_level

    def simulate_level_change(self, pump_is_on):
        """根據水泵狀態模擬液位變化"""
        if pump_is_on:
            # 如果水泵開啟，液位緩慢上升
            self._current_level += random.uniform(0.5, 1.5)
        else:
            # 如果水泵關閉，液位緩慢下降 (模擬用水)
            self._current_level -= random.uniform(0.2, 0.8)
        
        # 確保液位在 0-100 的範圍內
        self._current_level = max(0.0, min(100.0, self._current_level))

class PumpVFD(BaseBlock):
    """模擬變頻水泵"""
    def __init__(self, name):
        super().__init__(name)
        self.is_running = False

    def start(self):
        """啟動水泵"""
        if not self.is_running:
            print(f"[{self.name}] >>> 啟動水泵")
            self.is_running = True

    def stop(self):
        """停止水泵"""
        if self.is_running:
            print(f"[{self.name}] <<< 停止水泵")
            self.is_running = False

    @property
    def status(self):
        """獲取水泵狀態"""
        return "運轉中" if self.is_running else "已停止"

# --- 邏輯控制主程式 ---
def main_control_loop():
    """主控制迴圈"""
    print("\n--- 開始執行水箱液位自動控制模擬 ---")

    # --- 1. 初始化功能塊 ---
    level_sensor = LiquidLevelSensor(name="Tank1_LevelSensor")
    pump = PumpVFD(name="Main_FillPump")

    # --- 2. 設定控制參數 ---
    LOW_LEVEL = 20.0  # %
    HIGH_LEVEL = 80.0 # %

    print(f"控制設定: 低液位觸發點 = {LOW_LEVEL}%, 高液位觸發點 = {HIGH_LEVEL}%\n")
    time.sleep(2)

    # --- 3. 執行控制迴圈 ---
    try:
        while True:
            # 讀取感測器數值
            current_level = level_sensor.level

            # 核心控制邏輯
            if current_level < LOW_LEVEL:
                pump.start()
            elif current_level > HIGH_LEVEL:
                pump.stop()

            # 輸出當前狀態
            print(f"時間: {time.strftime('%H:%M:%S')} | "
                  f"目前液位: {current_level:.2f}% | "
                  f"水泵狀態: {pump.status}")

            # 模擬下一次的液位變化
            level_sensor.simulate_level_change(pump.is_running)

            # 等待下一個週期
            time.sleep(1.5)

    except KeyboardInterrupt:
        print("\n--- 模擬結束 ---")
        pump.stop()

if __name__ == "__main__":
    main_control_loop()
