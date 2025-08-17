"""
Redfish格式API模組
提供符合Redfish標準的API接口來查詢CDU系統狀態
"""

import json
import time
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

# Pydantic模型定義
class RegisterWriteRequest(BaseModel):
    """R暫存器寫入請求模型"""
    register_address: int = Field(..., ge=10500, le=10700, description="R暫存器地址 (R10500-R10700)")
    value: int = Field(..., ge=0, le=65535, description="寫入值 (0-65535)")

class BatchRegisterWriteRequest(BaseModel):
    """批量R暫存器寫入請求模型"""
    start_address: int = Field(..., ge=10500, le=10700, description="起始R暫存器地址")
    values: List[int] = Field(..., min_items=1, max_items=201, description="寫入值列表")

class RegisterWriteResponse(BaseModel):
    """R暫存器寫入響應模型"""
    success: bool
    message: str
    register_address: Optional[int] = None
    value: Optional[int] = None
    timestamp: str

class RegisterReadRequest(BaseModel):
    """R暫存器讀取請求模型"""
    register_address: int = Field(..., ge=10000, le=11000, description="R暫存器地址 (R10000-R11000)")

class BatchRegisterReadRequest(BaseModel):
    """批量R暫存器讀取請求模型"""
    start_address: int = Field(..., ge=10000, le=11000, description="起始R暫存器地址")
    count: int = Field(..., ge=1, le=125, description="讀取數量 (1-125)")

class RegisterReadResponse(BaseModel):
    """R暫存器讀取響應模型"""
    success: bool
    register_address: Optional[int] = None
    value: Optional[int] = None
    modbus_address: Optional[int] = None
    timestamp: str
    message: Optional[str] = None

class CDUStatusResponse(BaseModel):
    """CDU機組狀態響應模型"""
    success: bool
    register_value: int
    status_bits: Dict[str, Any]
    summary: Dict[str, Any]
    timestamp: str

class CDUAlarmResponse(BaseModel):
    """CDU異常信息響應模型"""
    success: bool
    alarm_registers: Dict[str, Any]
    active_alarms: List[Dict[str, Any]]
    alarm_summary: Dict[str, Any]
    timestamp: str

class CDUIntegratedAlarmsResponse(BaseModel):
    """CDU統合異常信息響應模型"""
    success: bool
    system_overview: Dict[str, Any]
    active_alarms_summary: Dict[str, Any]
    alarm_categories: Dict[str, Any]
    critical_issues: List[Dict[str, Any]]
    recommended_actions: List[str]
    system_health_score: int
    timestamp: str

class CDUOperationRequest(BaseModel):
    """CDU操作設置請求模型"""
    operation: str = Field(..., description="操作類型: start, stop, fan_start, fan_stop")

class CDUOperationResponse(BaseModel):
    """CDU操作設置響應模型"""
    success: bool
    operation: str
    register_address: int
    value_written: int
    operation_description: str
    status: str
    timestamp: str
    message: Optional[str] = None

class CDUValueWriteRequest(BaseModel):
    """CDU數值寫入請求模型"""
    parameter: str = Field(..., description="參數名稱: temp_setting, flow_setting, fan_speed, pump1_speed, pump2_speed")
    value: float = Field(..., description="設定值 (實際單位值)")

class CDUValueWriteResponse(BaseModel):
    """CDU數值寫入響應模型"""
    success: bool
    parameter: str
    register_address: int
    input_value: float
    register_value: int
    actual_value: float
    unit: str
    description: str
    status: str
    timestamp: str
    message: Optional[str] = None

class CDUValuesStatusResponse(BaseModel):
    """CDU數值狀態響應模型"""
    success: bool
    values_status: Dict[str, Any]
    timestamp: str

class CDUSensorsResponse(BaseModel):
    """CDU感測器響應模型"""
    success: bool
    sensors_data: Dict[str, Any]
    sensor_summary: Dict[str, Any]
    timestamp: str

class CDUSensorReadRequest(BaseModel):
    """CDU感測器讀取請求模型"""
    sensor_type: str = Field(..., description="感測器類型: temperature, pressure, flow, io")
    sensor_name: Optional[str] = Field(None, description="特定感測器名稱")

class CDUSensorBatchReadRequest(BaseModel):
    """CDU感測器批量讀取請求模型"""
    sensor_types: List[str] = Field(..., description="感測器類型列表")
    include_reserved: bool = Field(False, description="是否包含預留位")

class CDUMachineConfigRequest(BaseModel):
    """CDU機種配置請求模型"""
    machine_type: str = Field(..., description="機種類型")
    machine_name: str = Field(..., description="機種名稱")
    description: str = Field("", description="機種描述")
    sensor_config: Dict[str, Any] = Field(..., description="感測器配置")

class CDUMachineConfigResponse(BaseModel):
    """CDU機種配置響應模型"""
    success: bool
    machine_type: str
    machine_name: str
    description: str
    sensor_config: Dict[str, Any]
    timestamp: str
    message: Optional[str] = None

class CDUMachineListResponse(BaseModel):
    """CDU機種列表響應模型"""
    success: bool
    machine_configs: Dict[str, Any]
    current_machine: str
    total_machines: int
    timestamp: str

class CDUMachineSetRequest(BaseModel):
    """CDU機種設定請求模型"""
    machine_type: str = Field(..., description="要設定的機種類型")

# 創建APIRouter
redfish_router = APIRouter(prefix='/redfish/v1', tags=['redfish'])

