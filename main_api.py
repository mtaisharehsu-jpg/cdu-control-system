from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from engine import ControlEngine
import threading
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# 實例化並在背景執行緒中運行引擎
# 這是關鍵步驟，確保控制邏輯與API服務並行運行
logging.info("Initializing Control Engine...")
engine = ControlEngine('cdu_config.yaml')
engine_thread = threading.Thread(target=engine.run, daemon=True)
engine_thread.start()
logging.info("Control Engine thread started.")

app = FastAPI(title="CDU Control System API", version="1.0")

# --- Pydantic Models for Request/Response Body ---
class Status(BaseModel):
    State: str
    Health: str

class Pump(BaseModel):
    Id: str
    Name: str
    Status: Status
    Reading: float
    ReadingUnits: str

class TempSensor(BaseModel):
    Id: str
    Name: str
    Status: Status
    Reading: float
    ReadingUnits: str

class PressSensor(BaseModel):
    Id: str
    Name: str
    Status: Status
    Reading: float
    ReadingUnits: str

class LiquidLevelSensor(BaseModel):
    Id: str
    Name: str
    Status: Status
    Level: str # e.g., Normal, High, Low

class SetSpeedAction(BaseModel):
    SpeedRPM: float

# --- API Endpoints ---
@app.get("/redfish/v1/Chassis/CDU_Main/Thermal/Pumps/{pump_id}", response_model=Pump)
async def get_pump_info(pump_id: str):
    """
    獲取指定泵浦的詳細資訊和即時狀態。
    """
    if pump_id not in engine.blocks:
        raise HTTPException(status_code=404, detail=f"Pump with ID '{pump_id}' not found.")
        
    status = Status(
        State=engine.get_block_property(pump_id, 'output_status'),
        Health=engine.get_block_property(pump_id, 'output_health')
    )
    
    pump_info = Pump(
        Id=pump_id,
        Name=f"VFD Pump {pump_id}",
        Status=status,
        Reading=engine.get_block_property(pump_id, 'output_current_rpm'),
        ReadingUnits="RPM"
    )
    return pump_info

@app.post("/redfish/v1/Chassis/CDU_Main/Thermal/Pumps/{pump_id}/Actions/Pump.SetSpeed")
async def set_pump_speed(pump_id: str, action: SetSpeedAction):
    """
    設定指定泵浦的目標轉速。
    """
    if pump_id not in engine.blocks:
        raise HTTPException(status_code=404, detail=f"Pump with ID '{pump_id}' not found.")

    success = engine.set_block_property(pump_id, 'input_target_rpm', action.SpeedRPM)
    if success:
        return {"message": f"Target speed for {pump_id} set to {action.SpeedRPM} RPM"}
    else:
        raise HTTPException(status_code=500, detail="Failed to set property in engine")

@app.get("/redfish/v1/Chassis/CDU_Main/Thermal/Temperatures/{sensor_id}", response_model=TempSensor)
async def get_sensor_info(sensor_id: str):
    """
    獲取指定溫度感測器的詳細資訊和即時狀態。
    """
    if sensor_id not in engine.blocks:
        raise HTTPException(status_code=404, detail=f"Sensor with ID '{sensor_id}' not found.")
        
    status = Status(
        State=engine.get_block_property(sensor_id, 'output_status'),
        Health=engine.get_block_property(sensor_id, 'output_health')
    )
    
    sensor_info = TempSensor(
        Id=sensor_id,
        Name=f"Temperature Sensor {sensor_id}",
        Status=status,
        Reading=engine.get_block_property(sensor_id, 'output_temperature'),
        ReadingUnits="Celsius"
    )
    return sensor_info

