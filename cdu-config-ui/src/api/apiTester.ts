/**
 * CDU API Testing Utilities
 * 
 * This file provides utilities for testing CDU API endpoints.
 * Useful for development, debugging, and API validation.
 */

import {
  getMachineConfigs,
  createMachineConfig,
  setCurrentMachine,
  deleteMachineConfig,
  getSystemStatus,
  getSensors,
  getAlarms,
  getIntegratedAlarms,
  executeOperation,
  getOperationsStatus,
  writeValue,
  getValuesStatus,
  readRegister,
  writeRegister,
  formatApiError,
  withTimeout,
  type MachineConfigRequest,
  type SensorBatchReadRequest,
  type OperationRequest,
  type ValueWriteRequest,
  type RegisterReadRequest,
  type RegisterWriteRequest
} from './cduApi';

// === Test Configuration ===
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  delay: 1000
};

// === Test Results Interface ===
interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

// === Utility Functions ===

/**
 * Executes a test with timeout and error handling
 */
const executeTest = async (
  name: string,
  testFn: () => Promise<any>
): Promise<TestResult> => {
  const startTime = Date.now();
  
  try {
    const data = await withTimeout(testFn(), TEST_CONFIG.timeout);
    const duration = Date.now() - startTime;
    
    return {
      name,
      success: true,
      duration,
      data
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      name,
      success: false,
      duration,
      error: formatApiError(error)
    };
  }
};

/**
 * Delays execution for specified milliseconds
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Prints test results to console
 */