class RedfishAPI:
    """Redfish格式API類"""
    
    def __init__(self, system_manager=None):
        self.system_manager = system_manager
        self.service_root = {
            "@odata.context": "/redfish/v1/$metadata#ServiceRoot.ServiceRoot",
            "@odata.type": "#ServiceRoot.v1_5_0.ServiceRoot",
            "@odata.id": "/redfish/v1/",
            "Id": "RootService",
            "Name": "CDU System Root Service",
            "RedfishVersion": "1.8.0",
            "UUID": "12345678-1234-5678-9012-123456789012",
            "Systems": {
                "@odata.id": "/redfish/v1/Systems"
            },
            "Chassis": {
                "@odata.id": "/redfish/v1/Chassis"
            },
            "Managers": {
                "@odata.id": "/redfish/v1/Managers"
            }
        }
    
    def get_service_root(self) -> Dict[str, Any]:
        """獲取服務根目錄"""
        return self.service_root
    
    def get_systems_collection(self) -> Dict[str, Any]:
        """獲取系統集合"""
        return {
            "@odata.context": "/redfish/v1/$metadata#ComputerSystemCollection.ComputerSystemCollection",
            "@odata.type": "#ComputerSystemCollection.ComputerSystemCollection",
            "@odata.id": "/redfish/v1/Systems",
            "Name": "Computer System Collection",
            "Members@odata.count": 1,
            "Members": [
                {
                    "@odata.id": "/redfish/v1/Systems/CDU1"
                }
            ]
        }
    
    def get_system_info(self, system_id: str) -> Dict[str, Any]:
        """獲取特定系統信息"""
        if system_id != "CDU1":
            return {"error": "System not found"}, 404
        
        # 從系統管理器獲取PLC數據
        plc_data = self._get_plc_data()
        
        system_info = {
            "@odata.context": "/redfish/v1/$metadata#ComputerSystem.ComputerSystem",
            "@odata.type": "#ComputerSystem.v1_13_0.ComputerSystem",
            "@odata.id": f"/redfish/v1/Systems/{system_id}",
            "Id": system_id,
            "Name": "CDU System 1",
            "Description": "Cold Distribution Unit System",
            "SystemType": "Physical",
            "Manufacturer": "Mitsubishi",
            "Model": "F5U PLC",
            "SerialNumber": "CDU001",
            "PartNumber": "F5U-001",
            "PowerState": self._get_power_state(plc_data),
            "Status": {
                "State": "Enabled",
                "Health": self._get_health_status(plc_data)
            },
            "ProcessorSummary": {
                "Count": 1,
                "Model": "Mitsubishi F5U",
                "Status": {
                    "State": "Enabled",
                    "Health": "OK"
                }
            },
            "MemorySummary": {
                "TotalSystemMemoryGiB": 0.001,
                "Status": {
                    "State": "Enabled",
                    "Health": "OK"
                }
            },
            "Oem": {
                "CDU": {
                    "RegisterData": plc_data,
                    "LastUpdate": datetime.now().isoformat()
                }
            }
        }
        
        return system_info
    
    def get_chassis_collection(self) -> Dict[str, Any]:
        """獲取機箱集合"""
        return {
            "@odata.context": "/redfish/v1/$metadata#ChassisCollection.ChassisCollection",
            "@odata.type": "#ChassisCollection.ChassisCollection",
            "@odata.id": "/redfish/v1/Chassis",
            "Name": "Chassis Collection",
            "Members@odata.count": 1,
            "Members": [
                {
                    "@odata.id": "/redfish/v1/Chassis/CDU1"
                }
            ]
        }
    
    def get_chassis_info(self, chassis_id: str) -> Dict[str, Any]:
        """獲取機箱信息"""
        if chassis_id != "CDU1":
            return {"error": "Chassis not found"}, 404
        
        plc_data = self._get_plc_data()
        
        chassis_info = {
            "@odata.context": "/redfish/v1/$metadata#Chassis.Chassis",
            "@odata.type": "#Chassis.v1_14_0.Chassis",
            "@odata.id": f"/redfish/v1/Chassis/{chassis_id}",
            "Id": chassis_id,
            "Name": "CDU Chassis 1",
            "ChassisType": "RackMount",
            "Manufacturer": "Mitsubishi",
            "Model": "CDU-F5U",
            "SerialNumber": "CDU001",
            "PartNumber": "CDU-F5U-001",
            "Status": {
                "State": "Enabled",
                "Health": self._get_health_status(plc_data)
            },
            "PowerState": self._get_power_state(plc_data),
            "Thermal": {
                "@odata.id": f"/redfish/v1/Chassis/{chassis_id}/Thermal"
            },
            "Power": {
                "@odata.id": f"/redfish/v1/Chassis/{chassis_id}/Power"
            },
            "Oem": {
                "CDU": {
                    "RegisterData": plc_data,
                    "LastUpdate": datetime.now().isoformat()
                }
            }
        }
        
        return chassis_info
    
    def get_thermal_info(self, chassis_id: str) -> Dict[str, Any]:
        """獲取熱管理信息"""
        if chassis_id != "CDU1":
            return {"error": "Chassis not found"}, 404
        
        plc_data = self._get_plc_data()
        
        thermal_info = {
            "@odata.context": "/redfish/v1/$metadata#Thermal.Thermal",
            "@odata.type": "#Thermal.v1_6_0.Thermal",
            "@odata.id": f"/redfish/v1/Chassis/{chassis_id}/Thermal",
            "Id": "Thermal",
            "Name": "Thermal",
            "Temperatures": self._get_temperature_sensors(plc_data),
            "Fans": self._get_fan_info(plc_data)
        }
        
        return thermal_info
    
    def get_power_info(self, chassis_id: str) -> Dict[str, Any]:
        """獲取電源信息"""
        if chassis_id != "CDU1":
            return {"error": "Chassis not found"}, 404
        
        plc_data = self._get_plc_data()
        
        power_info = {
            "@odata.context": "/redfish/v1/$metadata#Power.Power",
            "@odata.type": "#Power.v1_6_0.Power",
            "@odata.id": f"/redfish/v1/Chassis/{chassis_id}/Power",
            "Id": "Power",
            "Name": "Power",
            "PowerControl": self._get_power_control(plc_data),
            "Voltages": self._get_voltage_sensors(plc_data),
            "PowerSupplies": self._get_power_supplies(plc_data)
        }
        
        return power_info
    
    def _get_plc_data(self) -> Dict[str, Any]:
        """從系統管理器獲取PLC數據"""
        if not self.system_manager:
            # 如果沒有系統管理器，返回模擬數據用於測試
            return self._get_mock_plc_data()

        try:
            # 獲取Mitsubishi PLC塊
            mitsubishi_block = None
            for block in self.system_manager.blocks:
                if block.__class__.__name__ == 'MitsubishiPLCBlock':
                    mitsubishi_block = block
                    break

            if mitsubishi_block and hasattr(mitsubishi_block, 'register_values'):
                if mitsubishi_block.register_values:
                    return mitsubishi_block.register_values
                else:
                    # 如果PLC數據為空，返回模擬數據
                    logger.warning("PLC register_values is empty, using mock data")
                    return self._get_mock_plc_data()

        except Exception as e:
            logger.error(f"Error getting PLC data: {e}")

        # 如果無法獲取真實數據，返回模擬數據
        return self._get_mock_plc_data()

    def _get_mock_plc_data(self) -> Dict[str, Any]:
        """獲取模擬PLC數據用於測試"""
        import random
        import time

        return {
            'R10000': {'value': 1, 'name': 'CDU1運轉狀態', 'register': 10000},
            'R10001': {'value': 25, 'name': 'CDU1溫度設定', 'register': 10001},
            'R10002': {'value': random.randint(20, 30), 'name': 'CDU1實際溫度', 'register': 10002},
            'R10003': {'value': 1, 'name': 'CDU1風扇狀態', 'register': 10003},
            'R10004': {'value': 1, 'name': 'CDU1壓縮機狀態', 'register': 10004},
            'R10005': {'value': 0, 'name': 'CDU1警報狀態', 'register': 10005},
            'R10006': {'value': random.randint(50, 100), 'name': 'CDU1電流值', 'register': 10006},
            'R10007': {'value': random.randint(220, 240), 'name': 'CDU1電壓值', 'register': 10007},
            'R10008': {'value': random.randint(500, 1000), 'name': 'CDU1功率值', 'register': 10008},
            'R10009': {'value': int(time.time() % 86400), 'name': 'CDU1運轉時間', 'register': 10009},
            'R10010': {'value': 0, 'name': 'CDU1維護狀態', 'register': 10010}
        }
    
    def _get_power_state(self, plc_data: Dict[str, Any]) -> str:
        """根據PLC數據判斷電源狀態"""
        if not plc_data:
            return "Unknown"
        
        # 檢查R10000 (CDU1運轉狀態)
        r10000_data = plc_data.get('R10000', {})
        if isinstance(r10000_data, dict):
            value = r10000_data.get('value', 0)
        else:
            value = r10000_data
        
        return "On" if value > 0 else "Off"
    
    def _get_health_status(self, plc_data: Dict[str, Any]) -> str:
        """根據PLC數據判斷健康狀態"""
        if not plc_data:
            return "Unknown"
        
        # 檢查R10005 (CDU1警報狀態)
        r10005_data = plc_data.get('R10005', {})
        if isinstance(r10005_data, dict):
            alarm_value = r10005_data.get('value', 0)
        else:
            alarm_value = r10005_data
        
        return "Critical" if alarm_value > 0 else "OK"
    
    def _get_temperature_sensors(self, plc_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """獲取溫度傳感器信息"""
        temperatures = []
        
        # R10001: 溫度設定
        r10001_data = plc_data.get('R10001', {})
        if isinstance(r10001_data, dict):
            set_temp = r10001_data.get('value', 0)
            temp_name = r10001_data.get('name', '溫度設定')
        else:
            set_temp = r10001_data
            temp_name = '溫度設定'
        
        temperatures.append({
            "@odata.id": "/redfish/v1/Chassis/CDU1/Thermal#/Temperatures/0",
            "MemberId": "0",
            "Name": temp_name,
            "SensorNumber": 10001,
            "Status": {"State": "Enabled", "Health": "OK"},
            "ReadingCelsius": set_temp,
            "UpperThresholdNonCritical": 30,
            "UpperThresholdCritical": 35,
            "LowerThresholdNonCritical": 15,
            "LowerThresholdCritical": 10,
            "PhysicalContext": "Intake"
        })
        
        # R10002: 實際溫度
        r10002_data = plc_data.get('R10002', {})
        if isinstance(r10002_data, dict):
            actual_temp = r10002_data.get('value', 0)
            temp_name = r10002_data.get('name', '實際溫度')
        else:
            actual_temp = r10002_data
            temp_name = '實際溫度'
        
        temperatures.append({
            "@odata.id": "/redfish/v1/Chassis/CDU1/Thermal#/Temperatures/1",
            "MemberId": "1",
            "Name": temp_name,
            "SensorNumber": 10002,
            "Status": {"State": "Enabled", "Health": "OK"},
            "ReadingCelsius": actual_temp,
            "UpperThresholdNonCritical": 30,
            "UpperThresholdCritical": 35,
            "LowerThresholdNonCritical": 15,
            "LowerThresholdCritical": 10,
            "PhysicalContext": "Exhaust"
        })
        
        return temperatures
    
    def _get_fan_info(self, plc_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """獲取風扇信息"""
        fans = []
        
        # R10003: 風扇狀態
        r10003_data = plc_data.get('R10003', {})
        if isinstance(r10003_data, dict):
            fan_status = r10003_data.get('value', 0)
            fan_name = r10003_data.get('name', '風扇狀態')
        else:
            fan_status = r10003_data
            fan_name = '風扇狀態'
        
        fans.append({
            "@odata.id": "/redfish/v1/Chassis/CDU1/Thermal#/Fans/0",
            "MemberId": "0",
            "Name": fan_name,
            "Status": {
                "State": "Enabled" if fan_status > 0 else "Disabled",
                "Health": "OK" if fan_status > 0 else "Warning"
            },
            "Reading": fan_status * 100,  # 假設狀態值轉換為RPM
            "ReadingUnits": "RPM",
            "PhysicalContext": "Intake"
        })
        
        return fans
    
    def _get_power_control(self, plc_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """獲取電源控制信息"""
        power_control = []
        
        # R10008: 功率值
        r10008_data = plc_data.get('R10008', {})
        if isinstance(r10008_data, dict):
            power_value = r10008_data.get('value', 0)
            power_name = r10008_data.get('name', '功率值')
        else:
            power_value = r10008_data
            power_name = '功率值'
        
        power_control.append({
            "@odata.id": "/redfish/v1/Chassis/CDU1/Power#/PowerControl/0",
            "MemberId": "0",
            "Name": power_name,
            "PowerConsumedWatts": power_value,
            "PowerRequestedWatts": power_value,
            "PowerAvailableWatts": 1000,
            "PowerCapacityWatts": 1000,
            "Status": {"State": "Enabled", "Health": "OK"}
        })
        
        return power_control
    
    def _get_voltage_sensors(self, plc_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """獲取電壓傳感器信息"""
        voltages = []
        
        # R10007: 電壓值
        r10007_data = plc_data.get('R10007', {})
        if isinstance(r10007_data, dict):
            voltage_value = r10007_data.get('value', 0)
            voltage_name = r10007_data.get('name', '電壓值')
        else:
            voltage_value = r10007_data
            voltage_name = '電壓值'
        
        voltages.append({
            "@odata.id": "/redfish/v1/Chassis/CDU1/Power#/Voltages/0",
            "MemberId": "0",
            "Name": voltage_name,
            "SensorNumber": 10007,
            "Status": {"State": "Enabled", "Health": "OK"},
            "ReadingVolts": voltage_value,
            "UpperThresholdNonCritical": 250,
            "UpperThresholdCritical": 260,
            "LowerThresholdNonCritical": 200,
            "LowerThresholdCritical": 190,
            "PhysicalContext": "PowerSupply"
        })
        
        return voltages
    
    def _get_power_supplies(self, plc_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """獲取電源供應器信息"""
        power_supplies = []
        
        # R10004: 壓縮機狀態
        r10004_data = plc_data.get('R10004', {})
        if isinstance(r10004_data, dict):
            compressor_status = r10004_data.get('value', 0)
            compressor_name = r10004_data.get('name', '壓縮機狀態')
        else:
            compressor_status = r10004_data
            compressor_name = '壓縮機狀態'
        
        power_supplies.append({
            "@odata.id": "/redfish/v1/Chassis/CDU1/Power#/PowerSupplies/0",
            "MemberId": "0",
            "Name": compressor_name,
            "Status": {
                "State": "Enabled" if compressor_status > 0 else "Disabled",
                "Health": "OK" if compressor_status > 0 else "Warning"
            },
            "PowerSupplyType": "AC",
            "LineInputVoltageType": "AC120V",
            "PowerCapacityWatts": 500,
            "LastPowerOutputWatts": compressor_status * 100,
            "Model": "CDU-PSU-001",
            "Manufacturer": "Mitsubishi",
            "SerialNumber": "PSU001"
        })
        
        return power_supplies

    def write_r_register(self, register_address: int, value: int) -> Dict[str, Any]:
        """寫入單個R暫存器"""
        try:
            # 檢查地址範圍
            if not (10500 <= register_address <= 10700):
                return {
                    "success": False,
                    "message": f"Register address {register_address} out of range (R10500-R10700)",
                    "timestamp": datetime.now().isoformat()
                }

            # 檢查值範圍
            if not (0 <= value <= 65535):
                return {
                    "success": False,
                    "message": f"Value {value} out of range (0-65535)",
                    "timestamp": datetime.now().isoformat()
                }

            # 獲取PLC塊
            mitsubishi_block = self._get_mitsubishi_plc_block()
            if not mitsubishi_block:
                return {
                    "success": False,
                    "message": "PLC block not found",
                    "timestamp": datetime.now().isoformat()
                }

            # 執行寫入
            success = mitsubishi_block.write_r_register(register_address, value)

            if success:
                return {
                    "success": True,
                    "message": f"Successfully wrote R{register_address} = {value}",
                    "register_address": register_address,
                    "value": value,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to write R{register_address}",
                    "register_address": register_address,
                    "value": value,
                    "timestamp": datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Error writing R{register_address}: {e}")
            return {
                "success": False,
                "message": f"Error writing register: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def write_r_registers_batch(self, start_address: int, values: List[int]) -> Dict[str, Any]:
        """批量寫入R暫存器"""
        try:
            # 檢查地址範圍
            end_address = start_address + len(values) - 1
            if not (10500 <= start_address <= 10700) or not (10500 <= end_address <= 10700):
                return {
                    "success": False,
                    "message": f"Address range R{start_address}-R{end_address} out of range (R10500-R10700)",
                    "timestamp": datetime.now().isoformat()
                }

            # 檢查值範圍
            for i, value in enumerate(values):
                if not (0 <= value <= 65535):
                    return {
                        "success": False,
                        "message": f"Value {value} at index {i} out of range (0-65535)",
                        "timestamp": datetime.now().isoformat()
                    }

            # 獲取PLC塊
            mitsubishi_block = self._get_mitsubishi_plc_block()
            if not mitsubishi_block:
                return {
                    "success": False,
                    "message": "PLC block not found",
                    "timestamp": datetime.now().isoformat()
                }

            # 執行批量寫入
            success = mitsubishi_block.write_r_registers_batch(start_address, values)

            if success:
                return {
                    "success": True,
                    "message": f"Successfully wrote {len(values)} registers starting from R{start_address}",
                    "start_address": start_address,
                    "count": len(values),
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to write registers starting from R{start_address}",
                    "start_address": start_address,
                    "count": len(values),
                    "timestamp": datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Error batch writing registers: {e}")
            return {
                "success": False,
                "message": f"Error writing registers: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def get_r_register_info(self) -> Dict[str, Any]:
        """獲取R暫存器信息"""
        try:
            mitsubishi_block = self._get_mitsubishi_plc_block()
            if not mitsubishi_block:
                return {
                    "error": "PLC block not found",
                    "timestamp": datetime.now().isoformat()
                }

            return {
                "register_range": "R10500-R10700",
                "modbus_address_range": "500-700",
                "total_registers": 201,
                "write_support": True,
                "connected": mitsubishi_block.connected,
                "write_errors": getattr(mitsubishi_block, 'write_errors', 0),
                "cached_values": mitsubishi_block.get_all_r_registers(),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting R register info: {e}")
            return {
                "error": f"Error getting register info: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def _get_mitsubishi_plc_block(self):
        """獲取Mitsubishi PLC塊"""
        logger.debug(f"system_manager: {self.system_manager}")
        if not self.system_manager:
            logger.warning("system_manager is None")
            return None

        # 檢查blocks是字典還是列表
        if hasattr(self.system_manager, 'blocks'):
            blocks = self.system_manager.blocks
            logger.debug(f"blocks type: {type(blocks)}, count: {len(blocks) if blocks else 0}")

            if isinstance(blocks, dict):
                # 如果是字典，遍歷值
                for block_id, block in blocks.items():
                    logger.debug(f"Block {block_id}: {block.__class__.__name__}")
                    if block.__class__.__name__ == 'MitsubishiPLCBlock':
                        logger.info(f"Found MitsubishiPLCBlock: {block_id}")
                        return block
            else:
                # 如果是列表，直接遍歷
                for i, block in enumerate(blocks):
                    logger.debug(f"Block {i}: {block.__class__.__name__}")
                    if block.__class__.__name__ == 'MitsubishiPLCBlock':
                        logger.info(f"Found MitsubishiPLCBlock at index {i}")
                        return block
        else:
            logger.warning("system_manager has no blocks attribute")

        logger.warning("MitsubishiPLCBlock not found")
        return None

    def read_single_r_register(self, register_address: int) -> Dict[str, Any]:
        """讀取單個R暫存器"""
        try:
            # 檢查地址範圍
            if not (10000 <= register_address <= 11000):
                return {
                    "success": False,
                    "message": f"Register address R{register_address} out of range (R10000-R11000)",
                    "timestamp": datetime.now().isoformat()
                }

            # 獲取PLC塊
            mitsubishi_block = self._get_mitsubishi_plc_block()
            if not mitsubishi_block:
                return {
                    "success": False,
                    "message": "PLC block not found",
                    "timestamp": datetime.now().isoformat()
                }

            # 執行讀取
            result = mitsubishi_block.read_single_r_register(register_address)

            if result:
                return {
                    "success": True,
                    "register_address": result["register"],
                    "value": result["value"],
                    "modbus_address": result["modbus_address"],
                    "timestamp": datetime.now().isoformat(),
                    "message": f"Successfully read R{register_address} = {result['value']}"
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to read R{register_address}",
                    "register_address": register_address,
                    "timestamp": datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Error reading R{register_address}: {e}")
            return {
                "success": False,
                "message": f"Error reading register: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def read_r_registers_batch(self, start_address: int, count: int) -> Dict[str, Any]:
        """批量讀取R暫存器"""
        try:
            # 檢查地址範圍
            end_address = start_address + count - 1
            if not (10000 <= start_address <= 11000) or not (10000 <= end_address <= 11000):
                return {
                    "success": False,
                    "message": f"Address range R{start_address}-R{end_address} out of range (R10000-R11000)",
                    "timestamp": datetime.now().isoformat()
                }

            # 檢查數量限制
            if count > 125:
                return {
                    "success": False,
                    "message": f"Count {count} exceeds maximum (125)",
                    "timestamp": datetime.now().isoformat()
                }

            # 獲取PLC塊
            mitsubishi_block = self._get_mitsubishi_plc_block()
            if not mitsubishi_block:
                return {
                    "success": False,
                    "message": "PLC block not found",
                    "timestamp": datetime.now().isoformat()
                }

            # 執行批量讀取
            result = mitsubishi_block.read_r_registers_batch(start_address, count)

            if result:
                return {
                    "success": True,
                    "start_address": result["start_address"],
                    "count": result["count"],
                    "registers": result["registers"],
                    "timestamp": datetime.now().isoformat(),
                    "message": f"Successfully read {count} registers starting from R{start_address}"
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to read registers R{start_address}-R{end_address}",
                    "start_address": start_address,
                    "count": count,
                    "timestamp": datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Error batch reading registers: {e}")
            return {
                "success": False,
                "message": f"Error reading registers: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def get_cdu_status(self) -> Dict[str, Any]:
        """獲取CDU機組狀態 (基於R10000的16個bit位)"""
        try:
            # 讀取R10000暫存器
            result = self.read_single_r_register(10000)

            if not result or not result.get("success"):
                return {
                    "success": False,
                    "message": "Failed to read R10000 register",
                    "timestamp": datetime.now().isoformat()
                }

            register_value = result["value"]

            # 定義bit位對應的狀態信息
            bit_definitions = {
                0: {"name": "CDU-電源開啟", "description": "0=關閉 1=開啟"},
                1: {"name": "CDU-運轉中", "description": "0=停止 1=運轉"},
                2: {"name": "CDU-待機", "description": "0=運轉 1=待機"},
                3: {"name": "CDU-預留3", "description": "預留位"},
                4: {"name": "CDU-補水中", "description": "0=停止 1=運行"},
                5: {"name": "CDU-預留5", "description": "預留位"},
                6: {"name": "CDU-預留6", "description": "預留位"},
                7: {"name": "CDU-異常", "description": "0=正常 1=異常"},
                8: {"name": "預留8", "description": "預留位"},
                9: {"name": "預留9", "description": "預留位"},
                10: {"name": "預留10", "description": "預留位"},
                11: {"name": "預留11", "description": "預留位"},
                12: {"name": "預留12", "description": "預留位"},
                13: {"name": "預留13", "description": "預留位"},
                14: {"name": "預留14", "description": "預留位"},
                15: {"name": "預留15", "description": "預留位"}
            }

            # 解析每個bit位的狀態
            status_bits = {}
            for bit_pos in range(16):
                bit_value = (register_value >> bit_pos) & 1
                bit_info = bit_definitions[bit_pos]

                # 根據bit位置和值確定狀態描述
                if bit_pos == 0:  # 電源開啟
                    status_text = "開啟" if bit_value else "關閉"
                elif bit_pos == 1:  # 運轉中
                    status_text = "運轉" if bit_value else "停止"
                elif bit_pos == 2:  # 待機
                    status_text = "待機" if bit_value else "運轉"
                elif bit_pos == 4:  # 補水中
                    status_text = "運行" if bit_value else "停止"
                elif bit_pos == 7:  # 異常
                    status_text = "異常" if bit_value else "正常"
                else:  # 預留位
                    status_text = f"位{bit_pos}={bit_value}"

                status_bits[f"bit{bit_pos}"] = {
                    "name": bit_info["name"],
                    "description": bit_info["description"],
                    "value": bit_value,
                    "status": status_text,
                    "active": bit_value == 1
                }

            # 生成狀態摘要
            summary = {
                "power_on": bool(register_value & 0x01),  # bit0
                "running": bool(register_value & 0x02),   # bit1
                "standby": bool(register_value & 0x04),   # bit2
                "water_filling": bool(register_value & 0x10),  # bit4
                "abnormal": bool(register_value & 0x80),  # bit7
                "overall_status": self._get_overall_status(register_value)
            }

            return {
                "success": True,
                "register_value": register_value,
                "register_hex": f"0x{register_value:04X}",
                "register_binary": f"{register_value:016b}",
                "status_bits": status_bits,
                "summary": summary,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting CDU status: {e}")
            return {
                "success": False,
                "message": f"Error getting CDU status: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def _get_overall_status(self, register_value: int) -> str:
        """根據bit位組合判斷整體狀態"""
        power_on = bool(register_value & 0x01)      # bit0
        running = bool(register_value & 0x02)       # bit1
        standby = bool(register_value & 0x04)       # bit2
        abnormal = bool(register_value & 0x80)      # bit7

        if abnormal:
            return "異常"
        elif not power_on:
            return "關機"
        elif standby:
            return "待機"
        elif running:
            return "運轉中"
        else:
            return "開機未運轉"

    def get_cdu_alarms(self) -> Dict[str, Any]:
        """獲取CDU異常信息 (基於R10001-R10005的16個bit位)"""
        try:
            # 定義異常信息暫存器範圍
            alarm_registers = [10001, 10002, 10003, 10004, 10005]
            register_data = {}
            all_active_alarms = []

            # 定義異常信息bit位對應表
            alarm_definitions = self._get_alarm_definitions()

            # 讀取所有異常信息暫存器
            for register_addr in alarm_registers:
                result = self.read_single_r_register(register_addr)

                if not result or not result.get("success"):
                    logger.warning(f"Failed to read alarm register R{register_addr}")
                    continue

                register_value = result["value"]
                register_key = f"R{register_addr}"

                # 解析該暫存器的16個bit位
                status_bits = {}
                for bit_pos in range(16):
                    bit_value = (register_value >> bit_pos) & 1
                    alarm_code = f"A{(register_addr - 10001) * 16 + bit_pos + 1:03d}"

                    # 獲取異常信息定義
                    alarm_info = alarm_definitions.get(alarm_code, {
                        "name": f"[{alarm_code}]未定義異常",
                        "description": "0=無故障 1=有故障"
                    })

                    status_text = "有故障" if bit_value else "無故障"

                    bit_info = {
                        "alarm_code": alarm_code,
                        "name": alarm_info["name"],
                        "description": alarm_info["description"],
                        "value": bit_value,
                        "status": status_text,
                        "active": bit_value == 1,
                        "register": register_addr,
                        "bit_position": bit_pos
                    }

                    status_bits[f"bit{bit_pos}"] = bit_info

                    # 收集活躍的異常
                    if bit_value == 1:
                        all_active_alarms.append(bit_info)

                register_data[register_key] = {
                    "register_address": register_addr,
                    "register_value": register_value,
                    "register_hex": f"0x{register_value:04X}",
                    "register_binary": f"{register_value:016b}",
                    "status_bits": status_bits,
                    "active_count": sum(1 for bit in status_bits.values() if bit["active"])
                }

            # 生成異常摘要
            alarm_summary = self._generate_alarm_summary(all_active_alarms)

            return {
                "success": True,
                "alarm_registers": register_data,
                "active_alarms": all_active_alarms,
                "alarm_summary": alarm_summary,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting CDU alarms: {e}")
            return {
                "success": False,
                "message": f"Error getting CDU alarms: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def _get_alarm_definitions(self) -> Dict[str, Dict[str, str]]:
        """獲取異常信息定義"""
        return {
            # R10001 異常信息1 (A001-A016)
            "A001": {"name": "[A001]水泵[1]異常", "description": "0=無故障 1=有故障"},
            "A002": {"name": "[A002]水泵[2]異常", "description": "0=無故障 1=有故障"},
            "A003": {"name": "[A003]水泵[1]通訊故障", "description": "0=無故障 1=有故障"},
            "A004": {"name": "[A004]水泵[2]通訊故障", "description": "0=無故障 1=有故障"},
            "A005": {"name": "[A005]", "description": "0=無故障 1=有故障"},
            "A006": {"name": "[A006]", "description": "0=無故障 1=有故障"},
            "A007": {"name": "[A007]", "description": "0=無故障 1=有故障"},
            "A008": {"name": "[A008]", "description": "0=無故障 1=有故障"},
            "A009": {"name": "[A009]內部回水T12溫度過低", "description": "0=無故障 1=有故障"},
            "A010": {"name": "[A010]內部回水T12溫度過高", "description": "0=無故障 1=有故障"},
            "A011": {"name": "[A011]內部進水T11溫度過低", "description": "0=無故障 1=有故障"},
            "A012": {"name": "[A012]內部進水T11溫度過高", "description": "0=無故障 1=有故障"},
            "A013": {"name": "[A013]內部出水T13溫度過低", "description": "0=無故障 1=有故障"},
            "A014": {"name": "[A014]內部出水T13溫度過高", "description": "0=無故障 1=有故障"},
            "A015": {"name": "[A015]內部回水P12水泵入水壓過低", "description": "0=無故障 1=有故障"},
            "A016": {"name": "[A016]內部回水P12水泵入水壓過高", "description": "0=無故障 1=有故障"},

            # R10002 異常信息2 (A017-A032)
            "A017": {"name": "[A017]內部回水P13水泵入水壓過低", "description": "0=無故障 1=有故障"},
            "A018": {"name": "[A018]內部回水P13水泵入水壓過高", "description": "0=無故障 1=有故障"},
            "A019": {"name": "[A019]", "description": "0=無故障 1=有故障"},
            "A020": {"name": "[A020]", "description": "0=無故障 1=有故障"},
            "A021": {"name": "[A021]", "description": "0=無故障 1=有故障"},
            "A022": {"name": "[A022]", "description": "0=無故障 1=有故障"},
            "A023": {"name": "[A023]", "description": "0=無故障 1=有故障"},
            "A024": {"name": "[A024]", "description": "0=無故障 1=有故障"},
            "A025": {"name": "[A025]內部進水F2流量計量測過低", "description": "0=無故障 1=有故障"},
            "A026": {"name": "[A026]內部進水F2流量計量測過高", "description": "0=無故障 1=有故障"},
            "A027": {"name": "[A027]CDU環境溫度過低", "description": "0=無故障 1=有故障"},
            "A028": {"name": "[A028]CDU環境溫度過高", "description": "0=無故障 1=有故障"},
            "A029": {"name": "[A029]CDU環境濕度過低", "description": "0=無故障 1=有故障"},
            "A030": {"name": "[A030]CDU環境濕度過高", "description": "0=無故障 1=有故障"},
            "A031": {"name": "[A031]露點溫度計算輸入值錯誤", "description": "0=無故障 1=有故障"},
            "A032": {"name": "[A032]內部回水水位不足請確認補液裝置存量足夠", "description": "0=無故障 1=有故障"},

            # R10003 異常信息3 (A033-A048)
            "A033": {"name": "[A033]水泵[1]運轉壓力未上升", "description": "0=無故障 1=有故障"},
            "A034": {"name": "[A034]水泵[2]運轉壓力未上升", "description": "0=無故障 1=有故障"},
            "A035": {"name": "[A035]CDU檢測出管路外有水", "description": "0=無故障 1=有故障"},
            "A036": {"name": "[A036]二次側T12溫度檢查異常", "description": "0=無故障 1=有故障"},
            "A037": {"name": "[A037]二次側T13溫度檢查異常", "description": "0=無故障 1=有故障"},
            "A038": {"name": "[A038]二次側T11溫度檢查異常", "description": "0=無故障 1=有故障"},
            "A039": {"name": "[A039]二次側T2溫度差異過大", "description": "0=無故障 1=有故障"},
            "A040": {"name": "[A040]內部回水P1a與P2壓力差過大", "description": "0=無故障 1=有故障"},
            "A041": {"name": "[A041]二次側P12壓力檢查異常", "description": "0=無故障 1=有故障"},
            "A042": {"name": "[A042]二次側P13壓力檢查異常", "description": "0=無故障 1=有故障"},
            "A043": {"name": "[A043]密碼輸入錯誤3次", "description": "0=無故障 1=有故障"},
            "A044": {"name": "[A044]水泵雙組異常關閉系統", "description": "0=無故障 1=有故障"},
            "A045": {"name": "[A045]ModbusRTU連續通訊異常次數過多(溫溼度計)", "description": "0=無故障 1=有故障"},
            "A046": {"name": "[A046]ModbusTCP連續通訊異常次數過多ET7215.01", "description": "0=無故障 1=有故障"},
            "A047": {"name": "[A047]二次側T3溫度差異過大", "description": "0=無故障 1=有故障"},
            "A048": {"name": "[A048]二次側T4溫度差異過大", "description": "0=無故障 1=有故障"},

            # R10004 異常信息4 (A049-A064)
            "A049": {"name": "[A049]ModbusTCP連續通訊異常次數過多ET7215.04", "description": "0=無故障 1=有故障"},
            "A050": {"name": "[A050]ModbusTCP連續通訊異常次數過多ET7215.05", "description": "0=無故障 1=有故障"},
            "A051": {"name": "[A051]ModbusTCP連續通訊異常次數過多ET7215.06", "description": "0=無故障 1=有故障"},
            "A052": {"name": "[A052]FX5-8AD模組[1]異常", "description": "0=無故障 1=有故障"},
            "A053": {"name": "[A053]FX5-8AD模組[2]異常", "description": "0=無故障 1=有故障"},
            "A054": {"name": "[A054]FX5-4DA-ADP模組異常", "description": "0=無故障 1=有故障"},
            "A055": {"name": "[A055]PLC控制器異常碼產生", "description": "0=無故障 1=有故障"},
            "A056": {"name": "[A056]風扇回饋異常", "description": "0=無故障 1=有故障"},
            "A057": {"name": "[A057]加熱器水槽溫度過高", "description": "0=無故障 1=有故障"},
            "A058": {"name": "[A058]", "description": "0=無故障 1=有故障"},
            "A059": {"name": "[A059]啟動時二次側水壓水位不足", "description": "0=無故障 1=有故障"},
            "A060": {"name": "[A060]T11a感溫棒線路異常", "description": "0=無故障 1=有故障"},
            "A061": {"name": "[A061]T11b感溫棒線路異常", "description": "0=無故障 1=有故障"},
            "A062": {"name": "[A062]T12a感溫棒線路異常", "description": "0=無故障 1=有故障"},
            "A063": {"name": "[A063]T12b感溫棒線路異常", "description": "0=無故障 1=有故障"},
            "A064": {"name": "[A064]T13a感溫棒線路異常", "description": "0=無故障 1=有故障"},

            # R10005 異常信息5 (A065-A080)
            "A065": {"name": "[A065]T13b感溫棒線路異常", "description": "0=無故障 1=有故障"},
            "A066": {"name": "[A066]P1a壓力計線路異常", "description": "0=無故障 1=有故障"},
            "A067": {"name": "[A067]P2壓力計線路異常", "description": "0=無故障 1=有故障"},
            "A068": {"name": "[A068]F2流量計線路異常", "description": "0=無故障 1=有故障"},
            "A069": {"name": "[A069]比例閥線路異常", "description": "0=無故障 1=有故障"},
            "A070": {"name": "[A070]", "description": "0=無故障 1=有故障"},
            "A071": {"name": "[A071]", "description": "0=無故障 1=有故障"},
            "A072": {"name": "[A072]", "description": "0=無故障 1=有故障"},
            "A073": {"name": "[A073]", "description": "0=無故障 1=有故障"},
            "A074": {"name": "[A074]", "description": "0=無故障 1=有故障"},
            "A075": {"name": "[A075]", "description": "0=無故障 1=有故障"},
            "A076": {"name": "[A076]", "description": "0=無故障 1=有故障"},
            "A077": {"name": "[A077]", "description": "0=無故障 1=有故障"},
            "A078": {"name": "[A078]", "description": "0=無故障 1=有故障"},
            "A079": {"name": "[A079]", "description": "0=無故障 1=有故障"},
            "A080": {"name": "[A080]", "description": "0=無故障 1=有故障"}
        }

    def _generate_alarm_summary(self, active_alarms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """生成異常摘要"""
        total_alarms = len(active_alarms)

        # 按類別分組統計
        category_counts = {
            "pump_alarms": 0,      # 水泵相關異常
            "temp_alarms": 0,      # 溫度相關異常
            "pressure_alarms": 0,  # 壓力相關異常
            "comm_alarms": 0,      # 通訊相關異常
            "sensor_alarms": 0,    # 感測器相關異常
            "system_alarms": 0,    # 系統相關異常
            "other_alarms": 0      # 其他異常
        }

        # 關鍵異常列表
        critical_alarms = []

        for alarm in active_alarms:
            alarm_code = alarm["alarm_code"]
            alarm_name = alarm["name"].lower()

            # 分類統計
            if "水泵" in alarm_name or "pump" in alarm_name:
                category_counts["pump_alarms"] += 1
            elif "溫度" in alarm_name or "temp" in alarm_name or "t1" in alarm_name:
                category_counts["temp_alarms"] += 1
            elif "壓力" in alarm_name or "壓" in alarm_name or "pressure" in alarm_name or "p1" in alarm_name or "p2" in alarm_name:
                category_counts["pressure_alarms"] += 1
            elif "通訊" in alarm_name or "modbus" in alarm_name or "comm" in alarm_name:
                category_counts["comm_alarms"] += 1
            elif "感溫棒" in alarm_name or "線路" in alarm_name or "sensor" in alarm_name:
                category_counts["sensor_alarms"] += 1
            elif "plc" in alarm_name or "模組" in alarm_name or "系統" in alarm_name:
                category_counts["system_alarms"] += 1
            else:
                category_counts["other_alarms"] += 1

            # 識別關鍵異常
            if any(keyword in alarm_name for keyword in ["水泵", "系統", "plc", "雙組異常", "水位不足"]):
                critical_alarms.append(alarm)

        # 生成整體狀態
        if total_alarms == 0:
            overall_status = "正常"
            severity = "Normal"
        elif len(critical_alarms) > 0:
            overall_status = "嚴重異常"
            severity = "Critical"
        elif total_alarms >= 5:
            overall_status = "多項異常"
            severity = "Major"
        else:
            overall_status = "輕微異常"
            severity = "Minor"

        return {
            "total_alarms": total_alarms,
            "critical_alarms_count": len(critical_alarms),
            "overall_status": overall_status,
            "severity": severity,
            "category_counts": category_counts,
            "critical_alarms": critical_alarms,
            "has_pump_issues": category_counts["pump_alarms"] > 0,
            "has_temp_issues": category_counts["temp_alarms"] > 0,
            "has_pressure_issues": category_counts["pressure_alarms"] > 0,
            "has_comm_issues": category_counts["comm_alarms"] > 0,
            "has_sensor_issues": category_counts["sensor_alarms"] > 0,
            "has_system_issues": category_counts["system_alarms"] > 0
        }

    def get_cdu_integrated_alarms(self) -> Dict[str, Any]:
        """獲取CDU統合異常信息 - 彙整所有有發生異常動作狀態的信息"""
        try:
            # 獲取機組狀態
            status_result = self.get_cdu_status()
            if not status_result.get("success"):
                logger.error("Failed to get CDU status for integrated alarms")
                status_result = {"success": False, "summary": {}}

            # 獲取異常信息
            alarms_result = self.get_cdu_alarms()
            if not alarms_result.get("success"):
                logger.error("Failed to get CDU alarms for integrated alarms")
                alarms_result = {"success": False, "active_alarms": [], "alarm_summary": {}}

            # 系統概覽
            system_overview = self._generate_system_overview(status_result, alarms_result)

            # 活躍異常摘要
            active_alarms_summary = self._generate_active_alarms_summary(alarms_result)

            # 異常分類詳情
            alarm_categories = self._generate_alarm_categories_detail(alarms_result)

            # 關鍵問題識別
            critical_issues = self._identify_critical_issues(status_result, alarms_result)

            # 建議措施
            recommended_actions = self._generate_recommended_actions(status_result, alarms_result)

            # 系統健康評分
            health_score = self._calculate_system_health_score(status_result, alarms_result)

            return {
                "success": True,
                "system_overview": system_overview,
                "active_alarms_summary": active_alarms_summary,
                "alarm_categories": alarm_categories,
                "critical_issues": critical_issues,
                "recommended_actions": recommended_actions,
                "system_health_score": health_score,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting CDU integrated alarms: {e}")
            return {
                "success": False,
                "message": f"Error getting CDU integrated alarms: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def _generate_system_overview(self, status_result: Dict, alarms_result: Dict) -> Dict[str, Any]:
        """生成系統概覽"""
        status_summary = status_result.get("summary", {})
        alarm_summary = alarms_result.get("alarm_summary", {})

        # 系統運行狀態
        power_on = status_summary.get("power_on", False)
        running = status_summary.get("running", False)
        standby = status_summary.get("standby", False)
        abnormal = status_summary.get("abnormal", False)
        overall_status = status_summary.get("overall_status", "未知")

        # 異常狀態
        total_alarms = alarm_summary.get("total_alarms", 0)
        critical_alarms = alarm_summary.get("critical_alarms_count", 0)
        alarm_severity = alarm_summary.get("severity", "Normal")
        alarm_status = alarm_summary.get("overall_status", "正常")

        # 綜合狀態判斷
        if critical_alarms > 0 or abnormal:
            integrated_status = "嚴重異常"
            status_color = "red"
        elif total_alarms >= 3:
            integrated_status = "多項異常"
            status_color = "orange"
        elif total_alarms > 0:
            integrated_status = "輕微異常"
            status_color = "yellow"
        elif not power_on:
            integrated_status = "系統關機"
            status_color = "gray"
        elif running:
            integrated_status = "正常運行"
            status_color = "green"
        else:
            integrated_status = "待機中"
            status_color = "blue"

        return {
            "integrated_status": integrated_status,
            "status_color": status_color,
            "system_status": {
                "power_on": power_on,
                "running": running,
                "standby": standby,
                "abnormal": abnormal,
                "overall_status": overall_status
            },
            "alarm_status": {
                "total_alarms": total_alarms,
                "critical_alarms": critical_alarms,
                "severity": alarm_severity,
                "overall_status": alarm_status
            },
            "operational_summary": {
                "is_operational": power_on and running and total_alarms == 0,
                "needs_attention": total_alarms > 0 or abnormal,
                "requires_immediate_action": critical_alarms > 0 or abnormal
            }
        }

    def _generate_active_alarms_summary(self, alarms_result: Dict) -> Dict[str, Any]:
        """生成活躍異常摘要"""
        active_alarms = alarms_result.get("active_alarms", [])
        alarm_summary = alarms_result.get("alarm_summary", {})

        # 按優先級分組
        high_priority = []
        medium_priority = []
        low_priority = []

        for alarm in active_alarms:
            alarm_name = alarm.get("name", "").lower()
            if any(keyword in alarm_name for keyword in ["水泵", "系統", "plc", "雙組", "水位"]):
                high_priority.append(alarm)
            elif any(keyword in alarm_name for keyword in ["溫度", "壓力", "通訊", "模組"]):
                medium_priority.append(alarm)
            else:
                low_priority.append(alarm)

        # 最新異常 (假設按順序排列)
        recent_alarms = active_alarms[:5] if active_alarms else []

        return {
            "total_active": len(active_alarms),
            "by_priority": {
                "high": {
                    "count": len(high_priority),
                    "alarms": high_priority
                },
                "medium": {
                    "count": len(medium_priority),
                    "alarms": medium_priority
                },
                "low": {
                    "count": len(low_priority),
                    "alarms": low_priority
                }
            },
            "recent_alarms": recent_alarms,
            "category_distribution": alarm_summary.get("category_counts", {}),
            "severity_assessment": {
                "level": alarm_summary.get("severity", "Normal"),
                "description": self._get_severity_description(alarm_summary.get("severity", "Normal"))
            }
        }

    def _generate_alarm_categories_detail(self, alarms_result: Dict) -> Dict[str, Any]:
        """生成異常分類詳情"""
        active_alarms = alarms_result.get("active_alarms", [])
        alarm_summary = alarms_result.get("alarm_summary", {})

        categories = {
            "pump_systems": {
                "name": "水泵系統",
                "alarms": [],
                "status": "正常",
                "impact": "低"
            },
            "temperature_control": {
                "name": "溫度控制",
                "alarms": [],
                "status": "正常",
                "impact": "低"
            },
            "pressure_systems": {
                "name": "壓力系統",
                "alarms": [],
                "status": "正常",
                "impact": "低"
            },
            "communication": {
                "name": "通訊系統",
                "alarms": [],
                "status": "正常",
                "impact": "低"
            },
            "sensors": {
                "name": "感測器",
                "alarms": [],
                "status": "正常",
                "impact": "低"
            },
            "system_control": {
                "name": "系統控制",
                "alarms": [],
                "status": "正常",
                "impact": "低"
            }
        }

        # 分類異常
        for alarm in active_alarms:
            alarm_name = alarm.get("name", "").lower()

            if "水泵" in alarm_name:
                categories["pump_systems"]["alarms"].append(alarm)
            elif "溫度" in alarm_name or "t1" in alarm_name:
                categories["temperature_control"]["alarms"].append(alarm)
            elif "壓力" in alarm_name or "壓" in alarm_name or "p1" in alarm_name or "p2" in alarm_name:
                categories["pressure_systems"]["alarms"].append(alarm)
            elif "通訊" in alarm_name or "modbus" in alarm_name:
                categories["communication"]["alarms"].append(alarm)
            elif "感溫棒" in alarm_name or "線路" in alarm_name:
                categories["sensors"]["alarms"].append(alarm)
            elif "plc" in alarm_name or "模組" in alarm_name or "系統" in alarm_name:
                categories["system_control"]["alarms"].append(alarm)

        # 更新狀態和影響程度
        for category_key, category in categories.items():
            alarm_count = len(category["alarms"])
            if alarm_count == 0:
                category["status"] = "正常"
                category["impact"] = "無"
            elif alarm_count == 1:
                category["status"] = "輕微異常"
                category["impact"] = "低"
            elif alarm_count <= 3:
                category["status"] = "中度異常"
                category["impact"] = "中"
            else:
                category["status"] = "嚴重異常"
                category["impact"] = "高"

        return categories

    def _identify_critical_issues(self, status_result: Dict, alarms_result: Dict) -> List[Dict[str, Any]]:
        """識別關鍵問題"""
        critical_issues = []

        # 檢查系統狀態關鍵問題
        status_summary = status_result.get("summary", {})
        if status_summary.get("abnormal", False):
            critical_issues.append({
                "type": "system_status",
                "severity": "critical",
                "title": "系統異常狀態",
                "description": "系統檢測到異常狀態，需要立即檢查",
                "source": "R10000 bit7",
                "action_required": "立即檢查系統狀態並排除故障"
            })

        # 檢查關鍵異常
        alarm_summary = alarms_result.get("alarm_summary", {})
        critical_alarms = alarm_summary.get("critical_alarms", [])

        for alarm in critical_alarms:
            alarm_code = alarm.get("alarm_code", "")
            alarm_name = alarm.get("name", "")

            if "水泵" in alarm_name:
                critical_issues.append({
                    "type": "pump_failure",
                    "severity": "critical",
                    "title": f"水泵系統故障 ({alarm_code})",
                    "description": alarm_name,
                    "source": f"R{alarm['register']} bit{alarm['bit_position']}",
                    "action_required": "檢查水泵運行狀態，確認電源和控制信號"
                })
            elif "雙組異常" in alarm_name:
                critical_issues.append({
                    "type": "dual_system_failure",
                    "severity": "critical",
                    "title": f"雙組系統異常 ({alarm_code})",
                    "description": alarm_name,
                    "source": f"R{alarm['register']} bit{alarm['bit_position']}",
                    "action_required": "系統已關閉，需要立即維修"
                })
            elif "PLC" in alarm_name:
                critical_issues.append({
                    "type": "control_system_failure",
                    "severity": "critical",
                    "title": f"控制系統故障 ({alarm_code})",
                    "description": alarm_name,
                    "source": f"R{alarm['register']} bit{alarm['bit_position']}",
                    "action_required": "檢查PLC控制器狀態和程序"
                })
            elif "水位不足" in alarm_name:
                critical_issues.append({
                    "type": "water_level_low",
                    "severity": "critical",
                    "title": f"水位不足 ({alarm_code})",
                    "description": alarm_name,
                    "source": f"R{alarm['register']} bit{alarm['bit_position']}",
                    "action_required": "檢查補液裝置和水位傳感器"
                })

        # 檢查多重故障
        total_alarms = alarm_summary.get("total_alarms", 0)
        if total_alarms >= 5:
            critical_issues.append({
                "type": "multiple_failures",
                "severity": "major",
                "title": "多重系統故障",
                "description": f"檢測到{total_alarms}項異常，系統可能存在嚴重問題",
                "source": "多個暫存器",
                "action_required": "進行全面系統檢查和維護"
            })

        return critical_issues

    def _generate_recommended_actions(self, status_result: Dict, alarms_result: Dict) -> List[str]:
        """生成建議措施"""
        actions = []

        status_summary = status_result.get("summary", {})
        alarm_summary = alarms_result.get("alarm_summary", {})
        active_alarms = alarms_result.get("active_alarms", [])

        # 基於系統狀態的建議
        if not status_summary.get("power_on", False):
            actions.append("檢查系統電源狀態，確認是否需要開機")
        elif status_summary.get("abnormal", False):
            actions.append("立即檢查系統異常狀態，查看錯誤日誌")
        elif status_summary.get("standby", False) and len(active_alarms) == 0:
            actions.append("系統處於待機狀態，可考慮啟動運行")

        # 基於異常類型的建議
        category_counts = alarm_summary.get("category_counts", {})

        if category_counts.get("pump_alarms", 0) > 0:
            actions.append("檢查水泵系統：確認電源、控制信號和機械狀態")

        if category_counts.get("temp_alarms", 0) > 0:
            actions.append("檢查溫度控制系統：確認感溫棒和控制邏輯")

        if category_counts.get("pressure_alarms", 0) > 0:
            actions.append("檢查壓力系統：確認壓力傳感器和管路狀態")

        if category_counts.get("comm_alarms", 0) > 0:
            actions.append("檢查通訊系統：確認Modbus連接和設備狀態")

        if category_counts.get("sensor_alarms", 0) > 0:
            actions.append("檢查感測器系統：確認線路連接和校準狀態")

        if category_counts.get("system_alarms", 0) > 0:
            actions.append("檢查控制系統：確認PLC和模組狀態")

        # 基於嚴重程度的建議
        severity = alarm_summary.get("severity", "Normal")
        if severity == "Critical":
            actions.append("立即停機檢修，聯繫維護人員")
        elif severity == "Major":
            actions.append("安排緊急維護，監控系統運行狀態")
        elif severity == "Minor":
            actions.append("安排定期維護，持續監控異常狀態")

        # 預防性建議
        if len(active_alarms) == 0:
            actions.append("系統運行正常，建議定期進行預防性維護")
        else:
            actions.append("建議建立異常處理記錄，追蹤問題解決進度")

        return actions if actions else ["系統狀態良好，繼續正常運行"]

    def _calculate_system_health_score(self, status_result: Dict, alarms_result: Dict) -> int:
        """計算系統健康評分 (0-100)"""
        score = 100

        status_summary = status_result.get("summary", {})
        alarm_summary = alarms_result.get("alarm_summary", {})

        # 基於系統狀態扣分
        if not status_summary.get("power_on", False):
            score -= 20  # 系統關機
        elif status_summary.get("abnormal", False):
            score -= 30  # 系統異常
        elif status_summary.get("standby", False):
            score -= 5   # 待機狀態

        # 基於異常數量扣分
        total_alarms = alarm_summary.get("total_alarms", 0)
        critical_alarms = alarm_summary.get("critical_alarms_count", 0)

        score -= critical_alarms * 15  # 每個關鍵異常扣15分
        score -= (total_alarms - critical_alarms) * 5  # 每個一般異常扣5分

        # 基於異常類別扣分
        category_counts = alarm_summary.get("category_counts", {})
        if category_counts.get("pump_alarms", 0) > 0:
            score -= 10  # 水泵問題
        if category_counts.get("system_alarms", 0) > 0:
            score -= 10  # 系統問題

        # 確保分數在0-100範圍內
        return max(0, min(100, score))

    def _get_severity_description(self, severity: str) -> str:
        """獲取嚴重程度描述"""
        descriptions = {
            "Normal": "系統運行正常，無異常狀態",
            "Minor": "存在輕微異常，建議關注但不影響正常運行",
            "Major": "存在多項異常，需要安排維護檢查",
            "Critical": "存在嚴重異常，需要立即處理"
        }
        return descriptions.get(severity, "未知嚴重程度")

    def execute_cdu_operation(self, operation: str) -> Dict[str, Any]:
        """執行CDU操作設置"""
        try:
            # 定義操作設置映射
            operation_definitions = self._get_operation_definitions()

            if operation not in operation_definitions:
                return {
                    "success": False,
                    "message": f"不支援的操作類型: {operation}",
                    "timestamp": datetime.now().isoformat()
                }

            op_config = operation_definitions[operation]
            register_address = op_config["register"]
            value_to_write = op_config["value"]
            description = op_config["description"]

            # 執行寫入操作
            write_result = self.write_r_register(register_address, value_to_write)

            if not write_result.get("success"):
                return {
                    "success": False,
                    "operation": operation,
                    "register_address": register_address,
                    "message": f"寫入失敗: {write_result.get('message', '未知錯誤')}",
                    "timestamp": datetime.now().isoformat()
                }

            # 驗證寫入結果
            time.sleep(0.5)  # 等待寫入生效
            read_result = self.read_single_r_register(register_address)

            if read_result.get("success") and read_result.get("value") == value_to_write:
                status = "操作執行成功"
            else:
                status = "操作可能未完全生效，請檢查系統狀態"

            return {
                "success": True,
                "operation": operation,
                "register_address": register_address,
                "value_written": value_to_write,
                "operation_description": description,
                "status": status,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error executing CDU operation {operation}: {e}")
            return {
                "success": False,
                "operation": operation,
                "message": f"操作執行失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def get_cdu_operations_status(self) -> Dict[str, Any]:
        """獲取CDU操作設置狀態"""
        try:
            operation_definitions = self._get_operation_definitions()
            operations_status = {}

            for op_name, op_config in operation_definitions.items():
                register_address = op_config["register"]
                expected_value = op_config["value"]
                description = op_config["description"]

                # 讀取當前暫存器值
                read_result = self.read_single_r_register(register_address)

                if read_result.get("success"):
                    current_value = read_result.get("value", 0)
                    is_active = current_value == expected_value

                    operations_status[op_name] = {
                        "register_address": register_address,
                        "expected_value": expected_value,
                        "current_value": current_value,
                        "is_active": is_active,
                        "description": description,
                        "status": "已啟動" if is_active else "未啟動"
                    }
                else:
                    operations_status[op_name] = {
                        "register_address": register_address,
                        "expected_value": expected_value,
                        "current_value": None,
                        "is_active": False,
                        "description": description,
                        "status": "讀取失敗",
                        "error": read_result.get("message", "未知錯誤")
                    }

            return {
                "success": True,
                "operations_status": operations_status,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting CDU operations status: {e}")
            return {
                "success": False,
                "message": f"獲取操作狀態失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def _get_operation_definitions(self) -> Dict[str, Dict[str, Any]]:
        """獲取操作設置定義"""
        return {
            "start": {
                "register": 10500,
                "value": 2321,
                "description": "CDU遠端啟動",
                "function_code": "0x06"
            },
            "stop": {
                "register": 10501,
                "value": 2322,
                "description": "CDU遠端停止",
                "function_code": "0x06"
            },
            "fan_start": {
                "register": 10502,
                "value": 2321,
                "description": "風扇遠端手動強制啟動",
                "function_code": "0x06"
            },
            "fan_stop": {
                "register": 10503,
                "value": 2322,
                "description": "風扇遠端手動強制停止",
                "function_code": "0x06"
            }
        }

    def write_cdu_value(self, parameter: str, value: float) -> Dict[str, Any]:
        """寫入CDU數值設定"""
        try:
            # 定義數值寫入映射
            value_definitions = self._get_value_definitions()

            if parameter not in value_definitions:
                return {
                    "success": False,
                    "message": f"不支援的參數類型: {parameter}",
                    "timestamp": datetime.now().isoformat()
                }

            param_config = value_definitions[parameter]
            register_address = param_config["register"]
            min_range = param_config["min_range"]
            max_range = param_config["max_range"]
            precision = param_config["precision"]
            unit = param_config["unit"]
            description = param_config["description"]

            # 檢查數值範圍
            if not (param_config["min_value"] <= value <= param_config["max_value"]):
                return {
                    "success": False,
                    "parameter": parameter,
                    "message": f"數值超出範圍: {value} (允許範圍: {param_config['min_value']}-{param_config['max_value']} {unit})",
                    "timestamp": datetime.now().isoformat()
                }

            # 轉換為暫存器值
            register_value = int(min_range + (value / precision))

            # 檢查暫存器值範圍
            if not (min_range <= register_value <= max_range):
                return {
                    "success": False,
                    "parameter": parameter,
                    "message": f"轉換後的暫存器值超出範圍: {register_value} (允許範圍: {min_range}-{max_range})",
                    "timestamp": datetime.now().isoformat()
                }

            # 執行寫入操作
            write_result = self.write_r_register(register_address, register_value)

            if not write_result.get("success"):
                return {
                    "success": False,
                    "parameter": parameter,
                    "register_address": register_address,
                    "message": f"寫入失敗: {write_result.get('message', '未知錯誤')}",
                    "timestamp": datetime.now().isoformat()
                }

            # 驗證寫入結果
            time.sleep(0.5)  # 等待寫入生效
            read_result = self.read_single_r_register(register_address)

            if read_result.get("success"):
                actual_register_value = read_result.get("value", 0)
                actual_value = (actual_register_value - min_range) * precision

                if actual_register_value == register_value:
                    status = "數值寫入成功"
                else:
                    status = f"數值可能未完全生效 (預期: {register_value}, 實際: {actual_register_value})"
            else:
                actual_register_value = register_value
                actual_value = value
                status = "寫入完成，但無法驗證結果"

            return {
                "success": True,
                "parameter": parameter,
                "register_address": register_address,
                "input_value": value,
                "register_value": register_value,
                "actual_value": actual_value,
                "unit": unit,
                "description": description,
                "status": status,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error writing CDU value {parameter}: {e}")
            return {
                "success": False,
                "parameter": parameter,
                "message": f"數值寫入失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def get_cdu_values_status(self) -> Dict[str, Any]:
        """獲取CDU數值設定狀態"""
        try:
            value_definitions = self._get_value_definitions()
            values_status = {}

            for param_name, param_config in value_definitions.items():
                register_address = param_config["register"]
                min_range = param_config["min_range"]
                precision = param_config["precision"]
                unit = param_config["unit"]
                description = param_config["description"]

                # 讀取當前暫存器值
                read_result = self.read_single_r_register(register_address)

                if read_result.get("success"):
                    register_value = read_result.get("value", 0)
                    actual_value = (register_value - min_range) * precision

                    # 確保數值在合理範圍內
                    if register_value < min_range:
                        actual_value = 0
                        status = "數值異常 (低於最小範圍)"
                    elif register_value > param_config["max_range"]:
                        actual_value = param_config["max_value"]
                        status = "數值異常 (超出最大範圍)"
                    else:
                        status = "正常"

                    values_status[param_name] = {
                        "register_address": register_address,
                        "register_value": register_value,
                        "actual_value": round(actual_value, 1),
                        "unit": unit,
                        "description": description,
                        "status": status,
                        "value_range": f"{param_config['min_value']}-{param_config['max_value']} {unit}",
                        "register_range": f"{min_range}-{param_config['max_range']}"
                    }
                else:
                    values_status[param_name] = {
                        "register_address": register_address,
                        "register_value": None,
                        "actual_value": None,
                        "unit": unit,
                        "description": description,
                        "status": "讀取失敗",
                        "value_range": f"{param_config['min_value']}-{param_config['max_value']} {unit}",
                        "register_range": f"{min_range}-{param_config['max_range']}",
                        "error": read_result.get("message", "未知錯誤")
                    }

            return {
                "success": True,
                "values_status": values_status,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting CDU values status: {e}")
            return {
                "success": False,
                "message": f"獲取數值狀態失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def _get_value_definitions(self) -> Dict[str, Dict[str, Any]]:
        """獲取數值寫入定義"""
        return {
            "temp_setting": {
                "register": 10600,
                "precision": 0.1,
                "min_value": 0.0,
                "max_value": 60.0,
                "min_range": 3000,
                "max_range": 3600,
                "unit": "℃",
                "description": "溫度設定",
                "function_code": "0x06"
            },
            "flow_setting": {
                "register": 10601,
                "precision": 0.1,
                "min_value": 0.0,
                "max_value": 60.0,
                "min_range": 3000,
                "max_range": 3600,
                "unit": "LPM",
                "description": "流量設定",
                "function_code": "0x06"
            },
            "fan_speed": {
                "register": 10605,
                "precision": 1.0,
                "min_value": 0.0,
                "max_value": 100.0,
                "min_range": 3000,
                "max_range": 3100,
                "unit": "%",
                "description": "風扇轉速%",
                "function_code": "0x06"
            },
            "pump1_speed": {
                "register": 10606,
                "precision": 1.0,
                "min_value": 0.0,
                "max_value": 100.0,
                "min_range": 3000,
                "max_range": 3100,
                "unit": "%",
                "description": "水泵1轉速%",
                "function_code": "0x06"
            },
            "pump2_speed": {
                "register": 10607,
                "precision": 1.0,
                "min_value": 0.0,
                "max_value": 100.0,
                "min_range": 3000,
                "max_range": 3100,
                "unit": "%",
                "description": "水泵2轉速%",
                "function_code": "0x06"
            }
        }

    def get_cdu_sensors_data(self, sensor_type: str = None, sensor_name: str = None) -> Dict[str, Any]:
        """獲取CDU感測器數據"""
        try:
            # 定義感測器映射
            sensor_definitions = self._get_sensor_definitions()

            # 如果指定了感測器類型，只讀取該類型
            if sensor_type:
                if sensor_type not in sensor_definitions:
                    return {
                        "success": False,
                        "message": f"不支援的感測器類型: {sensor_type}",
                        "timestamp": datetime.now().isoformat()
                    }
                sensor_types_to_read = [sensor_type]
            else:
                sensor_types_to_read = list(sensor_definitions.keys())

            sensors_data = {}
            sensor_summary = {
                "total_sensors": 0,
                "active_sensors": 0,
                "error_sensors": 0,
                "sensor_types": {}
            }

            # 讀取各類型感測器數據
            for s_type in sensor_types_to_read:
                type_config = sensor_definitions[s_type]
                type_data = {}
                type_summary = {
                    "count": 0,
                    "active": 0,
                    "errors": 0
                }

                for sensor_key, sensor_config in type_config["sensors"].items():
                    # 如果指定了特定感測器名稱，只讀取該感測器
                    if sensor_name and sensor_key != sensor_name:
                        continue

                    register_address = sensor_config["register"]

                    # 讀取感測器數據
                    read_result = self.read_single_r_register(register_address)

                    if read_result.get("success"):
                        raw_value = read_result.get("value", 0)

                        # 轉換為實際值
                        actual_value = self._convert_sensor_value(raw_value, sensor_config)

                        # 判斷感測器狀態
                        status = self._get_sensor_status(actual_value, sensor_config)

                        type_data[sensor_key] = {
                            "register_address": register_address,
                            "raw_value": raw_value,
                            "actual_value": actual_value,
                            "unit": sensor_config.get("unit", ""),
                            "description": sensor_config["description"],
                            "precision": sensor_config.get("precision", 1),
                            "range": sensor_config.get("range", ""),
                            "status": status,
                            "is_active": status == "正常",
                            "is_reserved": sensor_config.get("reserved", False)
                        }

                        type_summary["count"] += 1
                        if status == "正常":
                            type_summary["active"] += 1
                        else:
                            type_summary["errors"] += 1
                    else:
                        type_data[sensor_key] = {
                            "register_address": register_address,
                            "raw_value": None,
                            "actual_value": None,
                            "unit": sensor_config.get("unit", ""),
                            "description": sensor_config["description"],
                            "status": "讀取失敗",
                            "is_active": False,
                            "is_reserved": sensor_config.get("reserved", False),
                            "error": read_result.get("message", "未知錯誤")
                        }

                        type_summary["count"] += 1
                        type_summary["errors"] += 1

                sensors_data[s_type] = {
                    "type_name": type_config["name"],
                    "sensors": type_data,
                    "summary": type_summary
                }

                # 更新總摘要
                sensor_summary["total_sensors"] += type_summary["count"]
                sensor_summary["active_sensors"] += type_summary["active"]
                sensor_summary["error_sensors"] += type_summary["errors"]
                sensor_summary["sensor_types"][s_type] = type_summary

            return {
                "success": True,
                "sensors_data": sensors_data,
                "sensor_summary": sensor_summary,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting CDU sensors data: {e}")
            return {
                "success": False,
                "message": f"獲取感測器數據失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def _get_sensor_definitions(self) -> Dict[str, Dict[str, Any]]:
        """獲取感測器定義 - 支援動態機種配置"""
        # 檢查是否有緩存的感測器定義
        if hasattr(self, '_cached_sensor_definitions'):
            return self._cached_sensor_definitions

        # 獲取當前機種類型
        current_machine = self._get_current_machine_type()

        # 載入機種配置
        machine_configs = self._load_machine_configs()

        if current_machine in machine_configs:
            # 使用當前機種的感測器配置
            sensor_config = machine_configs[current_machine]["sensor_config"]
            self._cached_sensor_definitions = sensor_config
            logger.info(f"Using sensor definitions for machine type: {current_machine}")
            return sensor_config
        else:
            # 使用默認感測器配置
            logger.warning(f"Machine type {current_machine} not found, using default configuration")
            return self._get_default_sensor_definitions()

    def _get_default_sensor_definitions(self) -> Dict[str, Dict[str, Any]]:
        """獲取默認感測器定義"""
        return {
            "flow": {
                "name": "流量訊息",
                "sensors": {
                    "flow_reserved_1": {"register": 10061, "description": "F預留", "reserved": True},
                    "secondary_outlet_flow_f2": {
                        "register": 10062,
                        "description": "二次側出水量F2",
                        "precision": 1,
                        "range": "0~700 (對應0~70LPM)",
                        "unit": "LPM",
                        "min_raw": 0,
                        "max_raw": 700,
                        "min_actual": 0,
                        "max_actual": 70,
                        "conversion_factor": 0.1
                    },
                    **{f"flow_reserved_{i}": {"register": 10062 + i, "description": "F預留", "reserved": True}
                       for i in range(2, 20)}
                }
            },
            "pressure": {
                "name": "壓力訊息",
                "sensors": {
                    "pressure_reserved_1": {"register": 10081, "description": "P預留", "reserved": True},
                    "secondary_inlet_pressure_p12": {
                        "register": 10082,
                        "description": "二次側入水壓力P12",
                        "precision": 0.01,
                        "range": "5~600 (對應0.05~6bar)",
                        "unit": "bar",
                        "min_raw": 5,
                        "max_raw": 600,
                        "min_actual": 0.05,
                        "max_actual": 6.0,
                        "conversion_factor": 0.01
                    },
                    "secondary_outlet_pressure_p13": {
                        "register": 10083,
                        "description": "二次側出水壓力P13",
                        "precision": 0.01,
                        "range": "5~600 (對應0.05~6bar)",
                        "unit": "bar",
                        "min_raw": 5,
                        "max_raw": 600,
                        "min_actual": 0.05,
                        "max_actual": 6.0,
                        "conversion_factor": 0.01
                    },
                    **{f"pressure_reserved_{i}": {"register": 10083 + i, "description": "P預留", "reserved": True}
                       for i in range(2, 30)}
                }
            },
            "temperature": {
                "name": "溫度訊息",
                "sensors": {
                    "secondary_return_temp_t11": {
                        "register": 10111,
                        "description": "二次側回水溫度T11",
                        "precision": 0.1,
                        "range": "100~800 (對應10~80℃)",
                        "unit": "℃",
                        "min_raw": 100,
                        "max_raw": 800,
                        "min_actual": 10.0,
                        "max_actual": 80.0,
                        "conversion_factor": 0.1
                    },
                    "secondary_tank_temp_t12": {
                        "register": 10112,
                        "description": "二次側水箱溫度T12",
                        "precision": 0.1,
                        "range": "100~800 (對應10~80℃)",
                        "unit": "℃",
                        "min_raw": 100,
                        "max_raw": 800,
                        "min_actual": 10.0,
                        "max_actual": 80.0,
                        "conversion_factor": 0.1
                    },
                    "secondary_outlet_temp_t13": {
                        "register": 10113,
                        "description": "二次側出水溫度T13",
                        "precision": 0.1,
                        "range": "100~800 (對應10~80℃)",
                        "unit": "℃",
                        "min_raw": 100,
                        "max_raw": 800,
                        "min_actual": 10.0,
                        "max_actual": 80.0,
                        "conversion_factor": 0.1
                    },
                    **{f"temp_reserved_{i}": {"register": 10113 + i, "description": "T預留", "reserved": True}
                       for i in range(2, 30)}
                }
            },
            "io": {
                "name": "輸入輸出訊息",
                "sensors": {
                    "tank_level_switch_x17": {
                        "register": 10141,
                        "description": "二次側水箱液位開關X17",
                        "precision": 0,
                        "range": "0~1",
                        "unit": "",
                        "status_map": {0: "正常", 1: "高水位"}
                    },
                    "io_reserved_1": {"register": 10142, "description": "IO預留", "reserved": True},
                    "leak_detection_x16": {
                        "register": 10143,
                        "description": "盛水盤漏液偵測X16",
                        "precision": 0,
                        "range": "0~1",
                        "unit": "",
                        "status_map": {0: "漏水", 1: "正常"}
                    },
                    "io_reserved_2": {"register": 10144, "description": "IO預留", "reserved": True},
                    **{f"io_na_{i}": {"register": 10144 + i, "description": "IO_NA", "reserved": True}
                       for i in range(2, 8)},
                    "water_pump_output_y17": {
                        "register": 10151,
                        "description": "補水泵輸出Y17",
                        "precision": 0,
                        "range": "0~1",
                        "unit": "",
                        "status_map": {0: "待機", 1: "動作"}
                    },
                    **{f"io_na_{i}": {"register": 10151 + i, "description": "IO_NA", "reserved": True}
                       for i in range(2, 10)}
                }
            }
        }

    def _convert_sensor_value(self, raw_value: int, sensor_config: Dict[str, Any]) -> float:
        """轉換感測器原始值為實際值"""
        if sensor_config.get("reserved", False):
            return raw_value

        # 檢查是否有狀態映射 (用於IO類型)
        if "status_map" in sensor_config:
            return raw_value

        # 檢查是否有轉換因子
        if "conversion_factor" in sensor_config:
            return raw_value * sensor_config["conversion_factor"]

        # 檢查是否有範圍轉換
        if all(key in sensor_config for key in ["min_raw", "max_raw", "min_actual", "max_actual"]):
            min_raw = sensor_config["min_raw"]
            max_raw = sensor_config["max_raw"]
            min_actual = sensor_config["min_actual"]
            max_actual = sensor_config["max_actual"]

            # 線性轉換
            if max_raw != min_raw:
                ratio = (raw_value - min_raw) / (max_raw - min_raw)
                actual_value = min_actual + ratio * (max_actual - min_actual)
                return round(actual_value, 2)

        # 默認返回原始值
        return raw_value

    def _get_sensor_status(self, actual_value: float, sensor_config: Dict[str, Any]) -> str:
        """獲取感測器狀態"""
        if sensor_config.get("reserved", False):
            return "預留"

        # 檢查是否有狀態映射 (用於IO類型)
        if "status_map" in sensor_config:
            status_map = sensor_config["status_map"]
            int_value = int(actual_value)
            return status_map.get(int_value, f"未知狀態({int_value})")

        # 檢查數值範圍
        if all(key in sensor_config for key in ["min_actual", "max_actual"]):
            min_val = sensor_config["min_actual"]
            max_val = sensor_config["max_actual"]

            if min_val <= actual_value <= max_val:
                return "正常"
            elif actual_value < min_val:
                return "低於範圍"
            else:
                return "超出範圍"

        # 默認狀態
        return "正常"

    def get_cdu_sensors_batch(self, sensor_types: List[str], include_reserved: bool = False) -> Dict[str, Any]:
        """批量獲取CDU感測器數據"""
        try:
            all_sensors_data = {}
            batch_summary = {
                "total_sensors": 0,
                "active_sensors": 0,
                "error_sensors": 0,
                "sensor_types_count": len(sensor_types)
            }

            for sensor_type in sensor_types:
                result = self.get_cdu_sensors_data(sensor_type)

                if result.get("success"):
                    sensors_data = result["sensors_data"]

                    # 過濾預留感測器 (如果不包含)
                    if not include_reserved:
                        for type_key, type_data in sensors_data.items():
                            filtered_sensors = {
                                k: v for k, v in type_data["sensors"].items()
                                if not v.get("is_reserved", False)
                            }
                            type_data["sensors"] = filtered_sensors

                            # 重新計算摘要
                            type_summary = {
                                "count": len(filtered_sensors),
                                "active": sum(1 for s in filtered_sensors.values() if s.get("is_active", False)),
                                "errors": sum(1 for s in filtered_sensors.values() if s.get("status") not in ["正常", "預留"])
                            }
                            type_data["summary"] = type_summary

                    all_sensors_data.update(sensors_data)

                    # 更新批量摘要
                    for type_data in sensors_data.values():
                        summary = type_data["summary"]
                        batch_summary["total_sensors"] += summary["count"]
                        batch_summary["active_sensors"] += summary["active"]
                        batch_summary["error_sensors"] += summary["errors"]
                else:
                    logger.warning(f"Failed to read sensor type {sensor_type}: {result.get('message')}")

            return {
                "success": True,
                "sensors_data": all_sensors_data,
                "batch_summary": batch_summary,
                "include_reserved": include_reserved,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting CDU sensors batch: {e}")
            return {
                "success": False,
                "message": f"批量獲取感測器數據失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def create_machine_config(self, machine_type: str, machine_name: str, description: str, sensor_config: Dict[str, Any]) -> Dict[str, Any]:
        """創建CDU機種配置"""
        try:
            # 驗證機種配置
            validation_result = self._validate_machine_config(sensor_config)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "message": f"機種配置驗證失敗: {validation_result['message']}",
                    "timestamp": datetime.now().isoformat()
                }

            # 保存機種配置
            machine_configs = self._load_machine_configs()

            machine_configs[machine_type] = {
                "machine_name": machine_name,
                "description": description,
                "sensor_config": sensor_config,
                "created_time": datetime.now().isoformat(),
                "updated_time": datetime.now().isoformat()
            }

            # 保存到文件
            save_result = self._save_machine_configs(machine_configs)
            if not save_result["success"]:
                return {
                    "success": False,
                    "message": f"保存機種配置失敗: {save_result['message']}",
                    "timestamp": datetime.now().isoformat()
                }

            return {
                "success": True,
                "machine_type": machine_type,
                "machine_name": machine_name,
                "description": description,
                "sensor_config": sensor_config,
                "message": f"機種配置 {machine_type} 創建成功",
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error creating machine config {machine_type}: {e}")
            return {
                "success": False,
                "message": f"創建機種配置失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def get_machine_configs(self) -> Dict[str, Any]:
        """獲取所有CDU機種配置"""
        try:
            machine_configs = self._load_machine_configs()
            current_machine = self._get_current_machine_type()

            return {
                "success": True,
                "machine_configs": machine_configs,
                "current_machine": current_machine,
                "total_machines": len(machine_configs),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting machine configs: {e}")
            return {
                "success": False,
                "message": f"獲取機種配置失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def set_current_machine(self, machine_type: str) -> Dict[str, Any]:
        """設定當前使用的CDU機種"""
        try:
            machine_configs = self._load_machine_configs()

            if machine_type not in machine_configs:
                return {
                    "success": False,
                    "message": f"機種類型 {machine_type} 不存在",
                    "timestamp": datetime.now().isoformat()
                }

            # 保存當前機種設定
            current_config = {
                "current_machine": machine_type,
                "set_time": datetime.now().isoformat()
            }

            save_result = self._save_current_machine_config(current_config)
            if not save_result["success"]:
                return {
                    "success": False,
                    "message": f"設定當前機種失敗: {save_result['message']}",
                    "timestamp": datetime.now().isoformat()
                }

            # 重新載入感測器定義
            self._reload_sensor_definitions()

            return {
                "success": True,
                "machine_type": machine_type,
                "machine_name": machine_configs[machine_type]["machine_name"],
                "message": f"當前機種已設定為 {machine_type}",
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error setting current machine {machine_type}: {e}")
            return {
                "success": False,
                "message": f"設定當前機種失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def delete_machine_config(self, machine_type: str) -> Dict[str, Any]:
        """刪除CDU機種配置"""
        try:
            machine_configs = self._load_machine_configs()

            if machine_type not in machine_configs:
                return {
                    "success": False,
                    "message": f"機種類型 {machine_type} 不存在",
                    "timestamp": datetime.now().isoformat()
                }

            # 檢查是否為當前使用的機種
            current_machine = self._get_current_machine_type()
            if current_machine == machine_type:
                return {
                    "success": False,
                    "message": f"無法刪除當前使用的機種 {machine_type}，請先切換到其他機種",
                    "timestamp": datetime.now().isoformat()
                }

            # 刪除機種配置
            deleted_config = machine_configs.pop(machine_type)

            # 保存更新後的配置
            save_result = self._save_machine_configs(machine_configs)
            if not save_result["success"]:
                return {
                    "success": False,
                    "message": f"保存機種配置失敗: {save_result['message']}",
                    "timestamp": datetime.now().isoformat()
                }

            return {
                "success": True,
                "machine_type": machine_type,
                "deleted_config": deleted_config,
                "message": f"機種配置 {machine_type} 已刪除",
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error deleting machine config {machine_type}: {e}")
            return {
                "success": False,
                "message": f"刪除機種配置失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def _validate_machine_config(self, sensor_config: Dict[str, Any]) -> Dict[str, Any]:
        """驗證機種配置"""
        try:
            required_types = ["temperature", "pressure", "flow", "io"]

            for sensor_type in required_types:
                if sensor_type not in sensor_config:
                    return {
                        "valid": False,
                        "message": f"缺少必要的感測器類型: {sensor_type}"
                    }

                type_config = sensor_config[sensor_type]
                if "sensors" not in type_config:
                    return {
                        "valid": False,
                        "message": f"感測器類型 {sensor_type} 缺少 sensors 配置"
                    }

                # 驗證感測器配置
                for sensor_name, sensor_info in type_config["sensors"].items():
                    if "register" not in sensor_info:
                        return {
                            "valid": False,
                            "message": f"感測器 {sensor_name} 缺少 register 配置"
                        }

                    if "description" not in sensor_info:
                        return {
                            "valid": False,
                            "message": f"感測器 {sensor_name} 缺少 description 配置"
                        }

            return {"valid": True, "message": "配置驗證通過"}

        except Exception as e:
            return {
                "valid": False,
                "message": f"配置驗證錯誤: {str(e)}"
            }

    def _load_machine_configs(self) -> Dict[str, Any]:
        """載入機種配置"""
        try:
            import os
            config_file = "cdu_machine_configs.json"

            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # 返回默認配置
                return self._get_default_machine_configs()

        except Exception as e:
            logger.warning(f"Failed to load machine configs: {e}")
            return self._get_default_machine_configs()

    def _save_machine_configs(self, machine_configs: Dict[str, Any]) -> Dict[str, Any]:
        """保存機種配置"""
        try:
            config_file = "cdu_machine_configs.json"

            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(machine_configs, f, ensure_ascii=False, indent=2)

            return {"success": True, "message": "機種配置保存成功"}

        except Exception as e:
            logger.error(f"Failed to save machine configs: {e}")
            return {"success": False, "message": f"保存失敗: {str(e)}"}

    def _get_current_machine_type(self) -> str:
        """獲取當前機種類型"""
        try:
            import os
            current_config_file = "cdu_current_machine.json"

            if os.path.exists(current_config_file):
                with open(current_config_file, 'r', encoding='utf-8') as f:
                    current_config = json.load(f)
                    return current_config.get("current_machine", "default")
            else:
                return "default"

        except Exception as e:
            logger.warning(f"Failed to get current machine type: {e}")
            return "default"

    def _save_current_machine_config(self, current_config: Dict[str, Any]) -> Dict[str, Any]:
        """保存當前機種配置"""
        try:
            current_config_file = "cdu_current_machine.json"

            with open(current_config_file, 'w', encoding='utf-8') as f:
                json.dump(current_config, f, ensure_ascii=False, indent=2)

            return {"success": True, "message": "當前機種配置保存成功"}

        except Exception as e:
            logger.error(f"Failed to save current machine config: {e}")
            return {"success": False, "message": f"保存失敗: {str(e)}"}

    def _reload_sensor_definitions(self):
        """重新載入感測器定義"""
        try:
            # 清除緩存的感測器定義
            if hasattr(self, '_cached_sensor_definitions'):
                delattr(self, '_cached_sensor_definitions')
            logger.info("Sensor definitions reloaded")
        except Exception as e:
            logger.warning(f"Failed to reload sensor definitions: {e}")

    def _get_default_machine_configs(self) -> Dict[str, Any]:
        """獲取默認機種配置"""
        return {
            "default": {
                "machine_name": "標準CDU機種",
                "description": "默認的CDU機種配置，包含所有標準感測器",
                "sensor_config": self._get_default_sensor_definitions(),
                "created_time": datetime.now().isoformat(),
                "updated_time": datetime.now().isoformat()
            },
            "cdu_compact": {
                "machine_name": "緊湊型CDU",
                "description": "緊湊型CDU機種，感測器數量較少",
                "sensor_config": {
                    "temperature": {
                        "name": "溫度訊息",
                        "sensors": {
                            "secondary_return_temp_t11": {
                                "register": 10111,
                                "description": "二次側回水溫度T11",
                                "precision": 0.1,
                                "range": "100~800 (對應10~80℃)",
                                "unit": "℃",
                                "min_raw": 100,
                                "max_raw": 800,
                                "min_actual": 10.0,
                                "max_actual": 80.0,
                                "conversion_factor": 0.1
                            },
                            "secondary_tank_temp_t12": {
                                "register": 10112,
                                "description": "二次側水箱溫度T12",
                                "precision": 0.1,
                                "range": "100~800 (對應10~80℃)",
                                "unit": "℃",
                                "min_raw": 100,
                                "max_raw": 800,
                                "min_actual": 10.0,
                                "max_actual": 80.0,
                                "conversion_factor": 0.1
                            }
                        }
                    },
                    "pressure": {
                        "name": "壓力訊息",
                        "sensors": {
                            "secondary_inlet_pressure_p12": {
                                "register": 10082,
                                "description": "二次側入水壓力P12",
                                "precision": 0.01,
                                "range": "5~600 (對應0.05~6bar)",
                                "unit": "bar",
                                "min_raw": 5,
                                "max_raw": 600,
                                "min_actual": 0.05,
                                "max_actual": 6.0,
                                "conversion_factor": 0.01
                            }
                        }
                    },
                    "flow": {
                        "name": "流量訊息",
                        "sensors": {
                            "secondary_outlet_flow_f2": {
                                "register": 10062,
                                "description": "二次側出水量F2",
                                "precision": 1,
                                "range": "0~700 (對應0~70LPM)",
                                "unit": "LPM",
                                "min_raw": 0,
                                "max_raw": 700,
                                "min_actual": 0,
                                "max_actual": 70,
                                "conversion_factor": 0.1
                            }
                        }
                    },
                    "io": {
                        "name": "輸入輸出訊息",
                        "sensors": {
                            "tank_level_switch_x17": {
                                "register": 10141,
                                "description": "二次側水箱液位開關X17",
                                "precision": 0,
                                "range": "0~1",
                                "unit": "",
                                "status_map": {0: "正常", 1: "高水位"}
                            }
                        }
                    }
                },
                "created_time": datetime.now().isoformat(),
                "updated_time": datetime.now().isoformat()
            },
            "cdu_advanced": {
                "machine_name": "高級CDU機種",
                "description": "高級CDU機種，包含額外的感測器和功能",
                "sensor_config": {
                    "temperature": {
                        "name": "溫度訊息",
                        "sensors": {
                            "secondary_return_temp_t11": {
                                "register": 10111,
                                "description": "二次側回水溫度T11",
                                "precision": 0.1,
                                "range": "100~800 (對應10~80℃)",
                                "unit": "℃",
                                "min_raw": 100,
                                "max_raw": 800,
                                "min_actual": 10.0,
                                "max_actual": 80.0,
                                "conversion_factor": 0.1
                            },
                            "secondary_tank_temp_t12": {
                                "register": 10112,
                                "description": "二次側水箱溫度T12",
                                "precision": 0.1,
                                "range": "100~800 (對應10~80℃)",
                                "unit": "℃",
                                "min_raw": 100,
                                "max_raw": 800,
                                "min_actual": 10.0,
                                "max_actual": 80.0,
                                "conversion_factor": 0.1
                            },
                            "secondary_outlet_temp_t13": {
                                "register": 10113,
                                "description": "二次側出水溫度T13",
                                "precision": 0.1,
                                "range": "100~800 (對應10~80℃)",
                                "unit": "℃",
                                "min_raw": 100,
                                "max_raw": 800,
                                "min_actual": 10.0,
                                "max_actual": 80.0,
                                "conversion_factor": 0.1
                            },
                            "ambient_temp_t14": {
                                "register": 10114,
                                "description": "環境溫度T14",
                                "precision": 0.1,
                                "range": "100~800 (對應10~80℃)",
                                "unit": "℃",
                                "min_raw": 100,
                                "max_raw": 800,
                                "min_actual": 10.0,
                                "max_actual": 80.0,
                                "conversion_factor": 0.1
                            }
                        }
                    },
                    "pressure": {
                        "name": "壓力訊息",
                        "sensors": {
                            "secondary_inlet_pressure_p12": {
                                "register": 10082,
                                "description": "二次側入水壓力P12",
                                "precision": 0.01,
                                "range": "5~600 (對應0.05~6bar)",
                                "unit": "bar",
                                "min_raw": 5,
                                "max_raw": 600,
                                "min_actual": 0.05,
                                "max_actual": 6.0,
                                "conversion_factor": 0.01
                            },
                            "secondary_outlet_pressure_p13": {
                                "register": 10083,
                                "description": "二次側出水壓力P13",
                                "precision": 0.01,
                                "range": "5~600 (對應0.05~6bar)",
                                "unit": "bar",
                                "min_raw": 5,
                                "max_raw": 600,
                                "min_actual": 0.05,
                                "max_actual": 6.0,
                                "conversion_factor": 0.01
                            },
                            "system_pressure_p14": {
                                "register": 10084,
                                "description": "系統壓力P14",
                                "precision": 0.01,
                                "range": "5~600 (對應0.05~6bar)",
                                "unit": "bar",
                                "min_raw": 5,
                                "max_raw": 600,
                                "min_actual": 0.05,
                                "max_actual": 6.0,
                                "conversion_factor": 0.01
                            }
                        }
                    },
                    "flow": {
                        "name": "流量訊息",
                        "sensors": {
                            "secondary_outlet_flow_f2": {
                                "register": 10062,
                                "description": "二次側出水量F2",
                                "precision": 1,
                                "range": "0~700 (對應0~70LPM)",
                                "unit": "LPM",
                                "min_raw": 0,
                                "max_raw": 700,
                                "min_actual": 0,
                                "max_actual": 70,
                                "conversion_factor": 0.1
                            },
                            "bypass_flow_f3": {
                                "register": 10063,
                                "description": "旁通流量F3",
                                "precision": 1,
                                "range": "0~700 (對應0~70LPM)",
                                "unit": "LPM",
                                "min_raw": 0,
                                "max_raw": 700,
                                "min_actual": 0,
                                "max_actual": 70,
                                "conversion_factor": 0.1
                            }
                        }
                    },
                    "io": {
                        "name": "輸入輸出訊息",
                        "sensors": {
                            "tank_level_switch_x17": {
                                "register": 10141,
                                "description": "二次側水箱液位開關X17",
                                "precision": 0,
                                "range": "0~1",
                                "unit": "",
                                "status_map": {0: "正常", 1: "高水位"}
                            },
                            "leak_detection_x16": {
                                "register": 10143,
                                "description": "盛水盤漏液偵測X16",
                                "precision": 0,
                                "range": "0~1",
                                "unit": "",
                                "status_map": {0: "漏水", 1: "正常"}
                            },
                            "water_pump_output_y17": {
                                "register": 10151,
                                "description": "補水泵輸出Y17",
                                "precision": 0,
                                "range": "0~1",
                                "unit": "",
                                "status_map": {0: "待機", 1: "動作"}
                            },
                            "alarm_output_y18": {
                                "register": 10152,
                                "description": "警報輸出Y18",
                                "precision": 0,
                                "range": "0~1",
                                "unit": "",
                                "status_map": {0: "正常", 1: "警報"}
                            }
                        }
                    }
                },
                "created_time": datetime.now().isoformat(),
                "updated_time": datetime.now().isoformat()
            }
        }

# 全局API實例
redfish_api = RedfishAPI()

def init_redfish_api(system_manager):
    """初始化Redfish API"""
    global redfish_api
    redfish_api.system_manager = system_manager

# 路由定義
@redfish_router.get('/')
async def service_root():
    """服務根目錄"""
    return redfish_api.get_service_root()

@redfish_router.get('/Systems')
async def systems_collection():
    """系統集合"""
    return redfish_api.get_systems_collection()

@redfish_router.get('/Systems/{system_id}')
async def system_info(system_id: str):
    """特定系統信息"""
    result = redfish_api.get_system_info(system_id)
    if isinstance(result, tuple):
        raise HTTPException(status_code=result[1], detail=result[0])
    return result

@redfish_router.get('/Chassis')
async def chassis_collection():
    """機箱集合"""
    return redfish_api.get_chassis_collection()

@redfish_router.get('/Chassis/{chassis_id}')
async def chassis_info(chassis_id: str):
    """機箱信息"""
    result = redfish_api.get_chassis_info(chassis_id)
    if isinstance(result, tuple):
        raise HTTPException(status_code=result[1], detail=result[0])
    return result

@redfish_router.get('/Chassis/{chassis_id}/Thermal')
async def thermal_info(chassis_id: str):
    """熱管理信息"""
    result = redfish_api.get_thermal_info(chassis_id)
    if isinstance(result, tuple):
        raise HTTPException(status_code=result[1], detail=result[0])
    return result

@redfish_router.get('/Chassis/{chassis_id}/Power')
async def power_info(chassis_id: str):
    """電源信息"""
    result = redfish_api.get_power_info(chassis_id)
    if isinstance(result, tuple):
        raise HTTPException(status_code=result[1], detail=result[0])
    return result

# R暫存器寫入API端點
@redfish_router.get('/Systems/{system_id}/Oem/CDU/Registers')
async def get_r_register_info(system_id: str):
    """獲取R暫存器信息"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_r_register_info()
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@redfish_router.post('/Systems/{system_id}/Oem/CDU/Registers/Write')
async def write_r_register(system_id: str, request: RegisterWriteRequest):
    """寫入單個R暫存器"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.write_r_register(request.register_address, request.value)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@redfish_router.post('/Systems/{system_id}/Oem/CDU/Registers/WriteBatch')
async def write_r_registers_batch(system_id: str, request: BatchRegisterWriteRequest):
    """批量寫入R暫存器"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.write_r_registers_batch(request.start_address, request.values)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# R暫存器讀取API端點
@redfish_router.post('/Systems/{system_id}/Oem/CDU/Registers/Read')
async def read_single_r_register(system_id: str, request: RegisterReadRequest):
    """讀取單個R暫存器"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.read_single_r_register(request.register_address)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@redfish_router.post('/Systems/{system_id}/Oem/CDU/Registers/ReadBatch')
async def read_r_registers_batch(system_id: str, request: BatchRegisterReadRequest):
    """批量讀取R暫存器"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.read_r_registers_batch(request.start_address, request.count)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# 便捷的GET端點用於單個暫存器讀取
@redfish_router.get('/Systems/{system_id}/Oem/CDU/Registers/{register_address}')
async def get_single_r_register(system_id: str, register_address: int):
    """GET方式讀取單個R暫存器"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    if not (10000 <= register_address <= 11000):
        raise HTTPException(status_code=422, detail=f"Register address R{register_address} out of range (R10000-R11000)")

    result = redfish_api.read_single_r_register(register_address)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# CDU機組狀態API端點
@redfish_router.get('/Systems/{system_id}/Oem/CDU/Status')
async def get_cdu_status(system_id: str):
    """獲取CDU機組狀態 (基於R10000的16個bit位)"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_cdu_status()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# CDU異常信息API端點
@redfish_router.get('/Systems/{system_id}/Oem/CDU/Alarms')
async def get_cdu_alarms(system_id: str):
    """獲取CDU異常信息 (基於R10001-R10005的16個bit位)"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_cdu_alarms()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# CDU統合異常信息API端點
@redfish_router.get('/Systems/{system_id}/Oem/CDU/IntegratedAlarms')
async def get_cdu_integrated_alarms(system_id: str):
    """獲取CDU統合異常信息 - 彙整所有有發生異常動作狀態的信息"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_cdu_integrated_alarms()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# CDU操作設置API端點
@redfish_router.post('/Systems/{system_id}/Oem/CDU/Operations/Execute')
async def execute_cdu_operation(system_id: str, request: CDUOperationRequest):
    """執行CDU操作設置 (啟動/停止/風扇控制)"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.execute_cdu_operation(request.operation)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@redfish_router.get('/Systems/{system_id}/Oem/CDU/Operations')
async def get_cdu_operations_status(system_id: str):
    """獲取CDU操作設置狀態"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_cdu_operations_status()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# CDU數值寫入API端點
@redfish_router.post('/Systems/{system_id}/Oem/CDU/Values/Write')
async def write_cdu_value(system_id: str, request: CDUValueWriteRequest):
    """寫入CDU數值設定 (溫度/流量/轉速等)"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.write_cdu_value(request.parameter, request.value)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@redfish_router.get('/Systems/{system_id}/Oem/CDU/Values')
async def get_cdu_values_status(system_id: str):
    """獲取CDU數值設定狀態"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_cdu_values_status()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# CDU感測器API端點
@redfish_router.get('/Systems/{system_id}/Oem/CDU/Sensors')
async def get_cdu_sensors(system_id: str, sensor_type: str = None, sensor_name: str = None):
    """獲取CDU感測器數據"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_cdu_sensors_data(sensor_type, sensor_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@redfish_router.post('/Systems/{system_id}/Oem/CDU/Sensors/Read')
async def read_cdu_sensor(system_id: str, request: CDUSensorReadRequest):
    """讀取特定CDU感測器"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_cdu_sensors_data(request.sensor_type, request.sensor_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@redfish_router.post('/Systems/{system_id}/Oem/CDU/Sensors/BatchRead')
async def batch_read_cdu_sensors(system_id: str, request: CDUSensorBatchReadRequest):
    """批量讀取CDU感測器"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_cdu_sensors_batch(request.sensor_types, request.include_reserved)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# CDU機種配置API端點
@redfish_router.post('/Systems/{system_id}/Oem/CDU/MachineConfig')
async def create_machine_config(system_id: str, request: CDUMachineConfigRequest):
    """創建CDU機種配置"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.create_machine_config(
        request.machine_type,
        request.machine_name,
        request.description,
        request.sensor_config
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@redfish_router.get('/Systems/{system_id}/Oem/CDU/MachineConfig')
async def get_machine_configs(system_id: str):
    """獲取所有CDU機種配置"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.get_machine_configs()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@redfish_router.post('/Systems/{system_id}/Oem/CDU/MachineConfig/Set')
async def set_current_machine(system_id: str, request: CDUMachineSetRequest):
    """設定當前使用的CDU機種"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.set_current_machine(request.machine_type)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@redfish_router.delete('/Systems/{system_id}/Oem/CDU/MachineConfig/{machine_type}')
async def delete_machine_config(system_id: str, machine_type: str):
    """刪除CDU機種配置"""
    if system_id != "CDU1":
        raise HTTPException(status_code=404, detail="System not found")

    result = redfish_api.delete_machine_config(machine_type)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result
