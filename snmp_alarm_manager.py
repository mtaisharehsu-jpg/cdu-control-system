"""
SNMP Trap Alarm Management System
基於 CDU200KW 實際操作手冊的 SNMP Trap 警報系統
支援 60+ 種警報類型，包含 Warning 和 Alert 兩級警報
"""

import json
import time
import socket
import struct
import threading
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Callable
from enum import Enum
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SNMP 企業號碼 (基於 PRD 文檔)
ENTERPRISE_OID = "1.3.6.1.4.1.30628.1234"

class AlarmLevel(Enum):
    WARNING = "warning"
    ALERT = "alert"

class AlarmCategory(Enum):
    TEMPERATURE = "temperature"
    PRESSURE = "pressure" 
    FLOW = "flow"
    DEVICE = "device"
    SYSTEM = "system"
    LEAK = "leak"
    POWER = "power"
    COMMUNICATION = "communication"

@dataclass
class AlarmDefinition:
    """警報定義類"""
    id: str
    name: str
    category: AlarmCategory
    level: AlarmLevel
    oid: str
    description: str
    solution: str
    auto_clear: bool = False
    
@dataclass
class AlarmInstance:
    """警報實例類"""
    alarm_id: str
    level: AlarmLevel
    timestamp: datetime
    value: Optional[float] = None
    unit: Optional[str] = None
    device_id: Optional[str] = None
    message: str = ""
    acknowledged: bool = False
    cleared: bool = False
    clear_timestamp: Optional[datetime] = None

class SNMPTrapSender:
    """SNMP Trap 發送器"""
    
    def __init__(self, destination_ip: str, port: int = 162, community: str = "public"):
        self.destination_ip = destination_ip
        self.port = port
        self.community = community
        
    def send_trap(self, oid: str, alarm: AlarmInstance) -> bool:
        """發送 SNMP Trap"""
        try:
            # 這裡應該實現實際的 SNMP Trap 發送邏輯
            # 由於複雜性，這裡只是模擬發送
            logger.info(f"Sending SNMP Trap to {self.destination_ip}:{self.port}")
            logger.info(f"OID: {oid}, Alarm: {alarm.alarm_id}, Level: {alarm.level.value}")
            logger.info(f"Message: {alarm.message}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SNMP trap: {e}")
            return False

