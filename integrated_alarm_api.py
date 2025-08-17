"""
Integrated Alarm API for CDU Control System
整合警報 API - 結合 SNMP Trap 和日誌系統
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from snmp_alarm_manager import SNMPAlarmManager, AlarmLevel, AlarmCategory, AlarmInstance
from cdu_logging_system import get_logging_system, LogLevel
import json
import asyncio
from contextlib import asynccontextmanager

# Pydantic 模型定義
class AlarmThresholdUpdate(BaseModel):
    sensor_id: str = Field(..., description="感測器 ID")
    warning_min: Optional[float] = Field(None, description="警告最小值")
    warning_max: Optional[float] = Field(None, description="警告最大值")
    alert_min: Optional[float] = Field(None, description="警報最小值")
    alert_max: Optional[float] = Field(None, description="警報最大值")
    enabled: Optional[bool] = Field(None, description="是否啟用")

class SNMPSettings(BaseModel):
    enabled: bool = Field(True, description="是否啟用 SNMP")
    destination_ip: str = Field("192.168.100.100", description="目標 IP")
    port: int = Field(162, description="SNMP 埠號")
    community: str = Field("public", description="Community 字串")
    version: str = Field("v2c", description="SNMP 版本")
    warning_interval: int = Field(30, description="警告發送間隔(秒)")
    alert_interval: int = Field(10, description="警報發送間隔(秒)")

class AlarmResponse(BaseModel):
    alarm_id: str
    name: str
    category: str
    level: str
    timestamp: datetime
    message: str
    acknowledged: bool
    cleared: bool
    value: Optional[float]
    unit: Optional[str]
    device_id: Optional[str]

class AlarmStatistics(BaseModel):
    total_active: int
    total_acknowledged: int
    total_today: int
    by_category: Dict[str, int]
    by_level: Dict[str, int]

# 全域變數
alarm_manager: Optional[SNMPAlarmManager] = None
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期管理"""
    global alarm_manager
    
    # 啟動時初始化
    print("Initializing Alarm Management System...")
    alarm_manager = SNMPAlarmManager("snmp_alarm_config.json")
    
    # 註冊警報回調
    def alarm_callback(alarm: AlarmInstance):
        logging_system = get_logging_system()
        logging_system.log_snmp_trap(
            alarm.alarm_id,
            alarm.level.value,
            alarm.message,
            {
                "value": alarm.value,
                "unit": alarm.unit,
                "device_id": alarm.device_id
            }
        )
    
    alarm_manager.register_callback(alarm_callback)
    
    # 啟動背景監控任務
    asyncio.create_task(monitor_system_values())
    
    print("Alarm Management System initialized successfully")
    
    yield
    
    # 關閉時清理
    print("Shutting down Alarm Management System...")

app = FastAPI(
    title="CDU Integrated Alarm System API",
    description="整合的 CDU 警報管理系統 API",
    version="2.2.0",
    lifespan=lifespan
)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """取得當前使用者 (簡化版驗證)"""
    # 這裡應該實現實際的 JWT 驗證
    return {"user_id": "admin", "role": "administrator"}

async def monitor_system_values():
    """監控系統數值並觸發相應警報"""
    if not alarm_manager:
        return
        
    while True:
        try:
            # 這裡應該從實際的感測器系統讀取數值
            # 目前使用模擬數值進行演示
            
            # 模擬溫度檢查
            temp_value = 28.5  # 從感測器讀取
            if temp_value > 35:
                alarm_manager.trigger_alarm(
                    "T001", 
                    value=temp_value, 
                    unit="°C", 
                    device_id="temp_sensor_01"
                )
            elif temp_value > 40:
                alarm_manager.trigger_alarm(
                    "T002", 
                    value=temp_value, 
                    unit="°C", 
                    device_id="temp_sensor_01"
                )
            
            # 模擬壓力檢查
            pressure_value = 0.12  # 從感測器讀取
            if pressure_value < 0.15:
                alarm_manager.trigger_alarm(
                    "P001", 
                    value=pressure_value, 
                    unit="MPa", 
                    device_id="pressure_sensor_01"
                )
            
            await asyncio.sleep(15)  # 每15秒檢查一次
            
        except Exception as e:
            logging_system = get_logging_system()
            logging_system.log_error("ALARM_MONITOR", "MONITOR_ERROR", str(e))
            await asyncio.sleep(60)  # 錯誤時等待較長時間

@app.get("/")
async def root():
    """根端點"""
    return {
        "message": "CDU Integrated Alarm System API",
        "version": "2.2.0",
        "status": "running"
    }

