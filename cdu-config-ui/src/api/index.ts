/**
 * CDU API Module - Main Export File
 * 
 * This file provides a centralized export for all CDU API functionality.
 * Import from this file to access all API functions, types, and utilities.
 */

// === Core API Functions ===
export {
  // Machine Configuration APIs
  getMachineConfigs,
  createMachineConfig,
  setCurrentMachine,
  deleteMachineConfig,
  
  // System Status APIs
  getSystemStatus,
  
  // Sensor APIs
  getSensors,
  readSensor,
  batchReadSensors,
  
  // Alarm APIs
  getAlarms,
  getIntegratedAlarms,
  
  // Operation APIs
  executeOperation,
  getOperationsStatus,
  
  // Value APIs
  writeValue,
  getValuesStatus,
  
  // Register APIs
  readRegister,
  writeRegister,
  
  // Utility Functions
  formatApiError,
  isApiError,
  withTimeout,
  createTimeout,
  
  // Configuration
  cduApi,
  apiConfig
} from './cduApi';

// === Type Definitions ===
export type {
  // Machine Configuration Types
  MachineConfig,
  SensorConfig,
  SensorTypeConfig,
  SensorDefinition,
  MachineConfigResponse,
  MachineConfigRequest,
  MachineSetRequest,
  
  // System Status Types
  SystemStatus,
  SystemSummary,
  
  // Sensor Data Types
  SensorData,
  SensorTypeData,
  SensorTypeSummary,
  SensorsResponse,
  SensorSummary,
  SensorReadRequest,
  SensorBatchReadRequest,
  
  // Alarm Types
  AlarmData,
  AlarmRegisterData,
  AlarmSummary,
  AlarmsResponse,
  
  // Integrated Alarms Types
  SystemOverview,
  CriticalIssue,
  IntegratedAlarmsResponse,
  
  // Operations Types
  OperationRequest,
  OperationResponse,
  OperationStatus,
  OperationsStatusResponse,
  
  // Values Types
  ValueWriteRequest,
  ValueWriteResponse,
  ValueStatus,
  ValuesStatusResponse,
  
  // Register Types
  RegisterReadRequest,
  RegisterWriteRequest,
  RegisterResponse,
  
  // Common Types
  ApiError,
  ApiResponse
} from './cduApi';

// === React Hooks ===
// Temporarily commented out to avoid circular dependencies
// export {
//   useMachineConfigs,
//   useSystemStatus,
//   useSensors,
//   useIntegratedAlarms
// } from './apiExamples';

// === Example Components ===
// Temporarily commented out to avoid circular dependencies
// export {
//   MachineConfigExample,
//   SystemStatusExample,
//   OperationControlExample,
//   ValueSettingExample
// } from './apiExamples';

// === Testing Utilities ===
// Temporarily commented out to avoid circular dependencies
// export {
//   apiTester,
//   runAllTests,
//   testSystemStatusApi,
//   testMachineConfigApis,
//   testSensorApis,
//   testAlarmApis,
//   testOperationApis,
//   testValueApis
// } from './apiTester';

// === Constants ===
export const API_ENDPOINTS = {
  MACHINE_CONFIG: '/MachineConfig',
  MACHINE_CONFIG_SET: '/MachineConfig/Set',
  STATUS: '/Status',
  SENSORS: '/Sensors',
  SENSORS_READ: '/Sensors/Read',
  SENSORS_BATCH_READ: '/Sensors/BatchRead',
  ALARMS: '/Alarms',
  INTEGRATED_ALARMS: '/IntegratedAlarms',
  OPERATIONS: '/Operations',
  OPERATIONS_EXECUTE: '/Operations/Execute',
  VALUES: '/Values',
  VALUES_WRITE: '/Values/Write',
  REGISTERS_READ: '/Registers/Read',
  REGISTERS_WRITE: '/Registers/Write'
} as const;

