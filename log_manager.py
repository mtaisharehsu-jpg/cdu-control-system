#!/usr/bin/env python3
"""
CDU系統日誌管理器
提供每日分開的日誌記錄功能
"""

import os
import logging
import logging.handlers
from datetime import datetime
from pathlib import Path
import json
import threading
import time

class DailyLogManager:
    """每日日誌管理器"""
    
    def __init__(self, base_log_dir="log"):
        self.base_log_dir = Path(base_log_dir)
        self.current_date = None
        self.current_log_dir = None
        self.loggers = {}
        self.lock = threading.Lock()
        
        # 確保基礎日誌目錄存在
        self.base_log_dir.mkdir(exist_ok=True)
        
        # 初始化當日日誌目錄
        self._setup_daily_log_dir()
        
        # 設置系統日誌記錄器
        self._setup_system_loggers()
    
    def _setup_daily_log_dir(self):
        """設置當日日誌目錄"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        if self.current_date != today:
            self.current_date = today
            self.current_log_dir = self.base_log_dir / today
            self.current_log_dir.mkdir(exist_ok=True)
            
            # 創建子目錄
            (self.current_log_dir / "system").mkdir(exist_ok=True)
            (self.current_log_dir / "sensors").mkdir(exist_ok=True)
            (self.current_log_dir / "plc").mkdir(exist_ok=True)
            (self.current_log_dir / "api").mkdir(exist_ok=True)
            (self.current_log_dir / "errors").mkdir(exist_ok=True)
    
    def _setup_system_loggers(self):
        """設置系統日誌記錄器"""
        # 系統主日誌
        self.system_logger = self._create_logger(
            "system", 
            "system/cdu_system.log",
            level=logging.INFO
        )
        
        # 感測器日誌
        self.sensor_logger = self._create_logger(
            "sensors",
            "sensors/sensor_data.log",
            level=logging.INFO
        )
        
        # PLC日誌
        self.plc_logger = self._create_logger(
            "plc",
            "plc/plc_data.log", 
            level=logging.INFO
        )
        
        # API日誌
        self.api_logger = self._create_logger(
            "api",
            "api/api_requests.log",
            level=logging.INFO
        )
        
        # 錯誤日誌
        self.error_logger = self._create_logger(
            "errors",
            "errors/error.log",
            level=logging.ERROR
        )
    
    def _create_logger(self, name, log_file, level=logging.INFO):
        """創建日誌記錄器"""
        logger = logging.getLogger(f"cdu_{name}")
        logger.setLevel(level)
        
        # 清除現有的處理器
        logger.handlers.clear()
        
        # 文件處理器
        log_path = self.current_log_dir / log_file
        file_handler = logging.FileHandler(log_path, encoding='utf-8')
        
        # 控制台處理器（僅錯誤日誌）
        if name == "errors":
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.ERROR)
            console_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
        
        # 文件格式器
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
        
        return logger
    
    def check_date_change(self):
        """檢查日期是否變更，如果是則創建新的日誌目錄"""
        with self.lock:
            today = datetime.now().strftime("%Y-%m-%d")
            if self.current_date != today:
                self._setup_daily_log_dir()
                self._setup_system_loggers()
    
    def log_system_event(self, message, level="INFO"):
        """記錄系統事件"""
        self.check_date_change()
        if level.upper() == "ERROR":
            self.system_logger.error(message)
            self.error_logger.error(f"SYSTEM: {message}")
        elif level.upper() == "WARNING":
            self.system_logger.warning(message)
        else:
            self.system_logger.info(message)
    
    def log_sensor_data(self, sensor_id, sensor_type, value, units, status="OK"):
        """記錄感測器數據"""
        self.check_date_change()
        message = f"Sensor: {sensor_id} | Type: {sensor_type} | Value: {value} {units} | Status: {status}"
        self.sensor_logger.info(message)
    
    def log_plc_data(self, plc_id, registers, connection_status="Connected"):
        """記錄PLC數據"""
        self.check_date_change()
        register_data = json.dumps(registers, ensure_ascii=False)
        message = f"PLC: {plc_id} | Status: {connection_status} | Registers: {register_data}"
        self.plc_logger.info(message)
    
    def log_api_request(self, method, endpoint, status_code, response_time=None):
        """記錄API請求"""
        self.check_date_change()
        time_info = f" | Response Time: {response_time:.3f}s" if response_time else ""
        message = f"API: {method} {endpoint} | Status: {status_code}{time_info}"
        self.api_logger.info(message)
    
    def log_error(self, error_type, message, details=None):
        """記錄錯誤"""
        self.check_date_change()
        error_msg = f"Error Type: {error_type} | Message: {message}"
        if details:
            error_msg += f" | Details: {details}"
        self.error_logger.error(error_msg)
    
    def create_daily_summary(self):
        """創建每日摘要"""
        self.check_date_change()
        summary_file = self.current_log_dir / "daily_summary.json"
        
        summary = {
            "date": self.current_date,
            "generated_at": datetime.now().isoformat(),
            "log_files": {
                "system": "system/cdu_system.log",
                "sensors": "sensors/sensor_data.log", 
                "plc": "plc/plc_data.log",
                "api": "api/api_requests.log",
                "errors": "errors/error.log"
            },
            "directories": [
                "system", "sensors", "plc", "api", "errors"
            ]
        }
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
    
    def get_current_log_dir(self):
        """獲取當前日誌目錄"""
        self.check_date_change()
        return self.current_log_dir
    
    def cleanup_old_logs(self, keep_days=30):
        """清理舊日誌（保留指定天數）"""
        import shutil
        from datetime import timedelta
        
        cutoff_date = datetime.now() - timedelta(days=keep_days)
        
        for log_dir in self.base_log_dir.iterdir():
            if log_dir.is_dir() and log_dir.name.count('-') == 2:  # 日期格式目錄
                try:
                    dir_date = datetime.strptime(log_dir.name, "%Y-%m-%d")
                    if dir_date < cutoff_date:
                        shutil.rmtree(log_dir)
                        print(f"Cleaned up old log directory: {log_dir}")
                except ValueError:
                    continue  # 跳過非日期格式的目錄

# 全局日誌管理器實例
log_manager = DailyLogManager()

def get_log_manager():
    """獲取日誌管理器實例"""
    return log_manager