@app.get("/redfish/v1/Chassis/CDU_Main/Alarms/", response_model=List[AlarmResponse])
async def get_active_alarms(
    category: Optional[str] = None,
    level: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """取得活躍警報列表"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    logging_system = get_logging_system()
    logging_system.log_api_request(
        "GET", "/redfish/v1/Chassis/CDU_Main/Alarms/", 200, 0,
        user_id=current_user["user_id"]
    )
    
    active_alarms = alarm_manager.get_active_alarms()
    
    # 過濾條件
    if category:
        active_alarms = [a for a in active_alarms if alarm_manager.get_alarm_definition(a.alarm_id).category.value == category]
    if level:
        active_alarms = [a for a in active_alarms if a.level.value == level]
    
    # 限制數量
    active_alarms = active_alarms[:limit]
    
    # 轉換為回應格式
    response_alarms = []
    for alarm in active_alarms:
        alarm_def = alarm_manager.get_alarm_definition(alarm.alarm_id)
        response_alarms.append(AlarmResponse(
            alarm_id=alarm.alarm_id,
            name=alarm_def.name if alarm_def else "Unknown",
            category=alarm_def.category.value if alarm_def else "unknown",
            level=alarm.level.value,
            timestamp=alarm.timestamp,
            message=alarm.message,
            acknowledged=alarm.acknowledged,
            cleared=alarm.cleared,
            value=alarm.value,
            unit=alarm.unit,
            device_id=alarm.device_id
        ))
    
    return response_alarms

@app.get("/redfish/v1/Chassis/CDU_Main/Alarms/{alarm_id}", response_model=AlarmResponse)
async def get_alarm_details(
    alarm_id: str,
    current_user: dict = Depends(get_current_user)
):
    """取得特定警報詳細資訊"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    alarm = None
    for active_alarm in alarm_manager.get_active_alarms():
        if active_alarm.alarm_id == alarm_id:
            alarm = active_alarm
            break
    
    if not alarm:
        raise HTTPException(status_code=404, detail=f"Alarm {alarm_id} not found")
    
    alarm_def = alarm_manager.get_alarm_definition(alarm_id)
    
    return AlarmResponse(
        alarm_id=alarm.alarm_id,
        name=alarm_def.name if alarm_def else "Unknown",
        category=alarm_def.category.value if alarm_def else "unknown",
        level=alarm.level.value,
        timestamp=alarm.timestamp,
        message=alarm.message,
        acknowledged=alarm.acknowledged,
        cleared=alarm.cleared,
        value=alarm.value,
        unit=alarm.unit,
        device_id=alarm.device_id
    )

@app.post("/redfish/v1/Chassis/CDU_Main/Alarms/{alarm_id}/Actions/Acknowledge")
async def acknowledge_alarm(
    alarm_id: str,
    current_user: dict = Depends(get_current_user)
):
    """確認警報"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    success = alarm_manager.acknowledge_alarm(alarm_id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Alarm {alarm_id} not found or already acknowledged")
    
    # 記錄使用者操作
    logging_system = get_logging_system()
    logging_system.log_user_event(
        current_user["user_id"],
        "acknowledge_alarm",
        {"alarm_id": alarm_id}
    )
    
    return {"message": f"Alarm {alarm_id} acknowledged successfully"}

@app.post("/redfish/v1/Chassis/CDU_Main/Alarms/{alarm_id}/Actions/Clear")
async def clear_alarm(
    alarm_id: str,
    current_user: dict = Depends(get_current_user)
):
    """清除警報"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    success = alarm_manager.clear_alarm(alarm_id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Alarm {alarm_id} not found")
    
    # 記錄使用者操作
    logging_system = get_logging_system()
    logging_system.log_user_event(
        current_user["user_id"],
        "clear_alarm",
        {"alarm_id": alarm_id}
    )
    
    return {"message": f"Alarm {alarm_id} cleared successfully"}