export const SENSOR_TYPES = {
  TEMPERATURE: 'temperature',
  PRESSURE: 'pressure',
  FLOW: 'flow',
  IO: 'io'
} as const;

export const OPERATION_TYPES = {
  START: 'start',
  STOP: 'stop',
  FAN_START: 'fan_start',
  FAN_STOP: 'fan_stop'
} as const;

export const VALUE_PARAMETERS = {
  TEMP_SETTING: 'temp_setting',
  FLOW_SETTING: 'flow_setting',
  FAN_SPEED: 'fan_speed',
  PUMP1_SPEED: 'pump1_speed',
  PUMP2_SPEED: 'pump2_speed'
} as const;

export const MACHINE_TYPES = {
  DEFAULT: 'default',
  COMPACT: 'cdu_compact',
  ADVANCED: 'cdu_advanced'
} as const;

// === Quick Access Functions ===
// Import the functions directly to avoid circular dependencies
import {
  getMachineConfigs as _getMachineConfigs,
  setCurrentMachine as _setCurrentMachine,
  getSystemStatus as _getSystemStatus,
  getSensors as _getSensors,
  getIntegratedAlarms as _getIntegratedAlarms
} from './cduApi';

/**
 * Quick function to get current machine configuration
 */
export const getCurrentMachine = async () => {
  const configs = await _getMachineConfigs();
  return {
    currentType: configs.current_machine,
    currentConfig: configs.machine_configs[configs.current_machine],
    allConfigs: configs.machine_configs
  };
};

/**
 * Quick function to get system health overview
 */
export const getSystemHealth = async () => {
  const [status, alarms] = await Promise.all([
    _getSystemStatus(),
    _getIntegratedAlarms()
  ]);

  return {
    systemStatus: status.summary.overall_status,
    healthScore: alarms.system_health_score,
    criticalIssues: alarms.critical_issues.length,
    isOperational: alarms.system_overview.operational_summary.is_operational,
    needsAttention: alarms.system_overview.operational_summary.needs_attention
  };
};

/**
 * Quick function to get active sensor summary
 */
export const getActiveSensorSummary = async () => {
  const sensors = await _getSensors();

  return {
    totalSensors: sensors.sensor_summary.total_sensors,
    activeSensors: sensors.sensor_summary.active_sensors,
    errorSensors: sensors.sensor_summary.error_sensors,
    sensorTypes: sensors.sensor_summary.sensor_types
  };
};

/**
 * Quick function to switch machine and verify
 */
export const switchMachineAndVerify = async (machineType: string) => {
  await _setCurrentMachine(machineType);

  // Wait a moment for the change to take effect
  await new Promise(resolve => setTimeout(resolve, 1000));

  const configs = await _getMachineConfigs();

  if (configs.current_machine !== machineType) {
    throw new Error(`Failed to switch to ${machineType}. Current: ${configs.current_machine}`);
  }

  return {
    success: true,
    currentMachine: configs.current_machine,
    machineConfig: configs.machine_configs[machineType]
  };
};

// === Default Export ===
import {
  getAlarms as _getAlarms,
  executeOperation as _executeOperation,
  writeValue as _writeValue,
  formatApiError as _formatApiError,
  withTimeout as _withTimeout
} from './cduApi';

const cduApiModule = {
  // Core functions
  getMachineConfigs: _getMachineConfigs,
  setCurrentMachine: _setCurrentMachine,
  getSystemStatus: _getSystemStatus,
  getSensors: _getSensors,
  getAlarms: _getAlarms,
  executeOperation: _executeOperation,
  writeValue: _writeValue,

  // Quick access functions
  getCurrentMachine,
  getSystemHealth,
  getActiveSensorSummary,
  switchMachineAndVerify,

  // Utilities
  formatApiError: _formatApiError,
  withTimeout: _withTimeout,

  // Constants
  API_ENDPOINTS,
  SENSOR_TYPES,
  OPERATION_TYPES,
  VALUE_PARAMETERS,
  MACHINE_TYPES
};

export default cduApiModule;
