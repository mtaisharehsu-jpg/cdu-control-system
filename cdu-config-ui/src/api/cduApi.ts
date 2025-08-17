
import axios, { AxiosResponse } from 'axios';

// Define base URL for your backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '10000');

const cduApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
cduApi.interceptors.request.use(
  (config) => {
    if (import.meta.env.VITE_DEBUG === 'true') {
      console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and error handling
cduApi.interceptors.response.use(
  (response) => {
    if (import.meta.env.VITE_DEBUG === 'true') {
      console.log('API Response:', response.status, response.data);
    }
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// --- Type Definitions ---

// Machine Configuration Types
export interface MachineConfig {
  machine_name: string;
  description: string;
  sensor_config: SensorConfig;
  created_time: string;
  updated_time: string;
}

export interface SensorConfig {
  temperature: SensorTypeConfig;
  pressure: SensorTypeConfig;
  flow: SensorTypeConfig;
  io: SensorTypeConfig;
}

export interface SensorTypeConfig {
  name: string;
  sensors: Record<string, SensorDefinition>;
}

export interface SensorDefinition {
  register: number;
  description: string;
  precision?: number;
  range?: string;
  unit?: string;
  min_raw?: number;
  max_raw?: number;
  min_actual?: number;
  max_actual?: number;
  conversion_factor?: number;
  status_map?: Record<number, string>;
  reserved?: boolean;
}

export interface MachineConfigResponse {
  success: boolean;
  machine_configs: Record<string, MachineConfig>;
  current_machine: string;
  total_machines: number;
  timestamp: string;
}

export interface MachineConfigRequest {
  machine_type: string;
  machine_name: string;
  description: string;
  sensor_config: SensorConfig;
}

export interface MachineSetRequest {
  machine_type: string;
}

// System Status Types
export interface SystemStatus {
  success: boolean;
  summary: SystemSummary;
  registers: Record<string, any>;
  timestamp: string;
}

export interface SystemSummary {
  power_on: boolean;
  running: boolean;
  standby: boolean;
  abnormal: boolean;
  overall_status: string;
}

// Sensor Data Types
export interface SensorData {
  register_address: number;
  raw_value: number | null;
  actual_value: number | null;
  unit: string;
  description: string;
  precision?: number;
  range?: string;
  status: string;
  is_active: boolean;
  is_reserved: boolean;
  error?: string;
}

export interface SensorTypeData {
  type_name: string;
  sensors: Record<string, SensorData>;
  summary: SensorTypeSummary;
}

export interface SensorTypeSummary {
  count: number;
  active: number;
  errors: number;
}

export interface SensorsResponse {
  success: boolean;
  sensors_data: Record<string, SensorTypeData>;
  sensor_summary: SensorSummary;
  timestamp: string;
}

export interface SensorSummary {
  total_sensors: number;
  active_sensors: number;
  error_sensors: number;
  sensor_types: Record<string, SensorTypeSummary>;
}

export interface SensorReadRequest {
  sensor_type: string;
  sensor_name?: string;
}

export interface SensorBatchReadRequest {
  sensor_types: string[];
  include_reserved: boolean;
}

// Alarm Types
export interface AlarmData {
  alarm_code: string;
  name: string;
  description: string;
  value: number;
  status: string;
  active: boolean;
  register: number;
  bit_position: number;
}

export interface AlarmRegisterData {
  register_address: number;
  register_value: number;
  register_hex: string;
  register_binary: string;
  status_bits: Record<string, AlarmData>;
  active_count: number;
}

export interface AlarmSummary {
  total_alarms: number;
  critical_alarms_count: number;
  overall_status: string;
  severity: string;
  category_counts: Record<string, number>;
  has_pump_issues: boolean;
  has_temp_issues: boolean;
  has_pressure_issues: boolean;
  has_comm_issues: boolean;
  has_sensor_issues: boolean;
  has_system_issues: boolean;
}

export interface AlarmsResponse {
  success: boolean;
  alarm_registers: Record<string, AlarmRegisterData>;
  active_alarms: AlarmData[];
  alarm_summary: AlarmSummary;
  timestamp: string;
}

// Integrated Alarms Types
export interface SystemOverview {
  integrated_status: string;
  status_color: string;
  system_status: SystemSummary;
  alarm_status: {
    total_alarms: number;
    critical_alarms: number;
    severity: string;
    overall_status: string;
  };
  operational_summary: {
    is_operational: boolean;
    needs_attention: boolean;
    requires_immediate_action: boolean;
  };
}

export interface CriticalIssue {
  type: string;
  severity: string;
  title: string;
  description: string;
  source: string;
  action_required: string;
}

export interface IntegratedAlarmsResponse {
  success: boolean;
  system_overview: SystemOverview;
  active_alarms_summary: any;
  alarm_categories: Record<string, any>;
  critical_issues: CriticalIssue[];
  recommended_actions: string[];
  system_health_score: number;
  timestamp: string;
}

// New Alarm Management Types
export interface AlarmResponse {
  alarm_id: string;
  name: string;
  category: string;
  level: string;
  timestamp: string;
  message: string;
  acknowledged: boolean;
  cleared: boolean;
  value?: number;
  unit?: string;
  device_id?: string;
}

export interface AlarmStatistics {
  total_active: number;
  total_acknowledged: number;
  total_today: number;
  by_category: Record<string, number>;
  by_level: Record<string, number>;
}

export interface AlarmHistoryItem {
  alarm_id: string;
  name: string;
  category: string;
  level: string;
  timestamp: string;
  message: string;
  acknowledged: boolean;
  cleared: boolean;
  clear_timestamp?: string;
  value?: number;
  unit?: string;
  device_id?: string;
}

export interface AlarmThresholdUpdate {
  sensor_id: string;
  warning_min?: number;
  warning_max?: number;
  alert_min?: number;
  alert_max?: number;
  enabled?: boolean;
}

export interface SNMPSettings {
  enabled: boolean;
  destination_ip: string;
  port: number;
  community: string;
  version: string;
  warning_interval: number;
  alert_interval: number;
}

// Operations Types
export interface OperationRequest {
  operation: 'start' | 'stop' | 'fan_start' | 'fan_stop';
}

export interface OperationResponse {
  success: boolean;
  operation: string;
  register_address: number;
  value_written: number;
  operation_description: string;
  status: string;
  timestamp: string;
  message?: string;
}

export interface OperationStatus {
  register_address: number;
  expected_value: number;
  current_value: number | null;
  is_active: boolean;
  description: string;
  status: string;
  error?: string;
}

export interface OperationsStatusResponse {
  success: boolean;
  operations_status: Record<string, OperationStatus>;
  timestamp: string;
}

// Values Types
export interface ValueWriteRequest {
  parameter: 'temp_setting' | 'flow_setting' | 'fan_speed' | 'pump1_speed' | 'pump2_speed';
  value: number;
}

export interface ValueWriteResponse {
  success: boolean;
  parameter: string;
  register_address: number;
  input_value: number;
  register_value: number;
  actual_value: number;
  unit: string;
  description: string;
  status: string;
  timestamp: string;
  message?: string;
}

export interface ValueStatus {
  register_address: number;
  register_value: number | null;
  actual_value: number | null;
  unit: string;
  description: string;
  status: string;
  value_range: string;
  register_range: string;
  error?: string;
}

export interface ValuesStatusResponse {
  success: boolean;
  values_status: Record<string, ValueStatus>;
  timestamp: string;
}

// Register Types
export interface RegisterReadRequest {
  register_address: number;
}

export interface RegisterWriteRequest {
  register_address: number;
  value: number;
}

export interface RegisterResponse {
  success: boolean;
  register_address: number;
  value: number;
  timestamp: string;
  message?: string;
}

// API Error Types
export interface ApiError {
  success: false;
  message: string;
  timestamp: string;
  detail?: string;
}

// Common Response Type
export type ApiResponse<T> = T | ApiError;

// --- API Functions ---

// === Machine Configuration APIs ===

/**
 * Fetches all CDU machine configurations.
 * @returns Promise resolving to MachineConfigResponse.
 */
export const getMachineConfigs = async (): Promise<MachineConfigResponse> => {
  try {
    const response = await cduApi.get<MachineConfigResponse>('/MachineConfig');
    return response.data;
  } catch (error) {
    console.error('Error fetching machine configs:', error);
    throw error;
  }
};

/**
 * Creates a new CDU machine configuration.
 * @param config The machine configuration to create.
 * @returns Promise resolving to the created configuration.
 */
export const createMachineConfig = async (config: MachineConfigRequest): Promise<OperationResponse> => {
  try {
    const response = await cduApi.post<OperationResponse>('/MachineConfig', config);
    return response.data;
  } catch (error) {
    console.error('Error creating machine config:', error);
    throw error;
  }
};

/**
 * Sets the current CDU machine type.
 * @param machineType The machine type to switch to.
 * @returns Promise resolving to operation result.
 */
export const setCurrentMachine = async (machineType: string): Promise<OperationResponse> => {
  try {
    const response = await cduApi.post<OperationResponse>('/MachineConfig/Set', { machine_type: machineType });
    return response.data;
  } catch (error) {
    console.error(`Error setting current machine to ${machineType}:`, error);
    throw error;
  }
};

/**
 * Deletes a CDU machine configuration.
 * @param machineType The machine type to delete.
 * @returns Promise resolving to operation result.
 */
export const deleteMachineConfig = async (machineType: string): Promise<OperationResponse> => {
  try {
    const response = await cduApi.delete<OperationResponse>(`/MachineConfig/${machineType}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting machine config ${machineType}:`, error);
    throw error;
  }
};

// === System Status APIs ===

/**
 * Fetches the current CDU system status.
 * @returns Promise resolving to SystemStatus object.
 */
export const getSystemStatus = async (): Promise<SystemStatus> => {
  try {
    const response = await cduApi.get<SystemStatus>('/Status');
    return response.data;
  } catch (error) {
    console.error('Error fetching system status:', error);
    throw error;
  }
};

// === Sensor APIs ===

/**
 * Fetches CDU sensor data.
 * @param sensorType Optional sensor type filter.
 * @param sensorName Optional specific sensor name.
 * @returns Promise resolving to SensorsResponse.
 */
export const getSensors = async (sensorType?: string, sensorName?: string): Promise<SensorsResponse> => {
  try {
    const params = new URLSearchParams();
    if (sensorType) params.append('sensor_type', sensorType);
    if (sensorName) params.append('sensor_name', sensorName);

    const url = `/Sensors${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await cduApi.get<SensorsResponse>(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching sensors:', error);
    throw error;
  }
};

/**
 * Reads specific CDU sensor data.
 * @param request Sensor read request.
 * @returns Promise resolving to SensorsResponse.
 */
export const readSensor = async (request: SensorReadRequest): Promise<SensorsResponse> => {
  try {
    const response = await cduApi.post<SensorsResponse>('/Sensors/Read', request);
    return response.data;
  } catch (error) {
    console.error('Error reading sensor:', error);
    throw error;
  }
};

/**
 * Batch reads multiple CDU sensors.
 * @param request Batch read request.
 * @returns Promise resolving to SensorsResponse.
 */
export const batchReadSensors = async (request: SensorBatchReadRequest): Promise<SensorsResponse> => {
  try {
    const response = await cduApi.post<SensorsResponse>('/Sensors/BatchRead', request);
    return response.data;
  } catch (error) {
    console.error('Error batch reading sensors:', error);
    throw error;
  }
};

// === Alarm APIs ===

/**
 * Fetches CDU alarm information.
 * @returns Promise resolving to AlarmsResponse.
 */
export const getAlarms = async (): Promise<AlarmsResponse> => {
  try {
    const response = await cduApi.get<AlarmsResponse>('/Alarms');
    return response.data;
  } catch (error) {
    console.error('Error fetching alarms:', error);
    throw error;
  }
};

/**
 * Fetches integrated CDU alarm information.
 * @returns Promise resolving to IntegratedAlarmsResponse.
 */
export const getIntegratedAlarms = async (): Promise<IntegratedAlarmsResponse> => {
  try {
    const response = await cduApi.get<IntegratedAlarmsResponse>('/IntegratedAlarms');
    return response.data;
  } catch (error) {
    console.error('Error fetching integrated alarms:', error);
    throw error;
  }
};

// === New Alarm Management APIs ===

/**
 * Creates a separate API instance for alarm management endpoints
 */
const alarmApi = axios.create({
  baseURL: 'http://localhost:8001/redfish/v1/Chassis/CDU_Main/Alarms',
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetches active alarms from the alarm management system.
 * @param category Optional category filter.
 * @param level Optional level filter.
 * @param limit Maximum number of alarms to return.
 * @returns Promise resolving to array of AlarmResponse.
 */
export const getActiveAlarms = async (
  category?: string, 
  level?: string, 
  limit: number = 100
): Promise<AlarmResponse[]> => {
  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (level) params.append('level', level);
    if (limit !== 100) params.append('limit', limit.toString());

    const url = `/${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await alarmApi.get<AlarmResponse[]>(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching active alarms:', error);
    throw error;
  }
};

/**
 * Fetches alarm statistics.
 * @returns Promise resolving to AlarmStatistics.
 */
export const getAlarmStatistics = async (): Promise<AlarmStatistics> => {
  try {
    const response = await alarmApi.get<AlarmStatistics>('/Statistics');
    return response.data;
  } catch (error) {
    console.error('Error fetching alarm statistics:', error);
    throw error;
  }
};

/**
 * Fetches alarm history.
 * @param startDate Optional start date filter.
 * @param endDate Optional end date filter.
 * @param limit Maximum number of history items to return.
 * @returns Promise resolving to array of AlarmHistoryItem.
 */
export const getAlarmHistory = async (
  startDate?: string,
  endDate?: string,
  limit: number = 100
): Promise<AlarmHistoryItem[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (limit !== 100) params.append('limit', limit.toString());

    const url = `/History${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await alarmApi.get<AlarmHistoryItem[]>(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching alarm history:', error);
    throw error;
  }
};

/**
 * Acknowledges an alarm.
 * @param alarmId The ID of the alarm to acknowledge.
 * @returns Promise resolving to success message.
 */
export const acknowledgeAlarm = async (alarmId: string): Promise<{ message: string }> => {
  try {
    const response = await alarmApi.post<{ message: string }>(`/${alarmId}/Actions/Acknowledge`);
    return response.data;
  } catch (error) {
    console.error(`Error acknowledging alarm ${alarmId}:`, error);
    throw error;
  }
};

/**
 * Clears an alarm.
 * @param alarmId The ID of the alarm to clear.
 * @returns Promise resolving to success message.
 */
export const clearAlarm = async (alarmId: string): Promise<{ message: string }> => {
  try {
    const response = await alarmApi.post<{ message: string }>(`/${alarmId}/Actions/Clear`);
    return response.data;
  } catch (error) {
    console.error(`Error clearing alarm ${alarmId}:`, error);
    throw error;
  }
};

/**
 * Updates alarm thresholds.
 * @param thresholds Array of threshold updates.
 * @returns Promise resolving to operation result.
 */
export const updateAlarmThresholds = async (thresholds: AlarmThresholdUpdate[]): Promise<{
  message: string;
  updated_sensors: string[];
}> => {
  try {
    const response = await alarmApi.put<{
      message: string;
      updated_sensors: string[];
    }>('/Settings/Thresholds', thresholds);
    return response.data;
  } catch (error) {
    console.error('Error updating alarm thresholds:', error);
    throw error;
  }
};

/**
 * Updates SNMP settings.
 * @param settings SNMP configuration.
 * @returns Promise resolving to success message.
 */
export const updateSNMPSettings = async (settings: SNMPSettings): Promise<{ message: string }> => {
  try {
    const response = await alarmApi.put<{ message: string }>('/Settings/SNMP', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating SNMP settings:', error);
    throw error;
  }
};

/**
 * Tests SNMP connection.
 * @returns Promise resolving to test result.
 */
export const testSNMPConnection = async (): Promise<{ message: string }> => {
  try {
    const response = await alarmApi.post<{ message: string }>('/Actions/TestSNMP');
    return response.data;
  } catch (error) {
    console.error('Error testing SNMP connection:', error);
    throw error;
  }
};

/**
 * Fetches CDU alarm registers (80 alarm codes from R10001-R10005).
 * @returns Promise resolving to AlarmsResponse with detailed register information.
 */
export const getCDUAlarmRegisters = async (): Promise<AlarmsResponse> => {
  try {
    // Use the original CDU API base URL for the CDU-specific alarm endpoint
    const response = await axios.get<AlarmsResponse>(
      'http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU/Alarms'
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching CDU alarm registers:', error);
    throw error;
  }
};

// === Operations APIs ===

/**
 * Executes a CDU operation.
 * @param request Operation request.
 * @returns Promise resolving to OperationResponse.
 */
export const executeOperation = async (request: OperationRequest): Promise<OperationResponse> => {
  try {
    const response = await cduApi.post<OperationResponse>('/Operations/Execute', request);
    return response.data;
  } catch (error) {
    console.error('Error executing operation:', error);
    throw error;
  }
};

/**
 * Fetches CDU operations status.
 * @returns Promise resolving to OperationsStatusResponse.
 */
export const getOperationsStatus = async (): Promise<OperationsStatusResponse> => {
  try {
    const response = await cduApi.get<OperationsStatusResponse>('/Operations');
    return response.data;
  } catch (error) {
    console.error('Error fetching operations status:', error);
    throw error;
  }
};

// === Values APIs ===

/**
 * Writes a CDU value setting.
 * @param request Value write request.
 * @returns Promise resolving to ValueWriteResponse.
 */
export const writeValue = async (request: ValueWriteRequest): Promise<ValueWriteResponse> => {
  try {
    const response = await cduApi.post<ValueWriteResponse>('/Values/Write', request);
    return response.data;
  } catch (error) {
    console.error('Error writing value:', error);
    throw error;
  }
};

/**
 * Fetches CDU values status.
 * @returns Promise resolving to ValuesStatusResponse.
 */
export const getValuesStatus = async (): Promise<ValuesStatusResponse> => {
  try {
    const response = await cduApi.get<ValuesStatusResponse>('/Values');
    return response.data;
  } catch (error) {
    console.error('Error fetching values status:', error);
    throw error;
  }
};

// === Register APIs ===

/**
 * Reads a single register value.
 * @param request Register read request.
 * @returns Promise resolving to RegisterResponse.
 */
export const readRegister = async (request: RegisterReadRequest): Promise<RegisterResponse> => {
  try {
    const response = await cduApi.post<RegisterResponse>('/Registers/Read', request);
    return response.data;
  } catch (error) {
    console.error('Error reading register:', error);
    throw error;
  }
};

/**
 * Writes a single register value.
 * @param request Register write request.
 * @returns Promise resolving to RegisterResponse.
 */
export const writeRegister = async (request: RegisterWriteRequest): Promise<RegisterResponse> => {
  try {
    const response = await cduApi.post<RegisterResponse>('/Registers/Write', request);
    return response.data;
  } catch (error) {
    console.error('Error writing register:', error);
    throw error;
  }
};

// === Utility Functions ===

/**
 * Checks if the API response indicates an error.
 * @param response API response to check.
 * @returns True if the response is an error.
 */
export const isApiError = (response: any): response is ApiError => {
  return response && response.success === false;
};

/**
 * Formats API error message for display.
 * @param error Error object or API error response.
 * @returns Formatted error message.
 */
export const formatApiError = (error: any): string => {
  if (isApiError(error)) {
    return error.message || 'Unknown API error';
  }

  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'Unknown error occurred';
};

/**
 * Creates a timeout promise for API calls.
 * @param ms Timeout in milliseconds.
 * @returns Promise that rejects after timeout.
 */
export const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), ms);
  });
};

/**
 * Wraps an API call with timeout.
 * @param apiCall The API call promise.
 * @param timeoutMs Timeout in milliseconds.
 * @returns Promise that resolves with API result or rejects on timeout.
 */
export const withTimeout = async <T>(apiCall: Promise<T>, timeoutMs: number = API_TIMEOUT): Promise<T> => {
  return Promise.race([apiCall, createTimeout(timeoutMs)]);
};

// Export the configured axios instance for advanced usage
export { cduApi };

// === Redfish API Functions ===

/**
 * Creates a specialized API instance for Redfish endpoints
 */
const redfishApi = axios.create({
  baseURL: 'http://localhost:8001',
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Redfish API Types
export interface RedfishSystemInfo {
  message: string;
  version: string;
  node_id?: string;
}

export interface RedfishHealthCheck {
  status: string;
  timestamp: string;
  node_id?: string;
  engine_status?: string;
}

export interface RedfishSystemStatus {
  node_id?: string;
  status: any;
  timestamp: string;
}

export interface RedfishSensorReading {
  block_id: string;
  block_type: string;
  value: number;
  status: string;
  health: string;
  unit: string;
  device?: string;
  modbus_address?: number;
  register?: number;
}

export interface RedfishFunctionBlockConfig {
  machine_name: string;
  description: string;
  function_blocks: Array<{
    block_id: string;
    block_type: string;
    sensor_category: string;
    unit: string;
    min_actual: number;
    max_actual: number;
    precision: number;
    device?: string;
    modbus_address?: number;
    register?: number;
    ip_address?: string;
    port?: number;
    unit_id?: number;
  }>;
  timestamp: string;
}

export interface RedfishPLCInfo {
  plc_id: string;
  timestamp: string;
  connected: boolean;
  [key: string]: any;
}

export interface RedfishPLCRegisters {
  plc_id: string;
  timestamp: string;
  connected: boolean;
  d_registers: Record<string, any>;
  r_registers: Record<string, any>;
}

export interface RedfishPLCWriteRequest {
  register_address: number;
  value: number;
}

export interface RedfishPLCBatchWriteRequest {
  start_address: number;
  values: number[];
}

export interface RedfishPLCWriteResponse {
  plc_id: string;
  register?: string;
  start_register?: string;
  end_register?: string;
  count?: number;
  value?: number;
  values?: number[];
  status: string;
  timestamp: string;
}

export interface RedfishClusterNodes {
  current_node: string;
  total_nodes: number;
  node_priority: number;
}

// === System Basic Information APIs ===

/**
 * Gets system root information
 */
export const getRedfishSystemRoot = async (): Promise<RedfishSystemInfo> => {
  try {
    const response = await redfishApi.get<RedfishSystemInfo>('/');
    return response.data;
  } catch (error) {
    console.error('Error fetching system root:', error);
    throw error;
  }
};

/**
 * Gets system health check
 */
export const getRedfishHealthCheck = async (): Promise<RedfishHealthCheck> => {
  try {
    const response = await redfishApi.get<RedfishHealthCheck>('/health');
    return response.data;
  } catch (error) {
    console.error('Error fetching health check:', error);
    throw error;
  }
};

/**
 * Gets system status
 */
export const getRedfishSystemStatus = async (): Promise<RedfishSystemStatus> => {
  try {
    const response = await redfishApi.get<RedfishSystemStatus>('/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching system status:', error);
    throw error;
  }
};

// === Sensor Management APIs ===

/**
 * Gets all sensors information
 */
export const getRedfishSensors = async (): Promise<Record<string, any>> => {
  try {
    const response = await redfishApi.get('/sensors');
    return response.data;
  } catch (error) {
    console.error('Error fetching sensors:', error);
    throw error;
  }
};

/**
 * Gets real-time sensor readings
 */
export const getRedfishSensorReadings = async (): Promise<RedfishSensorReading[]> => {
  try {
    const response = await redfishApi.get<RedfishSensorReading[]>('/api/v1/sensors/readings');
    return response.data;
  } catch (error) {
    console.error('Error fetching sensor readings:', error);
    throw error;
  }
};

/**
 * Gets specific sensor detail
 */
export const getRedfishSensorDetail = async (sensorId: string): Promise<any> => {
  try {
    const response = await redfishApi.get(`/sensors/${sensorId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching sensor detail for ${sensorId}:`, error);
    throw error;
  }
};

/**
 * Gets function blocks configuration
 */
export const getRedfishFunctionBlocksConfig = async (): Promise<RedfishFunctionBlockConfig> => {
  try {
    const response = await redfishApi.get<RedfishFunctionBlockConfig>('/api/v1/function-blocks/config');
    return response.data;
  } catch (error) {
    console.error('Error fetching function blocks config:', error);
    throw error;
  }
};

/**
 * Tests API connection
 */
export const getRedfishApiTest = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/api/v1/test');
    return response.data;
  } catch (error) {
    console.error('Error testing API connection:', error);
    throw error;
  }
};

// === PLC Management APIs ===

/**
 * Gets all PLC data
 */
export const getRedfishPLCs = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/plc');
    return response.data;
  } catch (error) {
    console.error('Error fetching PLCs:', error);
    throw error;
  }
};

/**
 * Gets specific PLC detail
 */
export const getRedfishPLCDetail = async (plcId: string): Promise<RedfishPLCInfo> => {
  try {
    const response = await redfishApi.get<RedfishPLCInfo>(`/plc/${plcId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching PLC detail for ${plcId}:`, error);
    throw error;
  }
};

/**
 * Gets PLC registers data
 */
export const getRedfishPLCRegisters = async (plcId: string): Promise<RedfishPLCRegisters> => {
  try {
    const response = await redfishApi.get<RedfishPLCRegisters>(`/plc/${plcId}/registers`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching PLC registers for ${plcId}:`, error);
    throw error;
  }
};

/**
 * Writes single PLC register
 */
export const writeRedfishPLCRegister = async (
  plcId: string, 
  registerAddress: number, 
  value: number
): Promise<RedfishPLCWriteResponse> => {
  try {
    const response = await redfishApi.post<RedfishPLCWriteResponse>(
      `/plc/${plcId}/write_register`,
      null,
      {
        params: {
          register_address: registerAddress,
          value: value
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error writing PLC register for ${plcId}:`, error);
    throw error;
  }
};

/**
 * Writes multiple PLC registers in batch
 */
export const writeRedfishPLCRegistersBatch = async (
  plcId: string, 
  request: RedfishPLCBatchWriteRequest
): Promise<RedfishPLCWriteResponse> => {
  try {
    const response = await redfishApi.post<RedfishPLCWriteResponse>(
      `/plc/${plcId}/write_registers_batch`,
      request
    );
    return response.data;
  } catch (error) {
    console.error(`Error batch writing PLC registers for ${plcId}:`, error);
    throw error;
  }
};

// === Cluster Management APIs ===

/**
 * Gets cluster nodes information
 */
export const getRedfishClusterNodes = async (): Promise<RedfishClusterNodes> => {
  try {
    const response = await redfishApi.get<RedfishClusterNodes>('/cluster/nodes');
    return response.data;
  } catch (error) {
    console.error('Error fetching cluster nodes:', error);
    throw error;
  }
};

// === Alarm Management System APIs (Redfish Style) ===

/**
 * Gets CDU alarm registers (80 alarm codes from R10001-R10005)
 */
export const getRedfishCDUAlarmRegisters = async (): Promise<AlarmsResponse> => {
  try {
    const response = await redfishApi.get<AlarmsResponse>(
      '/redfish/v1/Systems/CDU1/Oem/CDU/Alarms'
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching CDU alarm registers:', error);
    throw error;
  }
};

/**
 * Gets active alarms from alarm management system
 */
export const getRedfishActiveAlarms = async (
  category?: string, 
  level?: string, 
  limit: number = 100
): Promise<AlarmResponse[]> => {
  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (level) params.append('level', level);
    if (limit !== 100) params.append('limit', limit.toString());

    const url = `/redfish/v1/Chassis/CDU_Main/Alarms/${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await redfishApi.get<AlarmResponse[]>(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching active alarms:', error);
    throw error;
  }
};

/**
 * Acknowledges an alarm
 */
export const acknowledgeRedfishAlarm = async (alarmId: string): Promise<{ message: string }> => {
  try {
    const response = await redfishApi.post<{ message: string }>(
      `/redfish/v1/Chassis/CDU_Main/Alarms/${alarmId}/Actions/Acknowledge`
    );
    return response.data;
  } catch (error) {
    console.error(`Error acknowledging alarm ${alarmId}:`, error);
    throw error;
  }
};

/**
 * Gets alarm statistics
 */
export const getRedfishAlarmStatistics = async (): Promise<AlarmStatistics> => {
  try {
    const response = await redfishApi.get<AlarmStatistics>(
      '/redfish/v1/Chassis/CDU_Main/Alarms/Statistics'
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching alarm statistics:', error);
    throw error;
  }
};

/**
 * Gets alarm history
 */
export const getRedfishAlarmHistory = async (
  startDate?: string,
  endDate?: string,
  limit: number = 100
): Promise<AlarmHistoryItem[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (limit !== 100) params.append('limit', limit.toString());

    const url = `/redfish/v1/Chassis/CDU_Main/Alarms/History${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await redfishApi.get<AlarmHistoryItem[]>(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching alarm history:', error);
    throw error;
  }
};

/**
 * Updates SNMP settings
 */
export const updateRedfishSNMPSettings = async (settings: SNMPSettings): Promise<{ message: string }> => {
  try {
    const response = await redfishApi.put<{ message: string }>(
      '/redfish/v1/Chassis/CDU_Main/Alarms/Settings/SNMP',
      settings
    );
    return response.data;
  } catch (error) {
    console.error('Error updating SNMP settings:', error);
    throw error;
  }
};

/**
 * Tests SNMP connection
 */
export const testRedfishSNMPConnection = async (): Promise<{ message: string }> => {
  try {
    const response = await redfishApi.post<{ message: string }>(
      '/redfish/v1/Chassis/CDU_Main/Alarms/Actions/TestSNMP'
    );
    return response.data;
  } catch (error) {
    console.error('Error testing SNMP connection:', error);
    throw error;
  }
};

/**
 * Runs comprehensive API test suite for all Redfish endpoints
 */
export const runRedfishTestSuite = async (): Promise<Record<string, any>> => {
  const results: Record<string, any> = {};
  
  const tests = [
    { name: 'system_root', fn: getRedfishSystemRoot },
    { name: 'health_check', fn: getRedfishHealthCheck },
    { name: 'system_status', fn: getRedfishSystemStatus },
    { name: 'sensor_readings', fn: getRedfishSensorReadings },
    { name: 'function_blocks_config', fn: getRedfishFunctionBlocksConfig },
    { name: 'plc_data', fn: getRedfishPLCs },
    { name: 'cluster_nodes', fn: getRedfishClusterNodes },
    { name: 'cdu_alarm_registers', fn: getRedfishCDUAlarmRegisters },
    { name: 'active_alarms', fn: () => getRedfishActiveAlarms() },
    { name: 'alarm_statistics', fn: getRedfishAlarmStatistics },
    { name: 'api_test', fn: getRedfishApiTest }
  ];
  
  for (const test of tests) {
    try {
      const startTime = Date.now();
      const result = await test.fn();
      const duration = Date.now() - startTime;
      results[test.name] = {
        success: true,
        data: result,
        duration
      };
    } catch (error) {
      results[test.name] = {
        success: false,
        error: formatApiError(error),
        duration: 0
      };
    }
  }
  
  return results;
};

// === 階段1: 標準Redfish服務根目錄和發現端點 ===

/**
 * Redfish服務版本信息
 */
export const getRedfishServiceVersion = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish');
    return response.data;
  } catch (error) {
    console.error('Error fetching Redfish service version:', error);
    throw error;
  }
};

/**
 * Redfish服務根目錄
 */
export const getRedfishServiceRoot = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1');
    return response.data;
  } catch (error) {
    console.error('Error fetching Redfish service root:', error);
    throw error;
  }
};

/**
 * OData服務文檔
 */
export const getRedfishODataService = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/odata');
    return response.data;
  } catch (error) {
    console.error('Error fetching OData service document:', error);
    throw error;
  }
};

/**
 * Redfish元數據文檔
 */
export const getRedfishMetadata = async (): Promise<string> => {
  try {
    const response = await redfishApi.get('/redfish/v1/$metadata', {
      headers: { 'Accept': 'application/xml' }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Redfish metadata:', error);
    throw error;
  }
};

// === 標準Systems資源端點 ===

/**
 * 系統集合
 */
export const getRedfishSystems = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Systems');
    return response.data;
  } catch (error) {
    console.error('Error fetching systems collection:', error);
    throw error;
  }
};

/**
 * CDU主系統信息
 */
export const getRedfishCDUSystem = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Systems/CDU1');
    return response.data;
  } catch (error) {
    console.error('Error fetching CDU system info:', error);
    throw error;
  }
};

/**
 * 系統動作集合
 */
export const getRedfishSystemActions = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Systems/CDU1/Actions');
    return response.data;
  } catch (error) {
    console.error('Error fetching system actions:', error);
    throw error;
  }
};

/**
 * 系統重啟動作
 */
export const postRedfishSystemReset = async (resetType: string = 'GracefulRestart'): Promise<any> => {
  try {
    const response = await redfishApi.post('/redfish/v1/Systems/CDU1/Actions/ComputerSystem.Reset', {
      ResetType: resetType
    });
    return response.data;
  } catch (error) {
    console.error('Error performing system reset:', error);
    throw error;
  }
};

// === 標準Chassis資源端點 ===

/**
 * 機箱集合
 */
export const getRedfishChassis = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis');
    return response.data;
  } catch (error) {
    console.error('Error fetching chassis collection:', error);
    throw error;
  }
};

/**
 * CDU機箱信息
 */
export const getRedfishCDUChassis = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main');
    return response.data;
  } catch (error) {
    console.error('Error fetching CDU chassis info:', error);
    throw error;
  }
};

/**
 * 熱管理子系統（舊版）
 */
export const getRedfishThermal = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/Thermal');
    return response.data;
  } catch (error) {
    console.error('Error fetching thermal subsystem:', error);
    throw error;
  }
};

/**
 * 電源子系統
 */
export const getRedfishPower = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/Power');
    return response.data;
  } catch (error) {
    console.error('Error fetching power subsystem:', error);
    throw error;
  }
};

// === 新標準熱管理資源 (DMTF 2024.4) ===

/**
 * 熱管理子系統（新版）
 */
export const getRedfishThermalSubsystem = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/ThermalSubsystem');
    return response.data;
  } catch (error) {
    console.error('Error fetching thermal subsystem:', error);
    throw error;
  }
};

/**
 * 熱量指標
 */
export const getRedfishThermalMetrics = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/ThermalSubsystem/ThermalMetrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching thermal metrics:', error);
    throw error;
  }
};

// === CDU專用冷卻資源 ===

/**
 * 冷卻單元集合
 */
export const getRedfishCoolingUnits = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/ThermalSubsystem/CoolingUnits');
    return response.data;
  } catch (error) {
    console.error('Error fetching cooling units:', error);
    throw error;
  }
};

/**
 * CDU冷卻單元
 */
export const getRedfishCDUCoolingUnit = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/ThermalSubsystem/CoolingUnits/CDU1');
    return response.data;
  } catch (error) {
    console.error('Error fetching CDU cooling unit:', error);
    throw error;
  }
};

/**
 * 冷卻迴路集合
 */
export const getRedfishCoolingLoops = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/ThermalSubsystem/CoolingLoops');
    return response.data;
  } catch (error) {
    console.error('Error fetching cooling loops:', error);
    throw error;
  }
};

/**
 * 主冷卻迴路
 */
export const getRedfishPrimaryCoolingLoop = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/ThermalSubsystem/CoolingLoops/Primary');
    return response.data;
  } catch (error) {
    console.error('Error fetching primary cooling loop:', error);
    throw error;
  }
};

/**
 * 泵浦集合
 */
export const getRedfishPumps = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/ThermalSubsystem/Pumps');
    return response.data;
  } catch (error) {
    console.error('Error fetching pumps:', error);
    throw error;
  }
};

/**
 * 特定泵浦
 */
export const getRedfishPump = async (pumpId: string): Promise<any> => {
  try {
    const response = await redfishApi.get(`/redfish/v1/Chassis/CDU_Main/ThermalSubsystem/Pumps/${pumpId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching pump ${pumpId}:`, error);
    throw error;
  }
};

/**
 * 冷卻劑連接器集合
 */
export const getRedfishCoolantConnectors = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/ThermalSubsystem/CoolantConnectors');
    return response.data;
  } catch (error) {
    console.error('Error fetching coolant connectors:', error);
    throw error;
  }
};

/**
 * 特定冷卻劑連接器
 */
export const getRedfishCoolantConnector = async (connectorId: string): Promise<any> => {
  try {
    const response = await redfishApi.get(`/redfish/v1/Chassis/CDU_Main/ThermalSubsystem/CoolantConnectors/${connectorId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching coolant connector ${connectorId}:`, error);
    throw error;
  }
};

// === 感測器資源 ===

/**
 * 標準感測器集合
 */
export const getRedfishSensorsCollection = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/Sensors');
    return response.data;
  } catch (error) {
    console.error('Error fetching sensors collection:', error);
    throw error;
  }
};

/**
 * 標準感測器詳情
 */
export const getRedfishSensor = async (sensorId: string): Promise<any> => {
  try {
    const response = await redfishApi.get(`/redfish/v1/Chassis/CDU_Main/Sensors/${sensorId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching sensor ${sensorId}:`, error);
    throw error;
  }
};

/**
 * 環境指標
 */
export const getRedfishEnvironmentMetrics = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Chassis/CDU_Main/EnvironmentMetrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching environment metrics:', error);
    throw error;
  }
};

// === 管理器資源 ===

/**
 * 管理器集合
 */
export const getRedfishManagers = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Managers');
    return response.data;
  } catch (error) {
    console.error('Error fetching managers collection:', error);
    throw error;
  }
};

/**
 * CDU控制器管理器
 */
export const getRedfishCDUController = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Managers/CDU_Controller');
    return response.data;
  } catch (error) {
    console.error('Error fetching CDU controller:', error);
    throw error;
  }
};

/**
 * 網路界面
 */
export const getRedfishEthernetInterfaces = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Managers/CDU_Controller/EthernetInterfaces');
    return response.data;
  } catch (error) {
    console.error('Error fetching ethernet interfaces:', error);
    throw error;
  }
};

/**
 * 網路協定設定
 */
export const getRedfishNetworkProtocol = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Managers/CDU_Controller/NetworkProtocol');
    return response.data;
  } catch (error) {
    console.error('Error fetching network protocol:', error);
    throw error;
  }
};

// === 事件和日誌服務 ===

/**
 * 事件服務
 */
export const getRedfishEventService = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/EventService');
    return response.data;
  } catch (error) {
    console.error('Error fetching event service:', error);
    throw error;
  }
};

/**
 * 事件訂閱集合
 */
export const getRedfishEventSubscriptions = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/EventService/Subscriptions');
    return response.data;
  } catch (error) {
    console.error('Error fetching event subscriptions:', error);
    throw error;
  }
};

/**
 * 創建事件訂閱
 */
export const postRedfishEventSubscription = async (subscription: any): Promise<any> => {
  try {
    const response = await redfishApi.post('/redfish/v1/EventService/Subscriptions', subscription);
    return response.data;
  } catch (error) {
    console.error('Error creating event subscription:', error);
    throw error;
  }
};

/**
 * 日誌服務集合
 */
export const getRedfishLogServices = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Systems/CDU1/LogServices');
    return response.data;
  } catch (error) {
    console.error('Error fetching log services:', error);
    throw error;
  }
};

/**
 * 事件日誌
 */
export const getRedfishEventLog = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Systems/CDU1/LogServices/EventLog');
    return response.data;
  } catch (error) {
    console.error('Error fetching event log:', error);
    throw error;
  }
};

/**
 * 日誌條目
 */
export const getRedfishEventLogEntries = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/Systems/CDU1/LogServices/EventLog/Entries');
    return response.data;
  } catch (error) {
    console.error('Error fetching event log entries:', error);
    throw error;
  }
};

// === 更新和維護服務 ===

/**
 * 更新服務
 */
export const getRedfishUpdateService = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/UpdateService');
    return response.data;
  } catch (error) {
    console.error('Error fetching update service:', error);
    throw error;
  }
};

/**
 * 韌體清單
 */
export const getRedfishFirmwareInventory = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/UpdateService/FirmwareInventory');
    return response.data;
  } catch (error) {
    console.error('Error fetching firmware inventory:', error);
    throw error;
  }
};

/**
 * 簡單韌體更新
 */
export const postRedfishSimpleUpdate = async (updateData: any): Promise<any> => {
  try {
    const response = await redfishApi.post('/redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate', updateData);
    return response.data;
  } catch (error) {
    console.error('Error performing simple update:', error);
    throw error;
  }
};

// === 任務管理服務 ===

/**
 * 任務服務
 */
export const getRedfishTaskService = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/TaskService');
    return response.data;
  } catch (error) {
    console.error('Error fetching task service:', error);
    throw error;
  }
};

/**
 * 任務集合
 */
export const getRedfishTasks = async (): Promise<any> => {
  try {
    const response = await redfishApi.get('/redfish/v1/TaskService/Tasks');
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

/**
 * 特定任務狀態
 */
export const getRedfishTask = async (taskId: string): Promise<any> => {
  try {
    const response = await redfishApi.get(`/redfish/v1/TaskService/Tasks/${taskId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching task ${taskId}:`, error);
    throw error;
  }
};

// === 綜合測試套件更新 ===

/**
 * 運行完整的Redfish標準合規性測試套件
 */
export const runRedfishComplianceTestSuite = async (): Promise<Record<string, any>> => {
  const results: Record<string, any> = {};
  
  // 基礎發現和服務端點
  const discoveryTests = [
    { name: 'redfish_version', fn: getRedfishServiceVersion },
    { name: 'service_root', fn: getRedfishServiceRoot },
    { name: 'odata_service', fn: getRedfishODataService },
    { name: 'metadata', fn: getRedfishMetadata }
  ];
  
  // 核心系統資源
  const systemTests = [
    { name: 'systems_collection', fn: getRedfishSystems },
    { name: 'cdu_system', fn: getRedfishCDUSystem },
    { name: 'system_actions', fn: getRedfishSystemActions }
  ];
  
  // 機箱和熱管理
  const chassisTests = [
    { name: 'chassis_collection', fn: getRedfishChassis },
    { name: 'cdu_chassis', fn: getRedfishCDUChassis },
    { name: 'thermal_legacy', fn: getRedfishThermal },
    { name: 'power_subsystem', fn: getRedfishPower },
    { name: 'thermal_subsystem', fn: getRedfishThermalSubsystem },
    { name: 'thermal_metrics', fn: getRedfishThermalMetrics }
  ];
  
  // CDU專用冷卻資源
  const coolingTests = [
    { name: 'cooling_units', fn: getRedfishCoolingUnits },
    { name: 'cdu_cooling_unit', fn: getRedfishCDUCoolingUnit },
    { name: 'cooling_loops', fn: getRedfishCoolingLoops },
    { name: 'primary_cooling_loop', fn: getRedfishPrimaryCoolingLoop },
    { name: 'pumps', fn: getRedfishPumps },
    { name: 'coolant_connectors', fn: getRedfishCoolantConnectors }
  ];
  
  // 感測器和監控
  const sensorTests = [
    { name: 'sensors_collection', fn: getRedfishSensorsCollection },
    { name: 'environment_metrics', fn: getRedfishEnvironmentMetrics }
  ];
  
  // 管理和網路
  const managementTests = [
    { name: 'managers', fn: getRedfishManagers },
    { name: 'cdu_controller', fn: getRedfishCDUController },
    { name: 'ethernet_interfaces', fn: getRedfishEthernetInterfaces },
    { name: 'network_protocol', fn: getRedfishNetworkProtocol }
  ];
  
  // 事件和日誌
  const eventTests = [
    { name: 'event_service', fn: getRedfishEventService },
    { name: 'event_subscriptions', fn: getRedfishEventSubscriptions },
    { name: 'log_services', fn: getRedfishLogServices },
    { name: 'event_log', fn: getRedfishEventLog },
    { name: 'event_log_entries', fn: getRedfishEventLogEntries }
  ];
  
  // 更新和維護
  const maintenanceTests = [
    { name: 'update_service', fn: getRedfishUpdateService },
    { name: 'firmware_inventory', fn: getRedfishFirmwareInventory },
    { name: 'task_service', fn: getRedfishTaskService },
    { name: 'tasks', fn: getRedfishTasks }
  ];
  
  // 原有的CDU特定測試
  const cduSpecificTests = [
    { name: 'cdu_alarm_registers', fn: getRedfishCDUAlarmRegisters },
    { name: 'active_alarms', fn: () => getRedfishActiveAlarms() },
    { name: 'alarm_statistics', fn: getRedfishAlarmStatistics },
    { name: 'sensor_readings', fn: getRedfishSensorReadings },
    { name: 'function_blocks_config', fn: getRedfishFunctionBlocksConfig },
    { name: 'plc_data', fn: getRedfishPLCs },
    { name: 'cluster_nodes', fn: getRedfishClusterNodes }
  ];
  
  const allTests = [
    ...discoveryTests,
    ...systemTests,
    ...chassisTests,
    ...coolingTests,
    ...sensorTests,
    ...managementTests,
    ...eventTests,
    ...maintenanceTests,
    ...cduSpecificTests
  ];
  
  for (const test of allTests) {
    try {
      const startTime = Date.now();
      const result = await test.fn();
      const duration = Date.now() - startTime;
      results[test.name] = {
        success: true,
        data: result,
        duration
      };
    } catch (error) {
      results[test.name] = {
        success: false,
        error: formatApiError(error),
        duration: 0
      };
    }
  }
  
  return results;
};

// Export the Redfish API instance for advanced usage
export { redfishApi };

// Export default configuration
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  debug: import.meta.env.VITE_DEBUG === 'true'
};
