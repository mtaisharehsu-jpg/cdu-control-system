"""
Touchscreen Interface Support for CDU Control System
觸控螢幕介面支援 - 基於 CDU200KW 前面板觸控操作
"""

import asyncio
import json
import websockets
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import logging
import threading
import time

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TouchEventType(Enum):
    TAP = "tap"
    DOUBLE_TAP = "double_tap"
    LONG_PRESS = "long_press"
    SWIPE = "swipe"
    PINCH = "pinch"
    ROTATE = "rotate"

class ScreenOrientation(Enum):
    PORTRAIT = "portrait"
    LANDSCAPE = "landscape"

class InterfaceMode(Enum):
    TOUCH_OPTIMIZED = "touch_optimized"
    DESKTOP = "desktop"
    HYBRID = "hybrid"

@dataclass
class TouchEvent:
    """觸控事件資料類"""
    event_type: TouchEventType
    timestamp: datetime
    x: float
    y: float
    pressure: float = 0.0
    duration: float = 0.0
    distance: float = 0.0
    angle: float = 0.0
    element_id: Optional[str] = None
    additional_data: Optional[Dict] = None

@dataclass
class TouchPoint:
    """觸控點資料類"""
    id: str
    x: float
    y: float
    pressure: float
    timestamp: datetime

@dataclass
class ScreenConfiguration:
    """螢幕配置資料類"""
    width: int
    height: int
    dpi: int
    orientation: ScreenOrientation
    brightness: int  # 0-100
    timeout: int  # 螢幕超時時間(秒)
    touch_sensitivity: int  # 1-10
    enable_gestures: bool
    calibrated: bool

class TouchscreenCalibrator:
    """觸控螢幕校準器"""
    
    def __init__(self):
        self.calibration_points = [
            (50, 50),    # 左上
            (950, 50),   # 右上
            (500, 300),  # 中心
            (50, 550),   # 左下
            (950, 550)   # 右下
        ]
        self.calibration_data = []
        self.is_calibrating = False
        self.current_point = 0
        
    def start_calibration(self) -> Dict[str, Any]:
        """開始觸控校準"""
        self.is_calibrating = True
        self.current_point = 0
        self.calibration_data = []
        
        return {
            "status": "calibration_started",
            "total_points": len(self.calibration_points),
            "current_point": self.current_point,
            "target_position": self.calibration_points[self.current_point]
        }
    
    def add_calibration_point(self, x: float, y: float) -> Dict[str, Any]:
        """添加校準點"""
        if not self.is_calibrating:
            return {"status": "error", "message": "Calibration not started"}
        
        target_x, target_y = self.calibration_points[self.current_point]
        
        self.calibration_data.append({
            "target": (target_x, target_y),
            "actual": (x, y),
            "offset": (x - target_x, y - target_y)
        })
        
        self.current_point += 1
        
        if self.current_point >= len(self.calibration_points):
            # 校準完成
            return self.complete_calibration()
        else:
            return {
                "status": "calibration_in_progress",
                "current_point": self.current_point,
                "target_position": self.calibration_points[self.current_point]
            }
    
    def complete_calibration(self) -> Dict[str, Any]:
        """完成校準"""
        self.is_calibrating = False
        
        # 計算校準矩陣
        calibration_matrix = self._calculate_calibration_matrix()
        
        return {
            "status": "calibration_completed",
            "calibration_matrix": calibration_matrix,
            "accuracy": self._calculate_accuracy()
        }
    
    def _calculate_calibration_matrix(self) -> Dict[str, float]:
        """計算校準矩陣"""
        # 簡化的線性校準矩陣計算
        total_offset_x = sum(point["offset"][0] for point in self.calibration_data)
        total_offset_y = sum(point["offset"][1] for point in self.calibration_data)
        
        avg_offset_x = total_offset_x / len(self.calibration_data)
        avg_offset_y = total_offset_y / len(self.calibration_data)
        
        return {
            "offset_x": avg_offset_x,
            "offset_y": avg_offset_y,
            "scale_x": 1.0,
            "scale_y": 1.0
        }
    
    def _calculate_accuracy(self) -> float:
        """計算校準精度"""
        if not self.calibration_data:
            return 0.0
        
        total_error = 0.0
        for point in self.calibration_data:
            offset_x, offset_y = point["offset"]
            error = (offset_x ** 2 + offset_y ** 2) ** 0.5
            total_error += error
        
        avg_error = total_error / len(self.calibration_data)
        accuracy = max(0, 100 - avg_error / 5)  # 簡化的精度計算
        
        return round(accuracy, 2)