@app.get("/redfish/v1/Chassis/CDU_Main/Sensors/LiquidLevel/{sensor_id}", response_model=LiquidLevelSensor)
async def get_liquid_level_sensor_info(sensor_id: str):
    """
    獲取指定液位感測器的詳細資訊和即時狀態。
    """
    if sensor_id not in engine.blocks:
        raise HTTPException(status_code=404, detail=f"Sensor with ID '{sensor_id}' not found.")
        
    status = Status(
        State=engine.get_block_property(sensor_id, 'output_status'),
        Health=engine.get_block_property(sensor_id, 'output_health')
    )
    
    sensor_info = LiquidLevelSensor(
        Id=sensor_id,
        Name=f"Liquid Level Sensor {sensor_id}",
        Status=status,
        Level=engine.get_block_property(sensor_id, 'output_level_status')
    )
    return sensor_info

@app.get("/redfish/v1/Chassis/CDU_Main/Thermal/Pressures/{sensor_id}", response_model=PressSensor)
async def get_press_sensor_info(sensor_id: str):
    """
    獲取指定壓力感測器的詳細資訊和即時狀態。
    """
    if sensor_id not in engine.blocks:
        raise HTTPException(status_code=404, detail=f"Sensor with ID '{sensor_id}' not found.")
        
    status = Status(
        State=engine.get_block_property(sensor_id, 'output_status'),
        Health=engine.get_block_property(sensor_id, 'output_health')
    )
    
    sensor_info = PressSensor(
        Id=sensor_id,
        Name=f"Pressure Sensor {sensor_id}",
        Status=status,
        Reading=engine.get_block_property(sensor_id, 'output_pressure'),
        ReadingUnits="Bar"
    )
    return sensor_info

# --- 新增感測器數據批量讀取端點 ---
class SensorReading(BaseModel):
    block_id: str
    block_type: str
    value: float
    status: str
    health: str
    unit: str
    device: str = None
    modbus_address: int = None
    register: int = None

@app.get("/api/v1/sensors/readings", response_model=list[SensorReading])
async def get_all_sensor_readings():
    """
    獲取所有感測器的即時讀數
    """
    readings = []
    
    for block_id, block in engine.blocks.items():
        try:
            reading = SensorReading(
                block_id=block_id,
                block_type=type(block).__name__,
                value=0.0,
                status="Unknown",
                health="Unknown",
                unit="",
                device=getattr(block, 'device', None),
                modbus_address=getattr(block, 'modbus_address', None),
                register=getattr(block, 'register', None)
            )
            
            # 根據不同的感測器類型獲取對應的數據
            if hasattr(block, 'output_temperature'):
                reading.value = block.output_temperature
                reading.unit = "°C"
                reading.status = getattr(block, 'output_status', 'Unknown')
                reading.health = getattr(block, 'output_health', 'Unknown')
            elif hasattr(block, 'output_pressure'):
                reading.value = block.output_pressure
                reading.unit = "Bar"
                reading.status = getattr(block, 'output_status', 'Unknown')
                reading.health = getattr(block, 'output_health', 'Unknown')
            elif hasattr(block, 'output_level'):
                reading.value = 1.0 if getattr(block, 'output_level', 'Normal') == 'Normal' else 0.0
                reading.unit = "Level"
                reading.status = getattr(block, 'output_status', 'Unknown')
                reading.health = getattr(block, 'output_health', 'Unknown')
            elif hasattr(block, 'output_rpm'):
                reading.value = getattr(block, 'output_rpm', 0.0)
                reading.unit = "RPM"
                reading.status = getattr(block, 'output_status', 'Unknown')
                reading.health = getattr(block, 'output_health', 'Unknown')
            
            readings.append(reading)
            
        except Exception as e:
            logging.error(f"Error reading sensor data for block {block_id}: {e}")
            # 添加錯誤狀態的讀數
            error_reading = SensorReading(
                block_id=block_id,
                block_type=type(block).__name__,
                value=-1.0,
                status="Error",
                health="Critical",
                unit="N/A"
            )
            readings.append(error_reading)
    
    return readings

@app.get("/")
async def root():
    return {"message": "Welcome to the CDU Control System API. See /docs for details."}