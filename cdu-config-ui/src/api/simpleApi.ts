/**
 * Simple API Module - Minimal version without complex dependencies
 * 
 * This is a simplified version of the API module to avoid import issues.
 */

// Basic types
export interface ModbusRtuConfig {
  // 設備配置
  device_path: string;  // 如 COM1, COM2 (Windows) 或 /dev/ttyUSB0, /dev/ttyS0 (Linux)
  baud_rate: number;
  data_bits: 8 | 7 | 6 | 5;
  stop_bits: 1 | 2;
  parity: 'none' | 'odd' | 'even';
  timeout: number;  // 通信超時 (毫秒)
  
  // Modbus 參數
  slave_id: number;
  function_code: number;
  register_address: number;
  data_type: 'uint16' | 'float32' | 'int16' | 'int32';
  byte_order: 'big' | 'little';
  word_order: 'big' | 'little';
}

export interface DistributedBlockConfig {
  block_id: string;
  block_type: string;
  device?: string;
  modbus_address?: number;
  register?: number;
  start_register?: number;
  ip_address?: string;
  port?: number;
  unit_id?: number;
}

export interface SensorDefinition {
  // 原有暫存器設定
  register?: number;
  // 新增 Modbus RTU 設定
  modbus_rtu?: ModbusRtuConfig;
  // 新增分散式功能區塊設定
  distributed_block?: DistributedBlockConfig;
  // 配置來源類型
  config_source: 'register' | 'modbus_rtu' | 'distributed_block';
  description: string;
  precision?: number;
  unit?: string;
  min_raw?: number;
  max_raw?: number;
  min_actual?: number;
  max_actual?: number;
  conversion_factor?: number;
  range?: string;
}

export interface SensorTypeConfig {
  name: string;
  sensors: Record<string, SensorDefinition>;
}

export interface SensorConfig {
  temperature: SensorTypeConfig;
  pressure: SensorTypeConfig;
  flow: SensorTypeConfig;
  io: SensorTypeConfig;
}

export interface MachineConfig {
  machine_name: string;
  description: string;
  sensor_config: SensorConfig;
  created_time?: string;
  updated_time?: string;
}

export interface MachineConfigResponse {
  current_machine: string;
  machine_configs: Record<string, MachineConfig>;
}

export interface MachineConfigRequest {
  machine_type: string;
  machine_name: string;
  description: string;
  sensor_config: SensorConfig;
}

// 分散式功能區塊配置 (從 distributed_cdu_config.yaml 解析)
export const distributedFunctionBlocks: DistributedBlockConfig[] = [
  {
    block_id: 'Temp1',
    block_type: 'TempSensorBlock',
    device: 'COM7',
    modbus_address: 4,
    register: 0
  },
  {
    block_id: 'Temp2',
    block_type: 'TempSensorBlock',
    device: 'COM7',
    modbus_address: 4,
    register: 1
  },
  {
    block_id: 'Press1',
    block_type: 'PressSensorBlock',
    device: 'COM7',
    modbus_address: 5,
    register: 2
  },
  {
    block_id: 'MitsubishiPLC1',
    block_type: 'MitsubishiPLCBlock',
    ip_address: '10.10.40.8',
    port: 502,
    unit_id: 1,
    register: 0
  },
  {
    block_id: 'LiquidLevel1',
    block_type: 'LiquidLevelSensorBlock',
    device: '/dev/ttyUSB0',
    register: 1
  }
];

// localStorage 鍵名
const MACHINE_CONFIGS_STORAGE_KEY = 'cdu_machine_configs';