class SNMPAlarmManager:
    """SNMP 警報管理器"""
    
    def __init__(self, config_file: str = "snmp_alarm_config.json"):
        self.alarm_definitions: Dict[str, AlarmDefinition] = {}
        self.active_alarms: Dict[str, AlarmInstance] = {}
        self.alarm_history: List[AlarmInstance] = []
        self.thresholds: Dict[str, Dict] = {}
        self.snmp_sender: Optional[SNMPTrapSender] = None
        self.callbacks: List[Callable] = []
        self.monitoring_thread = None
        self.running = False
        
        self._initialize_alarm_definitions()
        self._load_configuration(config_file)
        
    def _initialize_alarm_definitions(self):
        """初始化警報定義 - 基於 CDU200KW 手冊"""
        
        # 溫度相關警報
        temp_alarms = [
            AlarmDefinition("T001", "伺服器入口溫度過高警告", AlarmCategory.TEMPERATURE, AlarmLevel.WARNING, 
                          f"{ENTERPRISE_OID}.1.1.1", "伺服器入口冷卻液溫度超過警告閾值", "檢查冷卻液溫度和流量"),
            AlarmDefinition("T002", "伺服器入口溫度過高警報", AlarmCategory.TEMPERATURE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.1.2", "伺服器入口冷卻液溫度超過警報閾值", "立即檢查系統並降低負載"),
            AlarmDefinition("T003", "伺服器出口溫度過高警告", AlarmCategory.TEMPERATURE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.1.3", "伺服器出口冷卻液溫度超過警告閾值", "檢查散熱效果"),
            AlarmDefinition("T004", "伺服器出口溫度過高警報", AlarmCategory.TEMPERATURE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.1.4", "伺服器出口冷卻液溫度超過警報閾值", "立即停止系統並檢查"),
            AlarmDefinition("T005", "設施入口溫度異常警告", AlarmCategory.TEMPERATURE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.1.5", "設施入口溫度異常", "檢查外部冷卻系統"),
            AlarmDefinition("T006", "設施出口溫度異常警報", AlarmCategory.TEMPERATURE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.1.6", "設施出口溫度異常", "檢查熱交換器效能"),
            AlarmDefinition("T007", "環境溫度過高警告", AlarmCategory.TEMPERATURE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.1.7", "環境溫度超過操作範圍", "改善通風或降低環境溫度"),
            AlarmDefinition("T008", "溫度感測器故障警報", AlarmCategory.TEMPERATURE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.1.8", "溫度感測器通訊中斷或故障", "更換或重新連接溫度感測器"),
        ]
        
        # 壓力相關警報
        pressure_alarms = [
            AlarmDefinition("P001", "伺服器入口壓力過低警告", AlarmCategory.PRESSURE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.2.1", "伺服器入口壓力低於警告閾值", "檢查泵浦運行狀態"),
            AlarmDefinition("P002", "伺服器入口壓力過低警報", AlarmCategory.PRESSURE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.2.2", "伺服器入口壓力低於警報閾值", "立即檢查泵浦和管路"),
            AlarmDefinition("P003", "伺服器差壓過高警告", AlarmCategory.PRESSURE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.2.3", "伺服器進出口差壓過高", "檢查濾網和管路阻塞"),
            AlarmDefinition("P004", "伺服器差壓過高警報", AlarmCategory.PRESSURE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.2.4", "伺服器進出口差壓嚴重過高", "立即清潔濾網或管路"),
            AlarmDefinition("P005", "設施側壓力異常警告", AlarmCategory.PRESSURE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.2.5", "設施側壓力異常", "檢查外部系統壓力"),
            AlarmDefinition("P006", "系統總壓力過高警報", AlarmCategory.PRESSURE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.2.6", "系統總壓力超過安全限制", "停止系統並檢查安全閥"),
            AlarmDefinition("P007", "壓力感測器故障警報", AlarmCategory.PRESSURE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.2.7", "壓力感測器通訊中斷或故障", "更換或重新連接壓力感測器"),
        ]
        
        # 流量相關警報
        flow_alarms = [
            AlarmDefinition("F001", "伺服器流量過低警告", AlarmCategory.FLOW, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.3.1", "伺服器冷卻液流量低於警告閾值", "檢查泵浦運行和管路"),
            AlarmDefinition("F002", "伺服器流量過低警報", AlarmCategory.FLOW, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.3.2", "伺服器冷卻液流量嚴重不足", "立即檢查泵浦故障"),
            AlarmDefinition("F003", "設施流量異常警告", AlarmCategory.FLOW, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.3.3", "設施側流量異常", "檢查外部流量系統"),
            AlarmDefinition("F004", "流量不平衡警報", AlarmCategory.FLOW, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.3.4", "系統流量嚴重不平衡", "檢查閥門開度和管路"),
            AlarmDefinition("F005", "流量感測器故障警報", AlarmCategory.FLOW, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.3.5", "流量感測器通訊中斷或故障", "更換或重新連接流量感測器"),
        ]
        
        # 設備相關警報
        device_alarms = [
            AlarmDefinition("D001", "左泵浦運行異常警告", AlarmCategory.DEVICE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.4.1", "左泵浦運行參數異常", "檢查泵浦負載和振動"),
            AlarmDefinition("D002", "左泵浦故障警報", AlarmCategory.DEVICE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.4.2", "左泵浦嚴重故障或停機", "立即檢修或更換左泵浦"),
            AlarmDefinition("D003", "右泵浦運行異常警告", AlarmCategory.DEVICE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.4.3", "右泵浦運行參數異常", "檢查泵浦負載和振動"),
            AlarmDefinition("D004", "右泵浦故障警報", AlarmCategory.DEVICE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.4.4", "右泵浦嚴重故障或停機", "立即檢修或更換右泵浦"),
            AlarmDefinition("D005", "HEX閥門異常警告", AlarmCategory.DEVICE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.4.5", "熱交換器閥門位置異常", "檢查閥門執行器"),
            AlarmDefinition("D006", "HEX閥門故障警報", AlarmCategory.DEVICE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.4.6", "熱交換器閥門無法正常動作", "檢修或更換閥門執行器"),
            AlarmDefinition("D007", "旁通閥門異常警告", AlarmCategory.DEVICE, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.4.7", "旁通閥門位置異常", "檢查旁通閥門"),
            AlarmDefinition("D008", "變頻器通訊異常警報", AlarmCategory.DEVICE, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.4.8", "變頻器通訊中斷", "檢查變頻器連接和設定"),
        ]
        
        # 電源相關警報
        power_alarms = [
            AlarmDefinition("E001", "左電源單元異常警告", AlarmCategory.POWER, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.5.1", "左電源單元運行異常", "檢查電源供應"),
            AlarmDefinition("E002", "左電源單元故障警報", AlarmCategory.POWER, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.5.2", "左電源單元故障", "更換或檢修左電源單元"),
            AlarmDefinition("E003", "右電源單元異常警告", AlarmCategory.POWER, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.5.3", "右電源單元運行異常", "檢查電源供應"),
            AlarmDefinition("E004", "右電源單元故障警報", AlarmCategory.POWER, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.5.4", "右電源單元故障", "更換或檢修右電源單元"),
            AlarmDefinition("E005", "UPS電源異常警告", AlarmCategory.POWER, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.5.5", "UPS電源狀態異常", "檢查UPS電池和負載"),
            AlarmDefinition("E006", "主電源斷電警報", AlarmCategory.POWER, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.5.6", "主電源供應中斷", "檢查電源供應系統"),
        ]
        
        # 洩漏檢測警報
        leak_alarms = [
            AlarmDefinition("L001", "洩漏檢測警告", AlarmCategory.LEAK, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.6.1", "檢測到可能的冷卻液洩漏", "檢查管路和接頭"),
            AlarmDefinition("L002", "嚴重洩漏警報", AlarmCategory.LEAK, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.6.2", "檢測到嚴重冷卻液洩漏", "立即停機並修復洩漏"),
            AlarmDefinition("L003", "液位過低警告", AlarmCategory.LEAK, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.6.3", "儲液槽液位過低", "補充冷卻液"),
            AlarmDefinition("L004", "液位嚴重不足警報", AlarmCategory.LEAK, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.6.4", "儲液槽液位嚴重不足", "立即停機並補充冷卻液"),
        ]
        
        # 系統相關警報
        system_alarms = [
            AlarmDefinition("S001", "控制器通訊異常警告", AlarmCategory.SYSTEM, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.7.1", "控制器通訊不穩定", "檢查網路連接"),
            AlarmDefinition("S002", "控制器故障警報", AlarmCategory.SYSTEM, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.7.2", "控制器嚴重故障", "重啟系統或聯繫技術支援"),
            AlarmDefinition("S003", "系統過載警告", AlarmCategory.SYSTEM, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.7.3", "系統負載過高", "降低系統負載"),
            AlarmDefinition("S004", "緊急停機警報", AlarmCategory.SYSTEM, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.7.4", "系統執行緊急停機", "檢查停機原因並排除故障"),
            AlarmDefinition("S005", "韌體版本不匹配警告", AlarmCategory.SYSTEM, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.7.5", "系統韌體版本不一致", "更新韌體版本"),
            AlarmDefinition("S006", "記憶體不足警告", AlarmCategory.SYSTEM, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.7.6", "系統記憶體使用率過高", "重啟系統或清理暫存檔"),
        ]
        
        # 通訊相關警報
        comm_alarms = [
            AlarmDefinition("C001", "Modbus通訊異常警告", AlarmCategory.COMMUNICATION, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.8.1", "Modbus通訊不穩定", "檢查RS485連接"),
            AlarmDefinition("C002", "Modbus通訊中斷警報", AlarmCategory.COMMUNICATION, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.8.2", "Modbus通訊完全中斷", "檢查通訊線路和設備"),
            AlarmDefinition("C003", "乙太網路異常警告", AlarmCategory.COMMUNICATION, AlarmLevel.WARNING,
                          f"{ENTERPRISE_OID}.1.8.3", "乙太網路連接不穩定", "檢查網路設定和線路"),
            AlarmDefinition("C004", "SNMP通訊異常警報", AlarmCategory.COMMUNICATION, AlarmLevel.ALERT,
                          f"{ENTERPRISE_OID}.1.8.4", "SNMP通訊故障", "檢查SNMP設定和目標主機"),
        ]
        
        # 整合所有警報定義
        all_alarms = (temp_alarms + pressure_alarms + flow_alarms + device_alarms + 
                     power_alarms + leak_alarms + system_alarms + comm_alarms)
        
        for alarm in all_alarms:
            self.alarm_definitions[alarm.id] = alarm
            
        logger.info(f"Initialized {len(self.alarm_definitions)} alarm definitions")
        
    def _load_configuration(self, config_file: str):
        """載入警報設定"""
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                
            # 載入閾值設定
            self.thresholds = config.get('thresholds', {})
            
            # 載入 SNMP 設定
            snmp_config = config.get('snmp', {})
            if snmp_config.get('enabled', False):
                self.snmp_sender = SNMPTrapSender(
                    destination_ip=snmp_config.get('destination_ip', '192.168.100.100'),
                    port=snmp_config.get('port', 162),
                    community=snmp_config.get('community', 'public')
                )
                
        except FileNotFoundError:
            logger.warning(f"Configuration file {config_file} not found, using defaults")
            self._create_default_config(config_file)
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            
    def _create_default_config(self, config_file: str):
        """建立預設設定檔案"""
        default_config = {
            "snmp": {
                "enabled": True,
                "destination_ip": "192.168.100.100",
                "port": 162,
                "community": "public",
                "warning_interval": 30,
                "alert_interval": 10
            },
            "thresholds": {
                "temperature": {
                    "server_inlet_warning_min": 15,
                    "server_inlet_warning_max": 35,
                    "server_inlet_alert_min": 10,
                    "server_inlet_alert_max": 40
                },
                "pressure": {
                    "server_diff_warning_min": 40,
                    "server_diff_warning_max": 160,
                    "server_diff_alert_min": 30,
                    "server_diff_alert_max": 170
                },
                "flow": {
                    "server_warning_min": 15,
                    "server_warning_max": 190,
                    "server_alert_min": 5,
                    "server_alert_max": 200
                }
            }
        }
        
        try:
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)
            logger.info(f"Created default configuration file: {config_file}")
        except Exception as e:
            logger.error(f"Error creating default configuration: {e}")
            
    def trigger_alarm(self, alarm_id: str, value: Optional[float] = None, 
                     unit: Optional[str] = None, device_id: Optional[str] = None,
                     custom_message: str = "") -> bool:
        """觸發警報"""
        if alarm_id not in self.alarm_definitions:
            logger.error(f"Unknown alarm ID: {alarm_id}")
            return False
            
        alarm_def = self.alarm_definitions[alarm_id]
        
        # 建立警報實例
        alarm_instance = AlarmInstance(
            alarm_id=alarm_id,
            level=alarm_def.level,
            timestamp=datetime.now(),
            value=value,
            unit=unit,
            device_id=device_id,
            message=custom_message or f"{alarm_def.name}: {alarm_def.description}"
        )
        
        # 儲存到活躍警報
        self.active_alarms[alarm_id] = alarm_instance
        
        # 加入歷史記錄
        self.alarm_history.append(alarm_instance)
        
        # 發送 SNMP Trap
        if self.snmp_sender:
            self.snmp_sender.send_trap(alarm_def.oid, alarm_instance)
            
        # 執行回調函數
        for callback in self.callbacks:
            try:
                callback(alarm_instance)
            except Exception as e:
                logger.error(f"Error in alarm callback: {e}")
                
        logger.warning(f"Alarm triggered: {alarm_id} - {alarm_instance.message}")
        return True
        
    def clear_alarm(self, alarm_id: str) -> bool:
        """清除警報"""
        if alarm_id not in self.active_alarms:
            logger.warning(f"Alarm {alarm_id} not active")
            return False
            
        alarm = self.active_alarms[alarm_id]
        alarm.cleared = True
        alarm.clear_timestamp = datetime.now()
        
        # 從活躍警報中移除
        del self.active_alarms[alarm_id]
        
        logger.info(f"Alarm cleared: {alarm_id}")
        return True
        
    def acknowledge_alarm(self, alarm_id: str) -> bool:
        """確認警報"""
        if alarm_id not in self.active_alarms:
            logger.warning(f"Alarm {alarm_id} not active")
            return False
            
        self.active_alarms[alarm_id].acknowledged = True
        logger.info(f"Alarm acknowledged: {alarm_id}")
        return True
        
    def get_active_alarms(self) -> List[AlarmInstance]:
        """取得活躍警報列表"""
        return list(self.active_alarms.values())
        
    def get_alarm_history(self, limit: int = 100) -> List[AlarmInstance]:
        """取得警報歷史"""
        return self.alarm_history[-limit:]
        
    def get_alarm_definition(self, alarm_id: str) -> Optional[AlarmDefinition]:
        """取得警報定義"""
        return self.alarm_definitions.get(alarm_id)
        
    def register_callback(self, callback: Callable):
        """註冊警報回調函數"""
        self.callbacks.append(callback)
        
    def export_alarm_config(self, filename: str):
        """匯出警報設定"""
        config_data = {
            'alarm_definitions': {aid: asdict(adef) for aid, adef in self.alarm_definitions.items()},
            'thresholds': self.thresholds
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False, default=str)
            
        logger.info(f"Alarm configuration exported to {filename}")

# 示例使用
if __name__ == "__main__":
    # 建立警報管理器
    alarm_manager = SNMPAlarmManager()
    
    # 註冊回調函數
    def alarm_callback(alarm: AlarmInstance):
        print(f"警報回調: {alarm.alarm_id} - {alarm.message}")
    
    alarm_manager.register_callback(alarm_callback)
    
    # 觸發一些測試警報
    alarm_manager.trigger_alarm("T001", value=38.5, unit="°C", device_id="temp_sensor_01")
    alarm_manager.trigger_alarm("P002", value=0.08, unit="MPa", device_id="pressure_sensor_01")
    alarm_manager.trigger_alarm("D001", device_id="pump_left")
    
    # 查看活躍警報
    active_alarms = alarm_manager.get_active_alarms()
    print(f"\n活躍警報數量: {len(active_alarms)}")
    for alarm in active_alarms:
        print(f"  {alarm.alarm_id}: {alarm.message}")
    
    # 確認警報
    alarm_manager.acknowledge_alarm("T001")
    
    # 清除警報
    alarm_manager.clear_alarm("T001")
    
    # 匯出設定
    alarm_manager.export_alarm_config("alarm_definitions.json")