class GestureRecognizer:
    """手勢識別器"""
    
    def __init__(self):
        self.active_touches: Dict[str, TouchPoint] = {}
        self.gesture_callbacks: Dict[TouchEventType, List[Callable]] = {}
        self.min_swipe_distance = 50
        self.long_press_duration = 1000  # 毫秒
        self.double_tap_interval = 300  # 毫秒
        self.last_tap_time = 0
        
    def register_gesture_callback(self, gesture_type: TouchEventType, callback: Callable):
        """註冊手勢回調函數"""
        if gesture_type not in self.gesture_callbacks:
            self.gesture_callbacks[gesture_type] = []
        self.gesture_callbacks[gesture_type].append(callback)
    
    def process_touch_down(self, x: float, y: float, pressure: float = 1.0) -> Optional[TouchEvent]:
        """處理觸控按下事件"""
        touch_id = f"touch_{len(self.active_touches)}"
        touch_point = TouchPoint(
            id=touch_id,
            x=x,
            y=y,
            pressure=pressure,
            timestamp=datetime.now()
        )
        
        self.active_touches[touch_id] = touch_point
        
        # 檢查是否為雙擊
        current_time = time.time() * 1000
        if current_time - self.last_tap_time < self.double_tap_interval:
            return TouchEvent(
                event_type=TouchEventType.DOUBLE_TAP,
                timestamp=datetime.now(),
                x=x,
                y=y,
                pressure=pressure
            )
        
        return None
    
    def process_touch_up(self, x: float, y: float) -> Optional[TouchEvent]:
        """處理觸控抬起事件"""
        if not self.active_touches:
            return None
        
        # 找到最近的觸控點
        touch_id = min(self.active_touches.keys(), 
                      key=lambda tid: ((self.active_touches[tid].x - x) ** 2 + 
                                     (self.active_touches[tid].y - y) ** 2) ** 0.5)
        
        touch_point = self.active_touches.pop(touch_id)
        
        # 計算觸控持續時間
        duration = (datetime.now() - touch_point.timestamp).total_seconds() * 1000
        
        # 判斷手勢類型
        if duration > self.long_press_duration:
            return TouchEvent(
                event_type=TouchEventType.LONG_PRESS,
                timestamp=datetime.now(),
                x=x,
                y=y,
                pressure=touch_point.pressure,
                duration=duration
            )
        
        # 檢查是否為滑動
        distance = ((x - touch_point.x) ** 2 + (y - touch_point.y) ** 2) ** 0.5
        if distance > self.min_swipe_distance:
            angle = self._calculate_angle(touch_point.x, touch_point.y, x, y)
            return TouchEvent(
                event_type=TouchEventType.SWIPE,
                timestamp=datetime.now(),
                x=x,
                y=y,
                pressure=touch_point.pressure,
                distance=distance,
                angle=angle
            )
        
        # 普通點擊
        self.last_tap_time = time.time() * 1000
        return TouchEvent(
            event_type=TouchEventType.TAP,
            timestamp=datetime.now(),
            x=x,
            y=y,
            pressure=touch_point.pressure,
            duration=duration
        )
    
    def _calculate_angle(self, x1: float, y1: float, x2: float, y2: float) -> float:
        """計算滑動角度"""
        import math
        dx = x2 - x1
        dy = y2 - y1
        angle = math.atan2(dy, dx) * 180 / math.pi
        return angle
    
    def trigger_gesture_callbacks(self, event: TouchEvent):
        """觸發手勢回調函數"""
        callbacks = self.gesture_callbacks.get(event.event_type, [])
        for callback in callbacks:
            try:
                callback(event)
            except Exception as e:
                logger.error(f"Error in gesture callback: {e}")