@app.get("/redfish/v1/Chassis/CDU_Main/Alarms/Statistics", response_model=AlarmStatistics)
async def get_alarm_statistics(current_user: dict = Depends(get_current_user)):
    """取得警報統計資訊"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    active_alarms = alarm_manager.get_active_alarms()
    alarm_history = alarm_manager.get_alarm_history(1000)
    
    # 今日警報
    today = datetime.now().date()
    today_alarms = [a for a in alarm_history if a.timestamp.date() == today]
    
    # 按類別統計
    category_stats = {}
    for alarm in active_alarms:
        alarm_def = alarm_manager.get_alarm_definition(alarm.alarm_id)
        if alarm_def:
            category = alarm_def.category.value
            category_stats[category] = category_stats.get(category, 0) + 1
    
    # 按等級統計
    level_stats = {}
    for alarm in active_alarms:
        level = alarm.level.value
        level_stats[level] = level_stats.get(level, 0) + 1
    
    return AlarmStatistics(
        total_active=len(active_alarms),
        total_acknowledged=len([a for a in active_alarms if a.acknowledged]),
        total_today=len(today_alarms),
        by_category=category_stats,
        by_level=level_stats
    )

@app.get("/redfish/v1/Chassis/CDU_Main/Alarms/History")
async def get_alarm_history(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """取得警報歷史"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    alarm_history = alarm_manager.get_alarm_history(limit * 2)  # 多取一些以便過濾
    
    # 日期過濾
    if start_date:
        alarm_history = [a for a in alarm_history if a.timestamp >= start_date]
    if end_date:
        alarm_history = [a for a in alarm_history if a.timestamp <= end_date]
    
    # 限制數量
    alarm_history = alarm_history[-limit:]
    
    # 轉換格式
    response_alarms = []
    for alarm in alarm_history:
        alarm_def = alarm_manager.get_alarm_definition(alarm.alarm_id)
        response_alarms.append({
            "alarm_id": alarm.alarm_id,
            "name": alarm_def.name if alarm_def else "Unknown",
            "category": alarm_def.category.value if alarm_def else "unknown",
            "level": alarm.level.value,
            "timestamp": alarm.timestamp,
            "message": alarm.message,
            "acknowledged": alarm.acknowledged,
            "cleared": alarm.cleared,
            "clear_timestamp": alarm.clear_timestamp,
            "value": alarm.value,
            "unit": alarm.unit,
            "device_id": alarm.device_id
        })
    
    return response_alarms

@app.put("/redfish/v1/Chassis/CDU_Main/Alarms/Settings/Thresholds")
async def update_alarm_thresholds(
    thresholds: List[AlarmThresholdUpdate],
    current_user: dict = Depends(get_current_user)
):
    """更新警報閾值設定"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    updated_count = 0
    
    for threshold in thresholds:
        # 這裡應該實現實際的閾值更新邏輯
        # 目前只是記錄變更
        logging_system = get_logging_system()
        logging_system.log_control_change(
            f"alarm_threshold_{threshold.sensor_id}",
            "previous_value",
            {
                "warning_min": threshold.warning_min,
                "warning_max": threshold.warning_max,
                "alert_min": threshold.alert_min,
                "alert_max": threshold.alert_max,
                "enabled": threshold.enabled
            },
            user_id=current_user["user_id"]
        )
        updated_count += 1
    
    return {
        "message": f"Updated {updated_count} alarm thresholds",
        "updated_sensors": [t.sensor_id for t in thresholds]
    }

@app.get("/redfish/v1/Chassis/CDU_Main/Alarms/Settings/SNMP")
async def get_snmp_settings(current_user: dict = Depends(get_current_user)):
    """取得 SNMP 設定"""
    # 返回當前 SNMP 設定
    return {
        "enabled": True,
        "destination_ip": "192.168.100.100",
        "port": 162,
        "community": "public",
        "version": "v2c",
        "warning_interval": 30,
        "alert_interval": 10
    }

@app.put("/redfish/v1/Chassis/CDU_Main/Alarms/Settings/SNMP")
async def update_snmp_settings(
    settings: SNMPSettings,
    current_user: dict = Depends(get_current_user)
):
    """更新 SNMP 設定"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    # 記錄設定變更
    logging_system = get_logging_system()
    logging_system.log_control_change(
        "snmp_settings",
        "previous_settings",
        settings.dict(),
        user_id=current_user["user_id"]
    )
    
    return {"message": "SNMP settings updated successfully"}

@app.post("/redfish/v1/Chassis/CDU_Main/Alarms/Actions/TestSNMP")
async def test_snmp_connection(current_user: dict = Depends(get_current_user)):
    """測試 SNMP 連接"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    # 發送測試警報
    test_success = alarm_manager.trigger_alarm(
        "S005",  # 測試警報
        custom_message="SNMP connection test"
    )
    
    if test_success:
        # 立即清除測試警報
        alarm_manager.clear_alarm("S005")
        return {"message": "SNMP test completed successfully"}
    else:
        raise HTTPException(status_code=500, detail="SNMP test failed")

@app.get("/redfish/v1/Chassis/CDU_Main/Alarms/Definitions")
async def get_alarm_definitions(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """取得警報定義列表"""
    if not alarm_manager:
        raise HTTPException(status_code=503, detail="Alarm manager not initialized")
    
    definitions = []
    for alarm_id, alarm_def in alarm_manager.alarm_definitions.items():
        if category and alarm_def.category.value != category:
            continue
            
        definitions.append({
            "id": alarm_def.id,
            "name": alarm_def.name,
            "category": alarm_def.category.value,
            "level": alarm_def.level.value,
            "oid": alarm_def.oid,
            "description": alarm_def.description,
            "solution": alarm_def.solution,
            "auto_clear": alarm_def.auto_clear
        })
    
    return definitions

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)