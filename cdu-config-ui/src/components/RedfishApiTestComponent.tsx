/**
 * Redfish API Test Component
 * 
 * Comprehensive testing tool for CDU Redfish API functionality
 * Covers all API endpoints following DMTF Redfish standards
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Alert,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Settings as SystemIcon,
  Sensors as SensorsIcon,
  Computer as PLCIcon,
  Notifications as AlarmIcon,
  Cloud as ClusterIcon,
  Timeline as BatchIcon,
  Dashboard as DashboardIcon,
  Hub as ServiceIcon,
  Storage as ResourceIcon,
  DeviceThermostat as CoolingIcon,
  AccountTree as ManagementIcon,
  Event as EventIcon,
  SystemUpdate as UpdateIcon,
  Assignment as TaskIcon,
  Assessment as AnalyticsIcon,
  Speed as PerformanceIcon,
  BugReport as RegressionIcon,
  CloudQueue as EnvironmentIcon
} from '@mui/icons-material';

// Import Redfish API functions
import {
  // System APIs
  getRedfishSystemRoot,
  getRedfishHealthCheck,
  getRedfishSystemStatus,
  // Standard Redfish Service Discovery APIs  
  getRedfishServiceVersion,
  getRedfishServiceRoot,
  getRedfishODataService,
  getRedfishMetadata,
  // Standard Redfish Systems APIs
  getRedfishSystems,
  getRedfishCDUSystem,
  getRedfishSystemActions,
  // Standard Redfish Chassis APIs
  getRedfishChassis,
  getRedfishCDUChassis,
  getRedfishThermal,
  getRedfishPower,
  // DMTF 2024.4 Cooling Resource APIs
  getRedfishThermalSubsystem,
  getRedfishThermalMetrics,
  getRedfishCoolingUnits,
  getRedfishCDUCoolingUnit,
  getRedfishCoolingLoops,
  getRedfishPrimaryCoolingLoop,
  getRedfishPumps,
  getRedfishPump,
  getRedfishCoolantConnectors,
  getRedfishCoolantConnector,
  // Standard Redfish Sensor APIs
  getRedfishSensorsCollection,
  getRedfishSensor,
  getRedfishEnvironmentMetrics,
  // Sensor APIs
  getRedfishSensors,
  getRedfishSensorReadings,
  getRedfishSensorDetail,
  getRedfishFunctionBlocksConfig,
  getRedfishApiTest,
  // PLC APIs
  getRedfishPLCs,
  getRedfishPLCDetail,
  getRedfishPLCRegisters,
  writeRedfishPLCRegister,
  writeRedfishPLCRegistersBatch,
  // Standard Redfish Manager APIs
  getRedfishManagers,
  getRedfishCDUController,
  getRedfishEthernetInterfaces,
  getRedfishNetworkProtocol,
  // Standard Redfish Event Service APIs
  getRedfishEventService,
  getRedfishEventSubscriptions,
  getRedfishLogServices,
  getRedfishEventLog,
  getRedfishEventLogEntries,
  // Standard Redfish Update Service APIs
  getRedfishUpdateService,
  getRedfishFirmwareInventory,
  // Standard Redfish Task Service APIs
  getRedfishTaskService,
  getRedfishTasks,
  getRedfishTask,
  // Alarm APIs
  getRedfishCDUAlarmRegisters,
  getRedfishActiveAlarms,
  acknowledgeRedfishAlarm,
  getRedfishAlarmStatistics,
  getRedfishAlarmHistory,
  updateRedfishSNMPSettings,
  testRedfishSNMPConnection,
  // Cluster APIs
  getRedfishClusterNodes,
  // Batch test
  runRedfishTestSuite,
  formatApiError,
  type RedfishSensorReading,
  type RedfishFunctionBlockConfig,
  type RedfishPLCRegisters,
  type AlarmStatistics,
  type SNMPSettings
} from '../api/cduApi';

// Import data visualization component and advanced testing modules
import RedfishDataVisualization from './RedfishDataVisualization';
import AdvancedBatchTestComponent from './redfish-tests/AdvancedBatchTestComponent';
import TestAnalyticsReportComponent from './redfish-tests/TestAnalyticsReportComponent';
import PerformanceBenchmarkComponent from './redfish-tests/PerformanceBenchmarkComponent';
import RegressionTestComponent from './redfish-tests/RegressionTestComponent';
import TestEnvironmentComponent from './redfish-tests/TestEnvironmentComponent';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`redfish-tabpanel-${index}`}
      aria-labelledby={`redfish-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

const RedfishApiTestComponent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [batchTesting, setBatchTesting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  
  // 數據可視化狀態
  const [visualizationData, setVisualizationData] = useState<{
    sensorReadings: RedfishSensorReading[];
    alarmStatistics?: AlarmStatistics;
    functionBlocksConfig?: RedfishFunctionBlockConfig;
  }>({ sensorReadings: [] });

  // PLC Write Parameters
  const [plcWriteParams, setPLCWriteParams] = useState({
    plcId: 'PLC1-Temp1',
    registerAddress: 10500,
    value: 100,
    batchStartAddress: 10500,
    batchValues: '100,200,300'
  });

  // SNMP Settings
  const [snmpSettings, setSNMPSettings] = useState<SNMPSettings>({
    enabled: true,
    destination_ip: '192.168.100.100',
    port: 162,
    community: 'public',
    version: 'v2c',
    warning_interval: 30,
    alert_interval: 10
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const setTestLoading = (testName: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [testName]: isLoading }));
  };

  const setTestResult = (testName: string, result: TestResult) => {
    setResults(prev => ({ 
      ...prev, 
      [testName]: { 
        ...result, 
        timestamp: new Date().toISOString() 
      }
    }));
    
    // 更新可視化數據
    if (result.success && result.data) {
      if (testName === 'sensorReadings' && Array.isArray(result.data)) {
        setVisualizationData(prev => ({ ...prev, sensorReadings: result.data }));
      } else if (testName === 'alarmStatistics') {
        setVisualizationData(prev => ({ ...prev, alarmStatistics: result.data }));
      } else if (testName === 'functionBlocksConfig') {
        setVisualizationData(prev => ({ ...prev, functionBlocksConfig: result.data }));
      }
    }
  };

  const executeTest = async (testName: string, testFn: () => Promise<any>) => {
    setTestLoading(testName, true);
    const startTime = Date.now();
    
    try {
      const data = await testFn();
      const duration = Date.now() - startTime;
      setTestResult(testName, { success: true, data, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      setTestResult(testName, { 
        success: false, 
        error: formatApiError(error), 
        duration 
      });
    } finally {
      setTestLoading(testName, false);
    }
  };

  const toggleResultExpansion = (testName: string) => {
    setExpandedResults(prev => ({ ...prev, [testName]: !prev[testName] }));
  };

  const renderTestButton = (
    testName: string, 
    label: string, 
    testFn: () => void,
    description?: string
  ) => {
    const isLoading = loading[testName];
    const result = results[testName];
    const isExpanded = expandedResults[testName];

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box>
              <Typography variant="h6">{label}</Typography>
              {description && (
                <Typography variant="body2" color="textSecondary">
                  {description}
                </Typography>
              )}
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {result && (
                <Chip
                  icon={result.success ? <SuccessIcon /> : <ErrorIcon />}
                  label={result.success ? 'Success' : 'Failed'}
                  color={result.success ? 'success' : 'error'}
                  size="small"
                />
              )}
              <Button
                variant="contained"
                onClick={testFn}
                disabled={isLoading}
                startIcon={isLoading ? <LinearProgress size={20} /> : <RunIcon />}
                color={result?.success ? 'success' : result?.error ? 'error' : 'primary'}
              >
                {isLoading ? 'Testing...' : 'Test'}
              </Button>
            </Box>
          </Box>

          {result && (
            <Box mt={2}>
              <Alert 
                severity={result.success ? 'success' : 'error'}
                action={
                  result.data && (
                    <IconButton
                      size="small"
                      onClick={() => toggleResultExpansion(testName)}
                    >
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  )
                }
              >
                <Box>
                  <Typography variant="body2">
                    {result.success 
                      ? `✅ Test completed successfully` 
                      : `❌ Test failed: ${result.error}`
                    }
                  </Typography>
                  {result.duration && (
                    <Typography variant="caption" color="textSecondary">
                      Duration: {result.duration}ms | {result.timestamp}
                    </Typography>
                  )}
                </Box>
              </Alert>

              {result.data && (
                <Collapse in={isExpanded}>
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',
                      backgroundColor: '#f5f5f5',
                      padding: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 400,
                      mt: 1
                    }}
                  >
                    {JSON.stringify(result.data, null, 2)}
                  </Box>
                </Collapse>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // Standard Redfish Service Discovery Tests
  const ServiceDiscoveryTests = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        標準Redfish服務發現測試
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        測試DMTF Redfish標準服務發現端點，包括服務根目錄、版本信息和元數據描述。
      </Typography>
      
      {renderTestButton(
        'serviceVersion',
        'Redfish服務版本',
        () => executeTest('serviceVersion', getRedfishServiceVersion),
        'GET /redfish - 獲取Redfish服務版本信息'
      )}

      {renderTestButton(
        'serviceRoot',
        'Redfish服務根目錄',
        () => executeTest('serviceRoot', getRedfishServiceRoot),
        'GET /redfish/v1 - 獲取Redfish服務根目錄結構'
      )}

      {renderTestButton(
        'odataService',
        'OData服務文檔',
        () => executeTest('odataService', getRedfishODataService),
        'GET /redfish/v1/odata - 獲取OData服務描述文檔'
      )}

      {renderTestButton(
        'metadata',
        'CSDL元數據',
        () => executeTest('metadata', getRedfishMetadata),
        'GET /redfish/v1/$metadata - 獲取CSDL元數據描述'
      )}
    </Box>
  );

  // Standard Redfish Systems and Chassis Tests
  const StandardResourceTests = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        標準Redfish資源測試
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        測試DMTF Redfish標準Systems和Chassis資源端點，包括系統信息、機箱資源、電源和散熱管理。
      </Typography>
      
      {renderTestButton(
        'systemsCollection',
        'Systems集合',
        () => executeTest('systemsCollection', getRedfishSystems),
        'GET /redfish/v1/Systems - 獲取系統資源集合'
      )}

      {renderTestButton(
        'cduSystem',
        'CDU系統資源',
        () => executeTest('cduSystem', getRedfishCDUSystem),
        'GET /redfish/v1/Systems/CDU1 - 獲取CDU系統詳細信息'
      )}

      {renderTestButton(
        'systemActions',
        '系統操作端點',
        () => executeTest('systemActions', getRedfishSystemActions),
        'GET /redfish/v1/Systems/CDU1/Actions - 獲取可用系統操作'
      )}

      {renderTestButton(
        'chassisCollection',
        'Chassis集合',
        () => executeTest('chassisCollection', getRedfishChassis),
        'GET /redfish/v1/Chassis - 獲取機箱資源集合'
      )}

      {renderTestButton(
        'cduChassis',
        'CDU機箱資源',
        () => executeTest('cduChassis', getRedfishCDUChassis),
        'GET /redfish/v1/Chassis/CDU_Main - 獲取CDU機箱詳細信息'
      )}

      {renderTestButton(
        'thermalResource',
        '散熱資源',
        () => executeTest('thermalResource', getRedfishThermal),
        'GET /redfish/v1/Chassis/CDU_Main/Thermal - 獲取散熱管理信息'
      )}

      {renderTestButton(
        'powerResource',
        '電源資源',
        () => executeTest('powerResource', getRedfishPower),
        'GET /redfish/v1/Chassis/CDU_Main/Power - 獲取電源管理信息'
      )}
    </Box>
  );

  // DMTF 2024.4 Cooling Resources Tests  
  const CoolingResourceTests = () => {
    const [selectedPumpId, setSelectedPumpId] = useState('Pump1');
    const [selectedConnectorId, setSelectedConnectorId] = useState('Inlet1');
    const [pumpIds] = useState(['Pump1', 'Pump2', 'Pump3', 'Pump4']);
    const [connectorIds] = useState(['Inlet1', 'Inlet2', 'Outlet1', 'Outlet2']);

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          DMTF 2024.4冷卻資源測試
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          測試最新DMTF Redfish 2024.4標準的冷卻資源端點，包括冷卻單元、冷卻回路、泵和冷卻劑連接器。
        </Typography>
        
        {renderTestButton(
          'thermalSubsystem',
          '散熱子系統',
          () => executeTest('thermalSubsystem', getRedfishThermalSubsystem),
          'GET /redfish/v1/Chassis/CDU_Main/ThermalSubsystem - 獲取散熱子系統信息'
        )}

        {renderTestButton(
          'thermalMetrics',
          '散熱指標',
          () => executeTest('thermalMetrics', getRedfishThermalMetrics),
          'GET /redfish/v1/Chassis/CDU_Main/ThermalSubsystem/ThermalMetrics - 獲取散熱性能指標'
        )}

        {renderTestButton(
          'coolingUnits',
          '冷卻單元集合',
          () => executeTest('coolingUnits', getRedfishCoolingUnits),
          'GET /redfish/v1/ThermalEquipment/CoolingUnits - 獲取冷卻單元集合'
        )}

        {renderTestButton(
          'cduCoolingUnit',
          'CDU冷卻單元',
          () => executeTest('cduCoolingUnit', getRedfishCDUCoolingUnit),
          'GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1 - 獲取CDU冷卻單元詳細信息'
        )}

        {renderTestButton(
          'coolingLoops',
          '冷卻回路集合',
          () => executeTest('coolingLoops', getRedfishCoolingLoops),
          'GET /redfish/v1/ThermalEquipment/CoolingLoops - 獲取冷卻回路集合'
        )}

        {renderTestButton(
          'primaryCoolingLoop',
          '主冷卻回路',
          () => executeTest('primaryCoolingLoop', getRedfishPrimaryCoolingLoop),
          'GET /redfish/v1/ThermalEquipment/CoolingLoops/Primary - 獲取主冷卻回路詳細信息'
        )}

        {renderTestButton(
          'pumpsCollection',
          '泵設備集合',
          () => executeTest('pumpsCollection', getRedfishPumps),
          'GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1/Pumps - 獲取泵設備集合'
        )}

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              特定泵設備測試
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>選擇泵ID</InputLabel>
              <Select
                value={selectedPumpId}
                onChange={(e) => setSelectedPumpId(e.target.value)}
              >
                {pumpIds.map(id => (
                  <MenuItem key={id} value={id}>{id}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => executeTest(`pump_${selectedPumpId}`, 
                () => getRedfishPump(selectedPumpId))}
              startIcon={<RunIcon />}
            >
              測試 GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1/Pumps/{selectedPumpId}
            </Button>
          </CardContent>
        </Card>

        {renderTestButton(
          'coolantConnectors',
          '冷卻劑連接器集合',
          () => executeTest('coolantConnectors', getRedfishCoolantConnectors),
          'GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1/CoolantConnectors - 獲取冷卻劑連接器集合'
        )}

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              特定冷卻劑連接器測試
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>選擇連接器ID</InputLabel>
              <Select
                value={selectedConnectorId}
                onChange={(e) => setSelectedConnectorId(e.target.value)}
              >
                {connectorIds.map(id => (
                  <MenuItem key={id} value={id}>{id}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => executeTest(`coolantConnector_${selectedConnectorId}`, 
                () => getRedfishCoolantConnector(selectedConnectorId))}
              startIcon={<RunIcon />}
            >
              測試 GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1/CoolantConnectors/{selectedConnectorId}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Standard Redfish Sensor Tests
  const StandardSensorTests = () => {
    const [selectedSensorId, setSelectedSensorId] = useState('TempSensor1');
    const [standardSensorIds] = useState([
      'TempSensor1', 'TempSensor2', 'TempSensor3', 'TempSensor4',
      'PressureSensor1', 'PressureSensor2', 
      'FlowSensor1', 'FlowSensor2'
    ]);

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          標準Redfish感測器測試
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          測試標準Redfish感測器資源端點，包括感測器集合、環境指標和感測器詳細信息。
        </Typography>
        
        {renderTestButton(
          'sensorsCollection',
          '標準感測器集合',
          () => executeTest('sensorsCollection', getRedfishSensorsCollection),
          'GET /redfish/v1/Chassis/CDU_Main/Sensors - 獲取標準感測器集合'
        )}

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              特定標準感測器測試
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>選擇感測器</InputLabel>
              <Select
                value={selectedSensorId}
                onChange={(e) => setSelectedSensorId(e.target.value)}
              >
                {standardSensorIds.map(id => (
                  <MenuItem key={id} value={id}>{id}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => executeTest(`standardSensor_${selectedSensorId}`, 
                () => getRedfishSensor(selectedSensorId))}
              startIcon={<RunIcon />}
            >
              測試 GET /redfish/v1/Chassis/CDU_Main/Sensors/{selectedSensorId}
            </Button>
          </CardContent>
        </Card>

        {renderTestButton(
          'environmentMetrics',
          '環境指標',
          () => executeTest('environmentMetrics', getRedfishEnvironmentMetrics),
          'GET /redfish/v1/Chassis/CDU_Main/EnvironmentMetrics - 獲取環境監控指標'
        )}
      </Box>
    );
  };

  // System Information Tests  
  const SystemInfoTests = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        系統基本信息測試
      </Typography>
      
      {renderTestButton(
        'systemRoot',
        '系統根信息',
        () => executeTest('systemRoot', getRedfishSystemRoot),
        'GET / - 獲取系統基本信息和版本'
      )}

      {renderTestButton(
        'healthCheck',
        '健康檢查',
        () => executeTest('healthCheck', getRedfishHealthCheck),
        'GET /health - 檢查系統運行狀態'
      )}

      {renderTestButton(
        'systemStatus',
        '系統狀態',
        () => executeTest('systemStatus', getRedfishSystemStatus),
        'GET /status - 獲取詳細系統狀態信息'
      )}

      {renderTestButton(
        'apiTest',
        'API連接測試',
        () => executeTest('apiTest', getRedfishApiTest),
        'GET /api/v1/test - 測試API服務連接性'
      )}
    </Box>
  );

  // Sensor Management Tests
  const SensorTests = () => {
    const [selectedSensorId, setSelectedSensorId] = useState('PLC1-Temp1');
    const [sensorIds] = useState([
      'Temp1', 'Temp2', 'Temp3',
      'Press1', 'Press2',
      'PLC1-Temp1', 'PLC1-Temp2', 'PLC1-Temp3', 'PLC1-Temp4',
      'PLC1-Press1', 'PLC1-Press2', 'PLC1-Press3',
      'PLC1-Flow1', 'PLC1-Flow2'
    ]);

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          感測器管理API測試
        </Typography>

        {renderTestButton(
          'sensors',
          '所有感測器信息',
          () => executeTest('sensors', getRedfishSensors),
          'GET /sensors - 獲取所有感測器基本信息'
        )}

        {renderTestButton(
          'sensorReadings',
          '即時感測器讀數',
          () => executeTest('sensorReadings', getRedfishSensorReadings),
          'GET /api/v1/sensors/readings - 獲取所有感測器即時數據'
        )}

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              特定感測器詳細信息
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>選擇感測器</InputLabel>
              <Select
                value={selectedSensorId}
                onChange={(e) => setSelectedSensorId(e.target.value)}
              >
                {sensorIds.map(id => (
                  <MenuItem key={id} value={id}>{id}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => executeTest(`sensorDetail_${selectedSensorId}`, 
                () => getRedfishSensorDetail(selectedSensorId))}
              startIcon={<RunIcon />}
            >
              測試 GET /sensors/{selectedSensorId}
            </Button>
          </CardContent>
        </Card>

        {renderTestButton(
          'functionBlocksConfig',
          '功能區塊配置',
          () => executeTest('functionBlocksConfig', getRedfishFunctionBlocksConfig),
          'GET /api/v1/function-blocks/config - 獲取動態功能區塊配置'
        )}
      </Box>
    );
  };

  // PLC Management Tests
  const PLCTests = () => {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          PLC管理API測試
        </Typography>

        {renderTestButton(
          'plcData',
          '所有PLC數據',
          () => executeTest('plcData', getRedfishPLCs),
          'GET /plc - 獲取所有PLC區塊狀態'
        )}

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              PLC詳細信息和暫存器操作
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="PLC ID"
                  value={plcWriteParams.plcId}
                  onChange={(e) => setPLCWriteParams(prev => ({ ...prev, plcId: e.target.value }))}
                />
              </Grid>
            </Grid>

            <Grid container spacing={1}>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="outlined"
                  onClick={() => executeTest(`plcDetail_${plcWriteParams.plcId}`, 
                    () => getRedfishPLCDetail(plcWriteParams.plcId))}
                  startIcon={<RunIcon />}
                  fullWidth
                >
                  PLC詳細信息
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="outlined"
                  onClick={() => executeTest(`plcRegisters_${plcWriteParams.plcId}`, 
                    () => getRedfishPLCRegisters(plcWriteParams.plcId))}
                  startIcon={<RunIcon />}
                  fullWidth
                >
                  PLC暫存器數據
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              PLC暫存器寫入操作
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="暫存器地址"
                  value={plcWriteParams.registerAddress}
                  onChange={(e) => setPLCWriteParams(prev => ({ 
                    ...prev, 
                    registerAddress: parseInt(e.target.value) 
                  }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="寫入值"
                  value={plcWriteParams.value}
                  onChange={(e) => setPLCWriteParams(prev => ({ 
                    ...prev, 
                    value: parseInt(e.target.value) 
                  }))}
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              color="warning"
              onClick={() => executeTest('plcWriteRegister', 
                () => writeRedfishPLCRegister(
                  plcWriteParams.plcId, 
                  plcWriteParams.registerAddress, 
                  plcWriteParams.value
                ))}
              startIcon={<RunIcon />}
              sx={{ mb: 2 }}
            >
              寫入單個暫存器
            </Button>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="批量起始地址"
                  value={plcWriteParams.batchStartAddress}
                  onChange={(e) => setPLCWriteParams(prev => ({ 
                    ...prev, 
                    batchStartAddress: parseInt(e.target.value) 
                  }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="批量寫入值 (逗號分隔)"
                  value={plcWriteParams.batchValues}
                  onChange={(e) => setPLCWriteParams(prev => ({ 
                    ...prev, 
                    batchValues: e.target.value 
                  }))}
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              color="error"
              onClick={() => {
                const values = plcWriteParams.batchValues.split(',').map(v => parseInt(v.trim()));
                executeTest('plcWriteBatch', 
                  () => writeRedfishPLCRegistersBatch(plcWriteParams.plcId, {
                    start_address: plcWriteParams.batchStartAddress,
                    values: values
                  }))
              }}
              startIcon={<RunIcon />}
            >
              批量寫入暫存器
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Alarm Management Tests
  const AlarmTests = () => {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          警報管理系統API測試 (Redfish風格)
        </Typography>

        {renderTestButton(
          'cduAlarmRegisters',
          'CDU警報暫存器 (80種警報代碼)',
          () => executeTest('cduAlarmRegisters', getRedfishCDUAlarmRegisters),
          'GET /redfish/v1/Systems/CDU1/Oem/CDU/Alarms - R10001-R10005警報暫存器'
        )}

        {renderTestButton(
          'activeAlarms',
          '活躍警報列表',
          () => executeTest('activeAlarms', () => getRedfishActiveAlarms()),
          'GET /redfish/v1/Chassis/CDU_Main/Alarms/ - 當前活躍的警報'
        )}

        {renderTestButton(
          'alarmStatistics',
          '警報統計信息',
          () => executeTest('alarmStatistics', getRedfishAlarmStatistics),
          'GET /redfish/v1/Chassis/CDU_Main/Alarms/Statistics - 警報統計數據'
        )}

        {renderTestButton(
          'alarmHistory',
          '警報歷史記錄',
          () => executeTest('alarmHistory', () => getRedfishAlarmHistory()),
          'GET /redfish/v1/Chassis/CDU_Main/Alarms/History - 警報歷史數據'
        )}

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              SNMP設定管理
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="目標IP"
                  value={snmpSettings.destination_ip}
                  onChange={(e) => setSNMPSettings(prev => ({ 
                    ...prev, 
                    destination_ip: e.target.value 
                  }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="SNMP端口"
                  value={snmpSettings.port}
                  onChange={(e) => setSNMPSettings(prev => ({ 
                    ...prev, 
                    port: parseInt(e.target.value) 
                  }))}
                />
              </Grid>
            </Grid>

            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  onClick={() => executeTest('updateSNMPSettings', 
                    () => updateRedfishSNMPSettings(snmpSettings))}
                  startIcon={<RunIcon />}
                  fullWidth
                >
                  更新SNMP設定
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  onClick={() => executeTest('testSNMPConnection', testRedfishSNMPConnection)}
                  startIcon={<RunIcon />}
                  fullWidth
                >
                  測試SNMP連接
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Standard Redfish Management Tests
  const ManagementTests = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        標準Redfish管理測試
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        測試標準Redfish管理資源端點，包括管理器、網路接口和網路協議配置。
      </Typography>
      
      {renderTestButton(
        'managersCollection',
        'Managers集合',
        () => executeTest('managersCollection', getRedfishManagers),
        'GET /redfish/v1/Managers - 獲取管理器資源集合'
      )}

      {renderTestButton(
        'cduController',
        'CDU控制器',
        () => executeTest('cduController', getRedfishCDUController),
        'GET /redfish/v1/Managers/CDUController - 獲取CDU控制器詳細信息'
      )}

      {renderTestButton(
        'ethernetInterfaces',
        '乙太網路接口',
        () => executeTest('ethernetInterfaces', getRedfishEthernetInterfaces),
        'GET /redfish/v1/Managers/CDUController/EthernetInterfaces - 獲取網路接口信息'
      )}

      {renderTestButton(
        'networkProtocol',
        '網路協議設定',
        () => executeTest('networkProtocol', getRedfishNetworkProtocol),
        'GET /redfish/v1/Managers/CDUController/NetworkProtocol - 獲取網路協議配置'
      )}
    </Box>
  );

  // Standard Redfish Event Service Tests
  const EventServiceTests = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        標準Redfish事件服務測試
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        測試標準Redfish事件服務端點，包括事件訂閱、日誌服務和事件記錄管理。
      </Typography>
      
      {renderTestButton(
        'eventService',
        '事件服務',
        () => executeTest('eventService', getRedfishEventService),
        'GET /redfish/v1/EventService - 獲取事件服務配置信息'
      )}

      {renderTestButton(
        'eventSubscriptions',
        '事件訂閱',
        () => executeTest('eventSubscriptions', getRedfishEventSubscriptions),
        'GET /redfish/v1/EventService/Subscriptions - 獲取事件訂閱列表'
      )}

      {renderTestButton(
        'logServices',
        '日誌服務',
        () => executeTest('logServices', getRedfishLogServices),
        'GET /redfish/v1/Managers/CDUController/LogServices - 獲取日誌服務列表'
      )}

      {renderTestButton(
        'eventLog',
        '事件日誌',
        () => executeTest('eventLog', getRedfishEventLog),
        'GET /redfish/v1/Managers/CDUController/LogServices/EventLog - 獲取事件日誌服務'
      )}

      {renderTestButton(
        'eventLogEntries',
        '事件日誌條目',
        () => executeTest('eventLogEntries', getRedfishEventLogEntries),
        'GET /redfish/v1/Managers/CDUController/LogServices/EventLog/Entries - 獲取事件日誌條目'
      )}
    </Box>
  );

  // Standard Redfish Update Service Tests
  const UpdateServiceTests = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        標準Redfish更新服務測試
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        測試標準Redfish更新服務端點，包括韌體更新、韌體庫存和更新操作管理。
      </Typography>
      
      {renderTestButton(
        'updateService',
        '更新服務',
        () => executeTest('updateService', getRedfishUpdateService),
        'GET /redfish/v1/UpdateService - 獲取更新服務配置信息'
      )}

      {renderTestButton(
        'firmwareInventory',
        '韌體庫存',
        () => executeTest('firmwareInventory', getRedfishFirmwareInventory),
        'GET /redfish/v1/UpdateService/FirmwareInventory - 獲取韌體庫存信息'
      )}
    </Box>
  );

  // Standard Redfish Task Service Tests  
  const TaskServiceTests = () => {
    const [selectedTaskId, setSelectedTaskId] = useState('Task1');
    const [taskIds] = useState(['Task1', 'Task2', 'Task3', 'FirmwareUpdate1', 'ConfigBackup1']);

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          標準Redfish任務服務測試
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          測試標準Redfish任務服務端點，包括任務管理、長時間運行操作和任務狀態監控。
        </Typography>
        
        {renderTestButton(
          'taskService',
          '任務服務',
          () => executeTest('taskService', getRedfishTaskService),
          'GET /redfish/v1/TaskService - 獲取任務服務配置信息'
        )}

        {renderTestButton(
          'tasksCollection',
          '任務集合',
          () => executeTest('tasksCollection', getRedfishTasks),
          'GET /redfish/v1/TaskService/Tasks - 獲取任務集合列表'
        )}

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              特定任務狀態測試
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>選擇任務ID</InputLabel>
              <Select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                {taskIds.map(id => (
                  <MenuItem key={id} value={id}>{id}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => executeTest(`task_${selectedTaskId}`, 
                () => getRedfishTask(selectedTaskId))}
              startIcon={<RunIcon />}
            >
              測試 GET /redfish/v1/TaskService/Tasks/{selectedTaskId}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Cluster Management Tests
  const ClusterTests = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        集群管理API測試
      </Typography>

      {renderTestButton(
        'clusterNodes',
        '集群節點信息',
        () => executeTest('clusterNodes', getRedfishClusterNodes),
        'GET /cluster/nodes - 獲取分散式系統節點信息'
      )}
    </Box>
  );

  // Data Visualization
  const DataVisualization = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        數據可視化儀表板
      </Typography>
      
      <RedfishDataVisualization
        sensorReadings={visualizationData.sensorReadings}
        alarmStatistics={visualizationData.alarmStatistics}
        functionBlocksConfig={visualizationData.functionBlocksConfig}
        testResults={results}
      />
    </Box>
  );

  // Advanced Testing Components
  const AdvancedBatchTests = () => (
    <AdvancedBatchTestComponent />
  );

  const TestAnalyticsReports = () => (
    <TestAnalyticsReportComponent 
      testResults={results}
      testSessions={[]} // Would be passed from parent state in real implementation
    />
  );

  const PerformanceBenchmarks = () => (
    <PerformanceBenchmarkComponent />
  );

  const RegressionTests = () => (
    <RegressionTestComponent />
  );

  const TestEnvironments = () => (
    <TestEnvironmentComponent />
  );

  // Legacy Batch Testing (kept for compatibility)
  const BatchTests = () => {
    const runBatchTest = async () => {
      setBatchTesting(true);
      setBatchProgress(0);
      
      try {
        const results = await runRedfishTestSuite();
        const testNames = Object.keys(results);
        
        // 逐步更新進度和結果
        testNames.forEach((testName, index) => {
          setTimeout(() => {
            setTestResult(testName, results[testName]);
            setBatchProgress(((index + 1) / testNames.length) * 100);
          }, index * 100);
        });
        
        setTimeout(() => {
          setBatchTesting(false);
        }, testNames.length * 100);
        
      } catch (error) {
        console.error('Batch test failed:', error);
        setBatchTesting(false);
      }
    };

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          標準批量測試
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>建議使用:</strong> 切換至"高級批量測試"頁籤以體驗智能重試、性能監控和歷史比較等先進功能
          </Typography>
        </Alert>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              基礎API測試套件
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              執行所有DMTF標準Redfish API端點的基礎測試，適合快速驗證系統功能。
            </Typography>
            
            {batchTesting && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={batchProgress} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  測試進度: {Math.round(batchProgress)}%
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              size="large"
              onClick={runBatchTest}
              disabled={batchTesting}
              startIcon={batchTesting ? <StopIcon /> : <BatchIcon />}
            >
              {batchTesting ? '測試進行中...' : '執行基礎測試套件'}
            </Button>
          </CardContent>
        </Card>

        {/* 測試結果摘要 */}
        {Object.keys(results).length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                測試結果摘要
              </Typography>
              
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>測試項目</TableCell>
                      <TableCell>狀態</TableCell>
                      <TableCell>執行時間</TableCell>
                      <TableCell>時間戳</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(results).map(([testName, result]) => (
                      <TableRow key={testName}>
                        <TableCell>{testName}</TableCell>
                        <TableCell>
                          <Chip
                            icon={result.success ? <SuccessIcon /> : <ErrorIcon />}
                            label={result.success ? 'Success' : 'Failed'}
                            color={result.success ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{result.duration || 0}ms</TableCell>
                        <TableCell>
                          {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  const tabs = [
    { label: 'Redfish服務發現', icon: <ServiceIcon />, component: <ServiceDiscoveryTests /> },
    { label: '標準Redfish資源', icon: <ResourceIcon />, component: <StandardResourceTests /> },
    { label: 'DMTF冷卻資源', icon: <CoolingIcon />, component: <CoolingResourceTests /> },
    { label: '標準感測器', icon: <SensorsIcon />, component: <StandardSensorTests /> },
    { label: 'CDU感測器管理', icon: <SensorsIcon />, component: <SensorTests /> },
    { label: 'PLC管理', icon: <PLCIcon />, component: <PLCTests /> },
    { label: '警報系統', icon: <AlarmIcon />, component: <AlarmTests /> },
    { label: '管理服務', icon: <ManagementIcon />, component: <ManagementTests /> },
    { label: '事件服務', icon: <EventIcon />, component: <EventServiceTests /> },
    { label: '更新服務', icon: <UpdateIcon />, component: <UpdateServiceTests /> },
    { label: '任務服務', icon: <TaskIcon />, component: <TaskServiceTests /> },
    { label: '系統信息', icon: <SystemIcon />, component: <SystemInfoTests /> },
    { label: '集群管理', icon: <ClusterIcon />, component: <ClusterTests /> },
    { label: '數據可視化', icon: <DashboardIcon />, component: <DataVisualization /> },
    { label: '高級批量測試', icon: <BatchIcon />, component: <AdvancedBatchTests /> },
    { label: '測試分析報告', icon: <AnalyticsIcon />, component: <TestAnalyticsReports /> },
    { label: '性能基準測試', icon: <PerformanceIcon />, component: <PerformanceBenchmarks /> },
    { label: '回歸測試', icon: <RegressionIcon />, component: <RegressionTests /> },
    { label: '測試環境管理', icon: <EnvironmentIcon />, component: <TestEnvironments /> },
    { label: '標準批量測試', icon: <BatchIcon />, component: <BatchTests /> }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        CDU Redfish API 測試工具
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        完整的CDU系統Redfish API測試工具，涵蓋DMTF標準Redfish協議的所有API端點和功能模塊。
        支持標準Redfish服務發現、資源管理、DMTF 2024.4冷卻資源、感測器管理、PLC控制、警報系統、
        管理服務、事件服務、更新服務、任務服務和集群管理的全面測試。
        
        **新增高級功能:** 智能批量測試、測試結果分析報告、API性能基準測試、自動化回歸檢查，
        提供企業級測試管理和持續集成支持。
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              id={`redfish-tab-${index}`}
              aria-controls={`redfish-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      {tabs.map((tab, index) => (
        <TabPanel key={index} value={currentTab} index={index}>
          {tab.component}
        </TabPanel>
      ))}

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>系統要求:</strong> 確保CDU後端服務正常運行於 http://localhost:8001
            <br />
            <strong>基礎測試:</strong> 完整的DMTF Redfish標準API端點，包括80種警報代碼(A001-A080)和48個PLC感測器功能
            <br />
            <strong>高級功能:</strong> 智能批量測試、性能基準測試、回歸檢測、測試結果分析報告
            <br />
            <strong>企業功能:</strong> 持續監控、自動調度、通知系統、歷史趨勢分析
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default RedfishApiTestComponent;