class TouchscreenInterface:
    """觸控螢幕介面主類"""
    
    def __init__(self, config_file: str = "touchscreen_config.json"):
        self.config = self._load_config(config_file)
        self.screen_config = ScreenConfiguration(**self.config["screen"])
        self.calibrator = TouchscreenCalibrator()
        self.gesture_recognizer = GestureRecognizer()
        self.websocket_server = None
        self.connected_clients: List = []
        self.interface_mode = InterfaceMode.TOUCH_OPTIMIZED
        
        # 註冊基本手勢
        self._register_basic_gestures()
        
    def _load_config(self, config_file: str) -> Dict:
        """載入觸控配置"""
        default_config = {
            "screen": {
                "width": 1024,
                "height": 600,
                "dpi": 96,
                "orientation": "landscape",
                "brightness": 80,
                "timeout": 300,
                "touch_sensitivity": 7,
                "enable_gestures": True,
                "calibrated": False
            },
            "websocket": {
                "host": "0.0.0.0",
                "port": 8765,
                "enabled": True
            },
            "touch_settings": {
                "min_swipe_distance": 50,
                "long_press_duration": 1000,
                "double_tap_interval": 300,
                "multi_touch_enabled": True
            },
            "ui_adaptations": {
                "button_min_size": 44,  # 最小觸控目標大小(px)
                "spacing_multiplier": 1.5,
                "font_size_multiplier": 1.2,
                "enable_haptic_feedback": True
            }
        }
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            # 合併預設設定
            for key, value in default_config.items():
                if key not in config:
                    config[key] = value
            return config
        except FileNotFoundError:
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)
            return default_config
    
    def _register_basic_gestures(self):
        """註冊基本手勢處理"""
        def handle_tap(event: TouchEvent):
            logger.info(f"Tap detected at ({event.x}, {event.y})")
            self._broadcast_to_clients({
                "type": "touch_event",
                "event": "tap",
                "x": event.x,
                "y": event.y,
                "timestamp": event.timestamp.isoformat()
            })
        
        def handle_swipe(event: TouchEvent):
            direction = self._get_swipe_direction(event.angle)
            logger.info(f"Swipe {direction} detected, distance: {event.distance:.1f}px")
            self._broadcast_to_clients({
                "type": "touch_event",
                "event": "swipe",
                "direction": direction,
                "distance": event.distance,
                "angle": event.angle,
                "timestamp": event.timestamp.isoformat()
            })
        
        def handle_long_press(event: TouchEvent):
            logger.info(f"Long press detected at ({event.x}, {event.y}), duration: {event.duration:.0f}ms")
            self._broadcast_to_clients({
                "type": "touch_event",
                "event": "long_press",
                "x": event.x,
                "y": event.y,
                "duration": event.duration,
                "timestamp": event.timestamp.isoformat()
            })
        
        self.gesture_recognizer.register_gesture_callback(TouchEventType.TAP, handle_tap)
        self.gesture_recognizer.register_gesture_callback(TouchEventType.SWIPE, handle_swipe)
        self.gesture_recognizer.register_gesture_callback(TouchEventType.LONG_PRESS, handle_long_press)
    
    def _get_swipe_direction(self, angle: float) -> str:
        """根據角度判斷滑動方向"""
        if -45 <= angle <= 45:
            return "right"
        elif 45 < angle <= 135:
            return "down"
        elif 135 < angle <= 180 or -180 <= angle < -135:
            return "left"
        else:
            return "up"
    
    def start_websocket_server(self):
        """啟動 WebSocket 服務器"""
        if not self.config["websocket"]["enabled"]:
            return
        
        async def handle_client(websocket, path):
            logger.info(f"New touchscreen client connected: {websocket.remote_address}")
            self.connected_clients.append(websocket)
            
            try:
                # 發送初始化資訊
                await websocket.send(json.dumps({
                    "type": "init",
                    "screen_config": asdict(self.screen_config),
                    "interface_mode": self.interface_mode.value
                }))
                
                async for message in websocket:
                    await self._handle_client_message(websocket, message)
                    
            except websockets.exceptions.ConnectionClosed:
                logger.info("Touchscreen client disconnected")
            finally:
                if websocket in self.connected_clients:
                    self.connected_clients.remove(websocket)
        
        def start_server():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            start_server_coro = websockets.serve(
                handle_client,
                self.config["websocket"]["host"],
                self.config["websocket"]["port"]
            )
            
            self.websocket_server = loop.run_until_complete(start_server_coro)
            logger.info(f"Touchscreen WebSocket server started on {self.config['websocket']['host']}:{self.config['websocket']['port']}")
            
            loop.run_forever()
        
        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()
    
    async def _handle_client_message(self, websocket, message: str):
        """處理客戶端訊息"""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            
            if message_type == "touch_down":
                event = self.gesture_recognizer.process_touch_down(
                    data["x"], data["y"], data.get("pressure", 1.0)
                )
                if event:
                    self.gesture_recognizer.trigger_gesture_callbacks(event)
            
            elif message_type == "touch_up":
                event = self.gesture_recognizer.process_touch_up(data["x"], data["y"])
                if event:
                    self.gesture_recognizer.trigger_gesture_callbacks(event)
            
            elif message_type == "calibration_point":
                result = self.calibrator.add_calibration_point(data["x"], data["y"])
                await websocket.send(json.dumps({
                    "type": "calibration_response",
                    "result": result
                }))
            
            elif message_type == "start_calibration":
                result = self.calibrator.start_calibration()
                await websocket.send(json.dumps({
                    "type": "calibration_response",
                    "result": result
                }))
                
            elif message_type == "screen_config_update":
                await self._update_screen_config(data["config"])
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON message from touchscreen client")
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
    
    async def _update_screen_config(self, config_data: Dict):
        """更新螢幕配置"""
        for key, value in config_data.items():
            if hasattr(self.screen_config, key):
                setattr(self.screen_config, key, value)
        
        # 廣播配置更新
        await self._broadcast_to_clients({
            "type": "screen_config_updated",
            "config": asdict(self.screen_config)
        })
    
    async def _broadcast_to_clients(self, message: Dict):
        """廣播訊息給所有連接的客戶端"""
        if not self.connected_clients:
            return
        
        message_str = json.dumps(message, default=str)
        disconnected_clients = []
        
        for client in self.connected_clients:
            try:
                await client.send(message_str)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.append(client)
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                disconnected_clients.append(client)
        
        # 移除斷開的客戶端
        for client in disconnected_clients:
            self.connected_clients.remove(client)
    
    def set_interface_mode(self, mode: InterfaceMode):
        """設定介面模式"""
        self.interface_mode = mode
        
        # 廣播模式變更
        asyncio.create_task(self._broadcast_to_clients({
            "type": "interface_mode_changed",
            "mode": mode.value
        }))
        
        logger.info(f"Interface mode changed to: {mode.value}")
    
    def adjust_brightness(self, brightness: int):
        """調整螢幕亮度"""
        if 0 <= brightness <= 100:
            self.screen_config.brightness = brightness
            
            # 這裡應該調用實際的硬體API來調整亮度
            logger.info(f"Screen brightness adjusted to: {brightness}%")
            
            # 廣播亮度變更
            asyncio.create_task(self._broadcast_to_clients({
                "type": "brightness_changed",
                "brightness": brightness
            }))
        else:
            logger.warning(f"Invalid brightness value: {brightness}")
    
    def set_screen_timeout(self, timeout: int):
        """設定螢幕超時時間"""
        if timeout > 0:
            self.screen_config.timeout = timeout
            logger.info(f"Screen timeout set to: {timeout} seconds")
            
            # 廣播超時設定變更
            asyncio.create_task(self._broadcast_to_clients({
                "type": "timeout_changed",
                "timeout": timeout
            }))
    
    def get_touch_statistics(self) -> Dict[str, Any]:
        """取得觸控統計資訊"""
        return {
            "connected_clients": len(self.connected_clients),
            "screen_config": asdict(self.screen_config),
            "interface_mode": self.interface_mode.value,
            "calibration_status": {
                "is_calibrating": self.calibrator.is_calibrating,
                "calibrated": self.screen_config.calibrated
            },
            "gesture_settings": {
                "min_swipe_distance": self.gesture_recognizer.min_swipe_distance,
                "long_press_duration": self.gesture_recognizer.long_press_duration,
                "double_tap_interval": self.gesture_recognizer.double_tap_interval
            }
        }
    
    def export_touch_config(self, filename: str):
        """匯出觸控配置"""
        config_data = {
            "screen_config": asdict(self.screen_config),
            "interface_mode": self.interface_mode.value,
            "gesture_settings": {
                "min_swipe_distance": self.gesture_recognizer.min_swipe_distance,
                "long_press_duration": self.gesture_recognizer.long_press_duration,
                "double_tap_interval": self.gesture_recognizer.double_tap_interval
            },
            "exported_at": datetime.now().isoformat()
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Touch configuration exported to: {filename}")

# 全域觸控介面實例
_touchscreen_interface = None

def get_touchscreen_interface() -> TouchscreenInterface:
    """取得全域觸控介面實例"""
    global _touchscreen_interface
    if _touchscreen_interface is None:
        _touchscreen_interface = TouchscreenInterface()
    return _touchscreen_interface

# 示例使用
if __name__ == "__main__":
    # 建立觸控介面
    touchscreen = TouchscreenInterface()
    
    # 啟動 WebSocket 服務器
    touchscreen.start_websocket_server()
    
    # 註冊自訂手勢
    def custom_swipe_handler(event: TouchEvent):
        print(f"Custom swipe handler: {event.distance:.1f}px")
    
    touchscreen.gesture_recognizer.register_gesture_callback(
        TouchEventType.SWIPE, custom_swipe_handler
    )
    
    # 設定介面模式
    touchscreen.set_interface_mode(InterfaceMode.TOUCH_OPTIMIZED)
    
    # 調整螢幕設定
    touchscreen.adjust_brightness(70)
    touchscreen.set_screen_timeout(600)
    
    # 模擬觸控事件
    import time
    time.sleep(2)
    
    # 模擬點擊
    event = touchscreen.gesture_recognizer.process_touch_down(100, 200)
    if event:
        touchscreen.gesture_recognizer.trigger_gesture_callbacks(event)
    
    time.sleep(0.1)
    
    event = touchscreen.gesture_recognizer.process_touch_up(100, 200)
    if event:
        touchscreen.gesture_recognizer.trigger_gesture_callbacks(event)
    
    # 取得統計資訊
    stats = touchscreen.get_touch_statistics()
    print("Touch Statistics:")
    print(json.dumps(stats, indent=2, ensure_ascii=False, default=str))
    
    # 匯出配置
    touchscreen.export_touch_config("touchscreen_export.json")
    
    print("Touchscreen interface is running. Press Ctrl+C to stop.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down touchscreen interface...")
        logger.info("Touchscreen interface stopped")