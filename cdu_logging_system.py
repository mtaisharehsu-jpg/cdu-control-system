"""
CDU Comprehensive Logging System
綜合日誌管理系統 - 基於 CDU200KW 實際操作手冊
支援多種日誌類型和輪換機制
"""

import os
import json
import gzip
import shutil
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import logging.handlers
from pathlib import Path

class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class LogType(Enum):
    SYSTEM = "system_log"
    TRAP = "trap_log"
    EVENT = "event_log"
    CONTROL = "control_log"
    ACCESS = "access_log"
    API = "api_log"
    SENSOR = "sensor_log"
    PLC = "plc_log"
    ERROR = "error_log"
    SECURITY = "security_log"

@dataclass
class LogEntry:
    """日誌條目類"""
    timestamp: datetime
    log_type: LogType
    level: LogLevel
    component: str
    message: str
    details: Optional[Dict] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    source_ip: Optional[str] = None

class LogRotationHandler:
    """日誌輪換處理器"""
    
    def __init__(self, base_path: str, max_size_mb: int = 10, max_files: int = 10):
        self.base_path = Path(base_path)
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.max_files = max_files
        self.base_path.mkdir(parents=True, exist_ok=True)
        
    def rotate_if_needed(self, log_file: Path) -> bool:
        """如需要則執行日誌輪換"""
        if not log_file.exists():
            return False
            
        if log_file.stat().st_size >= self.max_size_bytes:
            self._rotate_file(log_file)
            return True
        return False
        
    def _rotate_file(self, log_file: Path):
        """執行日誌檔案輪換"""
        base_name = log_file.stem
        extension = log_file.suffix
        
        # 移動現有編號檔案
        for i in range(self.max_files - 1, 0, -1):
            old_file = log_file.parent / f"{base_name}.{i}{extension}.gz"
            new_file = log_file.parent / f"{base_name}.{i+1}{extension}.gz"
            
            if old_file.exists():
                if new_file.exists():
                    new_file.unlink()
                old_file.rename(new_file)
        
        # 壓縮當前檔案
        compressed_file = log_file.parent / f"{base_name}.1{extension}.gz"
        with open(log_file, 'rb') as f_in:
            with gzip.open(compressed_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # 清空原檔案
        log_file.write_text('')
        
        # 刪除最舊的檔案
        oldest_file = log_file.parent / f"{base_name}.{self.max_files}{extension}.gz"
        if oldest_file.exists():
            oldest_file.unlink()

class CDULoggingSystem:
    """CDU 綜合日誌系統"""
    
    def __init__(self, config_file: str = "logging_config.json"):
        self.config = self._load_config(config_file)
        self.log_handlers: Dict[LogType, logging.Logger] = {}
        self.rotation_handlers: Dict[LogType, LogRotationHandler] = {}
        self.log_buffer: Dict[LogType, List[LogEntry]] = {}
        self.buffer_lock = threading.Lock()
        
        # 建立日誌目錄結構
        self._create_log_directories()
        
        # 初始化各種日誌處理器
        self._initialize_log_handlers()
        
        # 啟動定時任務
        self._start_scheduled_tasks()
        
    def _load_config(self, config_file: str) -> Dict:
        """載入日誌設定"""
        default_config = {
            "base_log_path": "logs",
            "rotation": {
                "max_size_mb": 10,
                "max_files": 10,
                "compress": True
            },
            "retention": {
                "system_log_days": 730,  # 2年
                "trap_log_days": 365,    # 1年
                "event_log_days": 365,   # 1年
                "control_log_days": 180, # 6個月
                "access_log_days": 90,   # 3個月
                "api_log_days": 30,      # 1個月
                "sensor_log_days": 90,   # 3個月
                "plc_log_days": 180,     # 6個月
                "error_log_days": 365,   # 1年
                "security_log_days": 1095 # 3年
            },
            "formats": {
                "system": "%(asctime)s - %(levelname)s - %(component)s - %(message)s",
                "trap": "%(asctime)s - TRAP - %(alarm_id)s - %(level)s - %(message)s",
                "event": "%(asctime)s - EVENT - %(user_id)s - %(action)s - %(details)s",
                "control": "%(asctime)s - CONTROL - %(parameter)s - %(old_value)s -> %(new_value)s",
                "access": "%(asctime)s - ACCESS - %(source_ip)s - %(user_id)s - %(endpoint)s - %(status)s",
                "api": "%(asctime)s - API - %(method)s - %(endpoint)s - %(response_time)s ms - %(status)s",
                "sensor": "%(asctime)s - SENSOR - %(sensor_id)s - %(value)s %(unit)s - %(status)s",
                "plc": "%(asctime)s - PLC - %(device_id)s - %(register)s - %(value)s",
                "error": "%(asctime)s - ERROR - %(component)s - %(error_code)s - %(message)s",
                "security": "%(asctime)s - SECURITY - %(event_type)s - %(user_id)s - %(details)s"
            },
            "buffer_settings": {
                "enabled": True,
                "max_entries": 1000,
                "flush_interval": 60
            },
            "compression": {
                "enabled": True,
                "algorithm": "gzip",
                "level": 6
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
            # 建立預設設定檔案
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)
            return default_config
            
    def _create_log_directories(self):
        """建立日誌目錄結構"""
        base_path = Path(self.config["base_log_path"])
        
        # 建立各日期的目錄結構
        today = datetime.now()
        date_str = today.strftime("%Y-%m-%d")
        
        directories = [
            base_path / date_str / "system",
            base_path / date_str / "api", 
            base_path / date_str / "sensors",
            base_path / date_str / "plc",
            base_path / date_str / "errors",
            base_path / date_str / "security",
            base_path / "archive"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            
    def _initialize_log_handlers(self):
        """初始化日誌處理器"""
        base_path = Path(self.config["base_log_path"])
        date_str = datetime.now().strftime("%Y-%m-%d")
        
        for log_type in LogType:
            # 建立 logger
            logger = logging.getLogger(f"cdu_{log_type.value}")
            logger.setLevel(logging.DEBUG)
            logger.handlers.clear()
            
            # 確定日誌檔案路徑
            if log_type in [LogType.SYSTEM, LogType.TRAP, LogType.EVENT, LogType.CONTROL]:
                log_file = base_path / date_str / "system" / f"{log_type.value}.dat"
            elif log_type in [LogType.API, LogType.ACCESS]:
                log_file = base_path / date_str / "api" / f"{log_type.value}.log"
            elif log_type == LogType.SENSOR:
                log_file = base_path / date_str / "sensors" / "sensor_data.log"
            elif log_type == LogType.PLC:
                log_file = base_path / date_str / "plc" / "plc_data.log"
            elif log_type == LogType.ERROR:
                log_file = base_path / date_str / "errors" / "error.log"
            elif log_type == LogType.SECURITY:
                log_file = base_path / date_str / "security" / "security.log"
            else:
                log_file = base_path / date_str / f"{log_type.value}.log"
            
            # 建立檔案 handler
            file_handler = logging.FileHandler(log_file, encoding='utf-8')
            
            # 設定格式
            format_str = self.config["formats"].get(log_type.value.split('_')[0], 
                                                   "%(asctime)s - %(levelname)s - %(message)s")
            formatter = logging.Formatter(format_str)
            file_handler.setFormatter(formatter)
            
            logger.addHandler(file_handler)
            self.log_handlers[log_type] = logger
            
            # 建立輪換處理器
            self.rotation_handlers[log_type] = LogRotationHandler(
                str(log_file.parent),
                self.config["rotation"]["max_size_mb"],
                self.config["rotation"]["max_files"]
            )
            
            # 初始化緩衝區
            self.log_buffer[log_type] = []
            
    def log_system_event(self, level: LogLevel, component: str, message: str, 
                        details: Optional[Dict] = None):
        """記錄系統事件"""
        entry = LogEntry(
            timestamp=datetime.now(),
            log_type=LogType.SYSTEM,
            level=level,
            component=component,
            message=message,
            details=details
        )
        self._write_log_entry(entry)
        
    def log_snmp_trap(self, alarm_id: str, level: str, message: str, details: Optional[Dict] = None):
        """記錄 SNMP Trap 事件"""
        entry = LogEntry(
            timestamp=datetime.now(),
            log_type=LogType.TRAP,
            level=LogLevel.WARNING if level == "warning" else LogLevel.ERROR,
            component="SNMP_TRAP",
            message=message,
            details={"alarm_id": alarm_id, "level": level, **(details or {})}
        )
        self._write_log_entry(entry)
        
    def log_user_event(self, user_id: str, action: str, details: Optional[Dict] = None,
                      session_id: Optional[str] = None, source_ip: Optional[str] = None):
        """記錄使用者事件"""
        entry = LogEntry(
            timestamp=datetime.now(),
            log_type=LogType.EVENT,
            level=LogLevel.INFO,
            component="USER_ACTION",
            message=f"User {user_id} performed {action}",
            details=details,
            user_id=user_id,
            session_id=session_id,
            source_ip=source_ip
        )
        self._write_log_entry(entry)
        
    def log_control_change(self, parameter: str, old_value: Any, new_value: Any,
                          user_id: Optional[str] = None):
        """記錄控制參數變更"""
        entry = LogEntry(
            timestamp=datetime.now(),
            log_type=LogType.CONTROL,
            level=LogLevel.INFO,
            component="CONTROL_CHANGE",
            message=f"Parameter {parameter} changed from {old_value} to {new_value}",
            details={
                "parameter": parameter,
                "old_value": str(old_value),
                "new_value": str(new_value)
            },
            user_id=user_id
        )
        self._write_log_entry(entry)
        
    def log_api_request(self, method: str, endpoint: str, status_code: int,
                       response_time: float, user_id: Optional[str] = None,
                       source_ip: Optional[str] = None):
        """記錄 API 請求"""
        entry = LogEntry(
            timestamp=datetime.now(),
            log_type=LogType.API,
            level=LogLevel.INFO if status_code < 400 else LogLevel.WARNING,
            component="API",
            message=f"{method} {endpoint} - {status_code}",
            details={
                "method": method,
                "endpoint": endpoint,
                "status_code": status_code,
                "response_time": response_time
            },
            user_id=user_id,
            source_ip=source_ip
        )
        self._write_log_entry(entry)
        
    def log_sensor_data(self, sensor_id: str, value: float, unit: str, status: str = "normal"):
        """記錄感測器數據"""
        entry = LogEntry(
            timestamp=datetime.now(),
            log_type=LogType.SENSOR,
            level=LogLevel.INFO if status == "normal" else LogLevel.WARNING,
            component="SENSOR",
            message=f"Sensor {sensor_id}: {value} {unit}",
            details={
                "sensor_id": sensor_id,
                "value": value,
                "unit": unit,
                "status": status
            }
        )
        self._write_log_entry(entry)
        
    def log_plc_data(self, device_id: str, register: str, value: Any):
        """記錄 PLC 數據"""
        entry = LogEntry(
            timestamp=datetime.now(),
            log_type=LogType.PLC,
            level=LogLevel.DEBUG,
            component="PLC",
            message=f"PLC {device_id} register {register}: {value}",
            details={
                "device_id": device_id,
                "register": register,
                "value": str(value)
            }
        )
        self._write_log_entry(entry)
        
    def log_error(self, component: str, error_code: str, message: str, 
                 details: Optional[Dict] = None):
        """記錄錯誤事件"""
        entry = LogEntry(
            timestamp=datetime.now(),
            log_type=LogType.ERROR,
            level=LogLevel.ERROR,
            component=component,
            message=message,
            details={"error_code": error_code, **(details or {})}
        )
        self._write_log_entry(entry)
        
    def log_security_event(self, event_type: str, user_id: Optional[str] = None,
                          details: Optional[Dict] = None, source_ip: Optional[str] = None):
        """記錄安全事件"""
        entry = LogEntry(
            timestamp=datetime.now(),
            log_type=LogType.SECURITY,
            level=LogLevel.WARNING,
            component="SECURITY",
            message=f"Security event: {event_type}",
            details={"event_type": event_type, **(details or {})},
            user_id=user_id,
            source_ip=source_ip
        )
        self._write_log_entry(entry)
        
    def _write_log_entry(self, entry: LogEntry):
        """寫入日誌條目"""
        if self.config["buffer_settings"]["enabled"]:
            self._buffer_log_entry(entry)
        else:
            self._direct_write_log_entry(entry)
            
    def _buffer_log_entry(self, entry: LogEntry):
        """緩衝日誌條目"""
        with self.buffer_lock:
            self.log_buffer[entry.log_type].append(entry)
            
            # 檢查是否需要刷新緩衝區
            if len(self.log_buffer[entry.log_type]) >= self.config["buffer_settings"]["max_entries"]:
                self._flush_buffer(entry.log_type)
                
    def _direct_write_log_entry(self, entry: LogEntry):
        """直接寫入日誌條目"""
        logger = self.log_handlers[entry.log_type]
        
        # 檢查是否需要輪換
        for handler in logger.handlers:
            if isinstance(handler, logging.FileHandler):
                log_file = Path(handler.baseFilename)
                self.rotation_handlers[entry.log_type].rotate_if_needed(log_file)
        
        # 寫入日誌
        log_level = getattr(logging, entry.level.value)
        extra_data = {
            'component': entry.component,
            'user_id': entry.user_id or 'system',
            'session_id': entry.session_id or '',
            'source_ip': entry.source_ip or ''
        }
        
        if entry.details:
            extra_data.update(entry.details)
            
        logger.log(log_level, entry.message, extra=extra_data)
        
    def _flush_buffer(self, log_type: LogType):
        """刷新緩衝區"""
        entries_to_flush = self.log_buffer[log_type].copy()
        self.log_buffer[log_type].clear()
        
        for entry in entries_to_flush:
            self._direct_write_log_entry(entry)
            
    def flush_all_buffers(self):
        """刷新所有緩衝區"""
        with self.buffer_lock:
            for log_type in LogType:
                if self.log_buffer[log_type]:
                    self._flush_buffer(log_type)
                    
    def _start_scheduled_tasks(self):
        """啟動定時任務"""
        def scheduled_flush():
            while True:
                time.sleep(self.config["buffer_settings"]["flush_interval"])
                self.flush_all_buffers()
                
        def daily_cleanup():
            while True:
                time.sleep(24 * 3600)  # 每日執行
                self._cleanup_old_logs()
                
        # 啟動定時任務線程
        flush_thread = threading.Thread(target=scheduled_flush, daemon=True)
        cleanup_thread = threading.Thread(target=daily_cleanup, daemon=True)
        
        flush_thread.start()
        cleanup_thread.start()
        
    def _cleanup_old_logs(self):
        """清理舊日誌檔案"""
        base_path = Path(self.config["base_log_path"])
        retention_config = self.config["retention"]
        
        for log_type in LogType:
            retention_days = retention_config.get(f"{log_type.value}_days", 90)
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            
            # 查找並刪除過期檔案
            for date_dir in base_path.iterdir():
                if date_dir.is_dir() and date_dir.name != "archive":
                    try:
                        dir_date = datetime.strptime(date_dir.name, "%Y-%m-%d")
                        if dir_date < cutoff_date:
                            # 移動到歸檔目錄而不是直接刪除
                            archive_dir = base_path / "archive" / date_dir.name
                            if not archive_dir.exists():
                                shutil.move(str(date_dir), str(archive_dir))
                    except ValueError:
                        continue  # 忽略非日期格式的目錄
                        
    def get_log_statistics(self) -> Dict:
        """取得日誌統計資訊"""
        stats = {
            "log_types": {},
            "total_entries": 0,
            "buffer_status": {},
            "disk_usage": {}
        }
        
        base_path = Path(self.config["base_log_path"])
        
        # 統計各類型日誌
        for log_type in LogType:
            type_stats = {
                "files_count": 0,
                "total_size": 0,
                "latest_entry": None
            }
            
            # 掃描日誌檔案
            for file_path in base_path.rglob(f"*{log_type.value}*"):
                if file_path.is_file():
                    type_stats["files_count"] += 1
                    type_stats["total_size"] += file_path.stat().st_size
                    
            stats["log_types"][log_type.value] = type_stats
            
        # 緩衝區狀態
        with self.buffer_lock:
            for log_type in LogType:
                stats["buffer_status"][log_type.value] = len(self.log_buffer[log_type])
                
        return stats
        
    def export_logs(self, start_date: datetime, end_date: datetime, 
                   log_types: List[LogType], output_file: str):
        """匯出日誌"""
        export_data = []
        base_path = Path(self.config["base_log_path"])
        
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            date_dir = base_path / date_str
            
            if date_dir.exists():
                for log_type in log_types:
                    log_files = list(date_dir.rglob(f"*{log_type.value}*"))
                    for log_file in log_files:
                        try:
                            with open(log_file, 'r', encoding='utf-8') as f:
                                lines = f.readlines()
                                for line in lines:
                                    export_data.append({
                                        "date": date_str,
                                        "log_type": log_type.value,
                                        "content": line.strip()
                                    })
                        except Exception as e:
                            print(f"Error reading {log_file}: {e}")
                            
            current_date += timedelta(days=1)
            
        # 寫入匯出檔案
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            
        return len(export_data)

# 全域日誌系統實例
_logging_system = None

def get_logging_system() -> CDULoggingSystem:
    """取得全域日誌系統實例"""
    global _logging_system
    if _logging_system is None:
        _logging_system = CDULoggingSystem()
    return _logging_system

# 便利函數
def log_system(level: str, component: str, message: str, **kwargs):
    """記錄系統日誌的便利函數"""
    logging_system = get_logging_system()
    log_level = LogLevel(level.upper())
    logging_system.log_system_event(log_level, component, message, kwargs)

def log_api(method: str, endpoint: str, status: int, response_time: float, **kwargs):
    """記錄 API 日誌的便利函數"""
    logging_system = get_logging_system()
    logging_system.log_api_request(method, endpoint, status, response_time, **kwargs)

# 示例使用
if __name__ == "__main__":
    # 建立日誌系統
    logging_system = CDULoggingSystem()
    
    # 記錄各種類型的日誌
    logging_system.log_system_event(LogLevel.INFO, "ENGINE", "System started successfully")
    logging_system.log_snmp_trap("T001", "warning", "Temperature warning triggered")
    logging_system.log_user_event("admin", "login", {"success": True}, source_ip="192.168.1.100")
    logging_system.log_control_change("pump_speed", 1200, 1500, user_id="operator")
    logging_system.log_api_request("GET", "/api/status", 200, 45.2, user_id="admin")
    logging_system.log_sensor_data("temp_01", 25.5, "°C")
    logging_system.log_plc_data("PLC01", "holding_register_1", 1234)
    logging_system.log_error("MODBUS", "COMM_ERROR", "Communication timeout")
    logging_system.log_security_event("failed_login", user_id="unknown", source_ip="192.168.1.200")
    
    # 強制刷新緩衝區
    logging_system.flush_all_buffers()
    
    # 取得統計資訊
    stats = logging_system.get_log_statistics()
    print("Log Statistics:")
    print(json.dumps(stats, indent=2, default=str))