const printTestResults = (suite: TestSuite): void => {
  console.group(`🧪 Test Suite: ${suite.name}`);
  console.log(`📊 Results: ${suite.passedTests}/${suite.totalTests} passed`);
  console.log(`⏱️ Total Duration: ${suite.totalDuration}ms`);
  
  suite.results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name} (${result.duration}ms)`);
    
    if (!result.success && result.error) {
      console.error(`   Error: ${result.error}`);
    }
  });
  
  console.groupEnd();
};

// === Test Suites ===

/**
 * Tests machine configuration APIs
 */
export const testMachineConfigApis = async (): Promise<TestSuite> => {
  const results: TestResult[] = [];
  
  // Test 1: Get machine configs
  results.push(await executeTest(
    'Get Machine Configs',
    () => getMachineConfigs()
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 2: Switch to compact machine
  results.push(await executeTest(
    'Switch to Compact Machine',
    () => setCurrentMachine('cdu_compact')
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 3: Switch back to default
  results.push(await executeTest(
    'Switch to Default Machine',
    () => setCurrentMachine('default')
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 4: Create custom machine config
  const customConfig: MachineConfigRequest = {
    machine_type: 'test_machine',
    machine_name: 'Test Machine',
    description: 'API test machine configuration',
    sensor_config: {
      temperature: {
        name: '溫度訊息',
        sensors: {
          test_temp: {
            register: 10111,
            description: 'Test Temperature',
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
      pressure: { name: '壓力訊息', sensors: {} },
      flow: { name: '流量訊息', sensors: {} },
      io: { name: '輸入輸出訊息', sensors: {} }
    }
  };
  
  results.push(await executeTest(
    'Create Custom Machine Config',
    () => createMachineConfig(customConfig)
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 5: Delete custom machine config
  results.push(await executeTest(
    'Delete Custom Machine Config',
    () => deleteMachineConfig('test_machine')
  ));
  
  const suite: TestSuite = {
    name: 'Machine Configuration APIs',
    results,
    totalTests: results.length,
    passedTests: results.filter(r => r.success).length,
    failedTests: results.filter(r => !r.success).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
  };
  
  printTestResults(suite);
  return suite;
};

/**
 * Tests sensor APIs
 */
export const testSensorApis = async (): Promise<TestSuite> => {
  const results: TestResult[] = [];
  
  // Test 1: Get all sensors
  results.push(await executeTest(
    'Get All Sensors',
    () => getSensors()
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 2: Get temperature sensors
  results.push(await executeTest(
    'Get Temperature Sensors',
    () => getSensors('temperature')
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 3: Get specific sensor
  results.push(await executeTest(
    'Get Specific Sensor',
    () => getSensors('temperature', 'secondary_return_temp_t11')
  ));
  
  const suite: TestSuite = {
    name: 'Sensor APIs',
    results,
    totalTests: results.length,
    passedTests: results.filter(r => r.success).length,
    failedTests: results.filter(r => !r.success).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
  };
  
  printTestResults(suite);
  return suite;
};

/**
 * Tests alarm APIs
 */
export const testAlarmApis = async (): Promise<TestSuite> => {
  const results: TestResult[] = [];
  
  // Test 1: Get alarms
  results.push(await executeTest(
    'Get Alarms',
    () => getAlarms()
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 2: Get integrated alarms
  results.push(await executeTest(
    'Get Integrated Alarms',
    () => getIntegratedAlarms()
  ));
  
  const suite: TestSuite = {
    name: 'Alarm APIs',
    results,
    totalTests: results.length,
    passedTests: results.filter(r => r.success).length,
    failedTests: results.filter(r => !r.success).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
  };
  
  printTestResults(suite);
  return suite;
};

/**
 * Tests operation APIs
 */
export const testOperationApis = async (): Promise<TestSuite> => {
  const results: TestResult[] = [];
  
  // Test 1: Get operations status
  results.push(await executeTest(
    'Get Operations Status',
    () => getOperationsStatus()
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 2: Execute start operation
  results.push(await executeTest(
    'Execute Start Operation',
    () => executeOperation({ operation: 'start' })
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 3: Execute stop operation
  results.push(await executeTest(
    'Execute Stop Operation',
    () => executeOperation({ operation: 'stop' })
  ));
  
  const suite: TestSuite = {
    name: 'Operation APIs',
    results,
    totalTests: results.length,
    passedTests: results.filter(r => r.success).length,
    failedTests: results.filter(r => !r.success).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
  };
  
  printTestResults(suite);
  return suite;
};

/**
 * Tests value APIs
 */
export const testValueApis = async (): Promise<TestSuite> => {
  const results: TestResult[] = [];
  
  // Test 1: Get values status
  results.push(await executeTest(
    'Get Values Status',
    () => getValuesStatus()
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 2: Write temperature value
  results.push(await executeTest(
    'Write Temperature Value',
    () => writeValue({ parameter: 'temp_setting', value: 25.5 })
  ));
  
  await delay(TEST_CONFIG.delay);
  
  // Test 3: Write fan speed value
  results.push(await executeTest(
    'Write Fan Speed Value',
    () => writeValue({ parameter: 'fan_speed', value: 75 })
  ));
  
  const suite: TestSuite = {
    name: 'Value APIs',
    results,
    totalTests: results.length,
    passedTests: results.filter(r => r.success).length,
    failedTests: results.filter(r => !r.success).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
  };
  
  printTestResults(suite);
  return suite;
};

/**
 * Tests system status API
 */
export const testSystemStatusApi = async (): Promise<TestSuite> => {
  const results: TestResult[] = [];
  
  // Test 1: Get system status
  results.push(await executeTest(
    'Get System Status',
    () => getSystemStatus()
  ));
  
  const suite: TestSuite = {
    name: 'System Status API',
    results,
    totalTests: results.length,
    passedTests: results.filter(r => r.success).length,
    failedTests: results.filter(r => !r.success).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
  };
  
  printTestResults(suite);
  return suite;
};

/**
 * Runs all API tests
 */
export const runAllTests = async (): Promise<TestSuite[]> => {
  console.log('🚀 Starting CDU API Tests...');
  
  const suites: TestSuite[] = [];
  
  try {
    suites.push(await testSystemStatusApi());
    suites.push(await testMachineConfigApis());
    suites.push(await testSensorApis());
    suites.push(await testAlarmApis());
    suites.push(await testOperationApis());
    suites.push(await testValueApis());
  } catch (error) {
    console.error('❌ Test execution failed:', formatApiError(error));
  }
  
  // Print overall summary
  const totalTests = suites.reduce((sum, suite) => sum + suite.totalTests, 0);
  const totalPassed = suites.reduce((sum, suite) => sum + suite.passedTests, 0);
  const totalDuration = suites.reduce((sum, suite) => sum + suite.totalDuration, 0);
  
  console.log('\n📊 Overall Test Summary:');
  console.log(`✅ Passed: ${totalPassed}/${totalTests}`);
  console.log(`⏱️ Total Duration: ${totalDuration}ms`);
  console.log(`📈 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  return suites;
};

// Export for use in development tools
export const apiTester = {
  runAllTests,
  testSystemStatusApi,
  testMachineConfigApis,
  testSensorApis,
  testAlarmApis,
  testOperationApis,
  testValueApis
};