// 從 localStorage 載入機種配置
const loadMachineConfigsFromStorage = (): MachineConfigResponse | null => {
  try {
    const stored = localStorage.getItem(MACHINE_CONFIGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('📂 Loaded machine configs from localStorage:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('❌ Error loading machine configs from localStorage:', error);
  }
  return null;
};

// 儲存機種配置到 localStorage
const saveMachineConfigsToStorage = (configs: MachineConfigResponse): void => {
  try {
    localStorage.setItem(MACHINE_CONFIGS_STORAGE_KEY, JSON.stringify(configs));
    console.log('💾 Saved machine configs to localStorage');
  } catch (error) {
    console.error('❌ Error saving machine configs to localStorage:', error);
  }
};

// 初始預設機種配置
const defaultMachineConfigs: MachineConfigResponse = {
  current_machine: 'distributed_model',
  machine_configs: {
    default: {
      machine_name: '預設標準型',
      description: '通用標準型號',
      sensor_config: {
        temperature: {
          name: '溫度訊息',
          sensors: {
            main_temp: {
              config_source: 'register',
              register: 10111,
              description: '主要溫度',
              precision: 0.1,
              unit: '℃',
              min_raw: 100,
              max_raw: 800,
              min_actual: 10.0,
              max_actual: 80.0,
              conversion_factor: 0.1
            }
          }
        },
        pressure: {
          name: '壓力訊息',
          sensors: {}
        },
        flow: {
          name: '流量訊息',
          sensors: {}
        },
        io: {
          name: '輸入輸出訊息',
          sensors: {}
        }
      }
    },
    cdu_compact: {
      machine_name: '緊湊型高密度 CDU',
      description: '緊湊型高密度 CDU',
      sensor_config: {
        temperature: {
          name: '溫度訊息',
          sensors: {
            inlet_temp: {
              config_source: 'register',
              register: 10111,
              description: '進水溫度',
              precision: 0.1,
              unit: '℃',
              min_actual: 10.0,
              max_actual: 80.0
            },
            outlet_temp: {
              config_source: 'modbus_rtu',
              modbus_rtu: {
                device_path: 'COM1',
                baud_rate: 9600,
                data_bits: 8,
                stop_bits: 1,
                parity: 'none',
                timeout: 1000,
                slave_id: 1,
                function_code: 3,
                register_address: 0x1001,
                data_type: 'float32',
                byte_order: 'big',
                word_order: 'big'
              },
              description: '出水溫度',
              precision: 0.1,
              unit: '℃',
              min_actual: 10.0,
              max_actual: 80.0
            }
          }
        },
        pressure: {
          name: '壓力訊息',
          sensors: {
            inlet_pressure: {
              config_source: 'modbus_rtu',
              modbus_rtu: {
                device_path: '/dev/ttyUSB0',
                baud_rate: 19200,
                data_bits: 8,
                stop_bits: 1,
                parity: 'even',
                timeout: 500,
                slave_id: 2,
                function_code: 4,
                register_address: 0x2001,
                data_type: 'uint16',
                byte_order: 'big',
                word_order: 'big'
              },
              description: '進水壓力',
              precision: 0.01,
              unit: 'bar',
              min_actual: 0.0,
              max_actual: 10.0
            }
          }
        },
        flow: {
          name: '流量訊息',
          sensors: {
            main_flow: {
              config_source: 'register',
              register: 10131,
              description: '主要流量',
              precision: 0.1,
              unit: 'L/min',
              min_actual: 0.0,
              max_actual: 100.0
            }
          }
        },
        io: {
          name: '輸入輸出訊息',
          sensors: {}
        }
      }
    },
    cdu_advanced: {
      machine_name: '具備進階感測器的大型 CDU',
      description: '具備進階感測器的大型 CDU',
      sensor_config: {
        temperature: {
          name: '溫度訊息',
          sensors: {
            inlet_temp: {
              register: 10111,
              description: '進水溫度',
              precision: 0.1,
              unit: '℃',
              min_actual: 10.0,
              max_actual: 80.0
            },
            outlet_temp: {
              register: 10112,
              description: '出水溫度',
              precision: 0.1,
              unit: '℃',
              min_actual: 10.0,
              max_actual: 80.0
            },
            ambient_temp: {
              register: 10113,
              description: '環境溫度',
              precision: 0.1,
              unit: '℃',
              min_actual: 0.0,
              max_actual: 50.0
            }
          }
        },
        pressure: {
          name: '壓力訊息',
          sensors: {
            inlet_pressure: {
              register: 10121,
              description: '進水壓力',
              precision: 0.01,
              unit: 'bar',
              min_actual: 0.0,
              max_actual: 10.0
            },
            outlet_pressure: {
              register: 10122,
              description: '出水壓力',
              precision: 0.01,
              unit: 'bar',
              min_actual: 0.0,
              max_actual: 10.0
            }
          }
        },
        flow: {
          name: '流量訊息',
          sensors: {
            main_flow: {
              register: 10131,
              description: '主要流量',
              precision: 0.1,
              unit: 'L/min',
              min_actual: 0.0,
              max_actual: 100.0
            },
            secondary_flow: {
              register: 10132,
              description: '次要流量',
              precision: 0.1,
              unit: 'L/min',
              min_actual: 0.0,
              max_actual: 50.0
            }
          }
        },
        io: {
          name: '輸入輸出訊息',
          sensors: {
            pump_status: {
              register: 10141,
              description: '泵浦狀態',
              unit: '',
              range: '0-1'
            }
          }
        }
      }
    },
    custom_model_1: {
      machine_name: '針對 A 廠區的特製型號',
      description: '針對 A 廠區的特製型號',
      sensor_config: {
        temperature: {
          name: '溫度訊息',
          sensors: {
            custom_temp: {
              register: 10151,
              description: '自定義溫度',
              precision: 0.1,
              unit: '℃',
              min_actual: 15.0,
              max_actual: 75.0
            }
          }
        },
        pressure: {
          name: '壓力訊息',
          sensors: {}
        },
        flow: {
          name: '流量訊息',
          sensors: {}
        },
        io: {
          name: '輸入輸出訊息',
          sensors: {}
        }
      }
    },
    distributed_model: {
      machine_name: '分散式功能區塊模型',
      description: '使用 distributed_cdu_config.yaml 功能區塊配置的機種',
      sensor_config: {
        temperature: {
          name: '溫度訊息',
          sensors: {
            distributed_temp1: {
              config_source: 'distributed_block',
              distributed_block: {
                block_id: 'Temp1',
                block_type: 'TempSensorBlock',
                device: 'COM7',
                modbus_address: 4,
                register: 0
              },
              description: '分散式溫度感測器 1',
              precision: 0.1,
              unit: '℃',
              min_actual: 0.0,
              max_actual: 100.0
            }
          }
        },
        pressure: {
          name: '壓力訊息',
          sensors: {
            distributed_press1: {
              config_source: 'distributed_block',
              distributed_block: {
                block_id: 'Press1',
                block_type: 'PressSensorBlock',
                device: 'COM7',
                modbus_address: 5,
                register: 2
              },
              description: '分散式壓力感測器 1',
              precision: 0.01,
              unit: 'bar',
              min_actual: 0.0,
              max_actual: 15.0
            }
          }
        },
        flow: {
          name: '流量訊息',
          sensors: {
            mitsubishi_plc_flow: {
              config_source: 'distributed_block',
              distributed_block: {
                block_id: 'MitsubishiPLC1',
                block_type: 'MitsubishiPLCBlock',
                ip_address: '10.10.40.8',
                port: 502,
                unit_id: 1,
                register: 0
              },
              description: '三菱 PLC 流量控制',
              precision: 0.1,
              unit: 'L/min',
              min_actual: 0.0,
              max_actual: 200.0
            }
          }
        },
        io: {
          name: '輸入輸出訊息',
          sensors: {
            liquid_level1: {
              config_source: 'distributed_block',
              distributed_block: {
                block_id: 'LiquidLevel1',
                block_type: 'LiquidLevelSensorBlock',
                device: '/dev/ttyUSB0',
                register: 1
              },
              description: '液位感測器',
              precision: 0.1,
              unit: '%',
              min_actual: 0.0,
              max_actual: 100.0
            }
          }
        }
      }
    }
  }
};

// 使用 localStorage 中的配置或預設配置
export const mockMachineConfigs: MachineConfigResponse = loadMachineConfigsFromStorage() || defaultMachineConfigs;

// 需要更新現有的感測器以包含 config_source
Object.values(mockMachineConfigs.machine_configs).forEach(machine => {
  Object.values(machine.sensor_config).forEach(sensorType => {
    Object.values(sensorType.sensors).forEach(sensor => {
      if (!sensor.config_source) {
        sensor.config_source = 'register';
      }
    });
  });
});

// 真實感測器讀數接口
export interface RealSensorReading {
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

// 測試分散式API連接
export const testDistributedAPI = async (): Promise<any> => {
  try {
    const response = await fetch('http://localhost:8001/api/v1/test');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    console.log('Distributed API test result:', result);
    return result;
  } catch (error) {
    console.error('Error testing distributed API connection:', error);
    throw error;
  }
};

// 獲取動態功能區塊配置 (配合 distributed_main_api.py)
export const getDynamicFunctionBlocksConfig = async (): Promise<any> => {
  try {
    console.log('🔧 Fetching dynamic function blocks config...');
    
    // 使用分散式API端口 8001
    const response = await fetch('http://localhost:8001/api/v1/function-blocks/config');
    
    if (!response.ok) {
      console.error(`❌ Config API response not ok: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 Received function blocks config:', data);
    return data;
  } catch (error) {
    console.error('❌ Error fetching dynamic function blocks config:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    // 返回空配置作為fallback
    console.log('⚠️ Returning empty config as fallback');
    return null;
  }
};

// 獲取真實感測器數據 (配合 distributed_main_api.py)
export const getRealSensorReadings = async (): Promise<RealSensorReading[]> => {
  try {
    console.log('🚀 Starting getRealSensorReadings...');
    
    // 首先測試API連接
    console.log('🔗 Testing API connection...');
    await testDistributedAPI();
    console.log('✅ API connection test successful');
    
    // 使用分散式API端口 8001
    console.log('📡 Fetching sensor readings from distributed API...');
    const response = await fetch('http://localhost:8001/api/v1/sensors/readings');
    
    if (!response.ok) {
      console.error(`❌ API response not ok: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 Received sensor readings from API:', data);
    console.log('📈 Number of readings:', data.length);
    
    // 詳細檢查每個讀數
    data.forEach((reading, index) => {
      console.log(`📋 Reading ${index + 1}:`, {
        block_id: reading.block_id,
        block_type: reading.block_type,
        value: reading.value,
        status: reading.status,
        health: reading.health,
        unit: reading.unit
      });
    });
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching real sensor readings from distributed API:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    // 返回空數組作為fallback
    console.log('⚠️ Returning empty array as fallback');
    return [];
  }
};

// Simple API functions using mock data
export const getMachineConfigs = async (): Promise<MachineConfigResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return Promise.resolve(mockMachineConfigs);
};

export const setCurrentMachine = async (machineType: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  mockMachineConfigs.current_machine = machineType;
  // 保存到 localStorage
  saveMachineConfigsToStorage(mockMachineConfigs);
  return Promise.resolve();
};

export const createMachineConfig = async (config: MachineConfigRequest): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  mockMachineConfigs.machine_configs[config.machine_type] = {
    machine_name: config.machine_name,
    description: config.description,
    sensor_config: config.sensor_config,
    created_time: new Date().toISOString(),
    updated_time: new Date().toISOString()
  };
  // 保存到 localStorage
  saveMachineConfigsToStorage(mockMachineConfigs);
  console.log(`✅ Created and saved machine config: ${config.machine_type}`);
  return Promise.resolve();
};

export const deleteMachineConfig = async (machineType: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  delete mockMachineConfigs.machine_configs[machineType];
  // 保存到 localStorage
  saveMachineConfigsToStorage(mockMachineConfigs);
  console.log(`✅ Deleted and saved machine config: ${machineType}`);
  return Promise.resolve();
};

// 重置機種配置到預設值 (清除 localStorage)
export const resetMachineConfigs = async (): Promise<void> => {
  try {
    localStorage.removeItem(MACHINE_CONFIGS_STORAGE_KEY);
    // 重新載入預設配置
    Object.assign(mockMachineConfigs, defaultMachineConfigs);
    console.log('🔄 Reset machine configs to default');
  } catch (error) {
    console.error('❌ Error resetting machine configs:', error);
  }
  return Promise.resolve();
};

// Utility functions
export const formatApiError = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return '未知錯誤';
};

export const isApiError = (error: any): boolean => {
  return error instanceof Error || (error && typeof error.message === 'string');
};

// Export default
const simpleApi = {
  getMachineConfigs,
  setCurrentMachine,
  createMachineConfig,
  deleteMachineConfig,
  resetMachineConfigs,
  formatApiError,
  isApiError
};

export default simpleApi;
