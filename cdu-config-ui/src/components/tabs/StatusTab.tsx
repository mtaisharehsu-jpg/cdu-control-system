import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  Thermostat as ThermostatIcon,
  Speed as SpeedIcon,
  WaterDrop as WaterDropIcon,
  Power as PowerIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import ModbusDataViewer from '../ModbusDataViewer';
import { mockMachineConfigs } from '../../api/simpleApi';
import { useMachineConfig } from '../../contexts/MachineConfigContext';

// 系統狀態類型定義
interface SystemStatus {
  overall: 'normal' | 'warning' | 'error';
  timestamp: string;
}

interface SensorReading {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'error';
  min?: number;
  max?: number;
}

interface DeviceStatus {
  id: string;
  name: string;
  status: 'ok' | 'error' | 'running';
  details?: string;
}

const StatusTab: React.FC = () => {
  const { selectedMachineType, selectedMachineConfig, getSensorDataFromConfig, realSensorReadings } = useMachineConfig();
  
  // 調試信息
  console.log('🖥️ StatusTab render - realSensorReadings:', realSensorReadings);
  console.log('🖥️ StatusTab render - selectedMachineConfig:', selectedMachineConfig);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [apiTestResult, setApiTestResult] = useState<string>('未測試');
  
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    overall: 'normal',
    timestamp: new Date().toISOString()
  });

  const [temperatureSensors, setTemperatureSensors] = useState<SensorReading[]>([
    { id: 'temp_server_from', name: 'From Server', value: 25.5, unit: '°C', status: 'normal' },
    { id: 'temp_server_to', name: 'To Server', value: 28.2, unit: '°C', status: 'normal' },
    { id: 'temp_facility_from', name: 'From Facility', value: 22.1, unit: '°C', status: 'normal' },
    { id: 'temp_facility_to', name: 'To Facility', value: 24.8, unit: '°C', status: 'normal' }
  ]);

  const [pressureSensors, setPressureSensors] = useState<SensorReading[]>([
    { id: 'press_server_in', name: 'Server In', value: 0.25, unit: 'MPa', status: 'normal' },
    { id: 'press_server_out', name: 'Server Out', value: 0.18, unit: 'MPa', status: 'normal' },
    { id: 'press_facility_in', name: 'Facility In', value: 0.22, unit: 'MPa', status: 'normal' },
    { id: 'press_facility_out', name: 'Facility Out', value: 0.15, unit: 'MPa', status: 'normal' }
  ]);

  const [flowSensors, setFlowSensors] = useState<SensorReading[]>([
    { id: 'flow_server', name: 'Server Flow', value: 45.2, unit: 'LPM', status: 'normal' },
    { id: 'flow_facility', name: 'Facility Flow', value: 48.6, unit: 'LPM', status: 'normal' }
  ]);

  const [pumpStatus, setPumpStatus] = useState<SensorReading[]>([
    { id: 'pump_left_rpm', name: 'Left Pump RPM', value: 1200, unit: 'RPM', status: 'normal' },
    { id: 'pump_right_rpm', name: 'Right Pump RPM', value: 1180, unit: 'RPM', status: 'normal' }
  ]);

  const [valveStatus, setValveStatus] = useState<SensorReading[]>([
    { id: 'hex_valve', name: 'HEX Valve', value: 65, unit: '%', status: 'normal' },
    { id: 'bypass_valve', name: 'Bypass Valve', value: 35, unit: '%', status: 'normal' }
  ]);

  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus[]>([
    { id: 'power_left', name: 'Power Left', status: 'ok' },
    { id: 'power_right', name: 'Power Right', status: 'ok' },
    { id: 'pump_left', name: 'Pump Left', status: 'running' },
    { id: 'pump_right', name: 'Pump Right', status: 'running' },
    { id: 'valve_system', name: 'Valve System', status: 'ok' },
    { id: 'control_left', name: 'Control Unit Left', status: 'running' },
    { id: 'control_right', name: 'Control Unit Right', status: 'running' },
    { id: 'sensor_module', name: 'Sensor Module', status: 'ok' },
    { id: 'leak_detection', name: 'Leak Detection', status: 'ok' }
  ]);

  // 來自機種定義的配置感測器數據
  const [configuredSensors, setConfiguredSensors] = useState<any[]>([]);

  // 載入配置感測器數據
  useEffect(() => {
    if (selectedMachineConfig) {
      console.log('🔄 StatusTab: Loading configured sensors...');
      const sensors = getSensorDataFromConfig();
      console.log('📊 StatusTab: Configured sensors received:', sensors);
      setConfiguredSensors(sensors);
      
      // 更新壓力感測器卡片數據為真實API數據
      const pressureSensorsFromAPI = sensors
        .filter(sensor => sensor.category === 'pressure')
        .map(sensor => ({
          id: sensor.id,
          name: sensor.name,
          value: sensor.value,
          unit: sensor.unit,
          status: sensor.status === 'normal' ? 'normal' as const : 
                 sensor.status === 'error' ? 'error' as const : 'warning' as const
        }));
      
      console.log('🔄 Updating pressure sensors with API data:', pressureSensorsFromAPI);
      // 無論是否有數據都更新，清除之前的模擬數據
      setPressureSensors(pressureSensorsFromAPI.length > 0 ? pressureSensorsFromAPI : []);
      
      // 同樣更新溫度感測器
      const temperatureSensorsFromAPI = sensors
        .filter(sensor => sensor.category === 'temperature')
        .map(sensor => ({
          id: sensor.id,
          name: sensor.name,
          value: sensor.value,
          unit: sensor.unit,
          status: sensor.status === 'normal' ? 'normal' as const : 
                 sensor.status === 'error' ? 'error' as const : 'warning' as const
        }));
      
      console.log('🔄 Updating temperature sensors with API data:', temperatureSensorsFromAPI);
      // 無論是否有數據都更新，清除之前的模擬數據
      setTemperatureSensors(temperatureSensorsFromAPI.length > 0 ? temperatureSensorsFromAPI : []);
      
      // 更新流量感測器
      const flowSensorsFromAPI = sensors
        .filter(sensor => sensor.category === 'flow')
        .map(sensor => ({
          id: sensor.id,
          name: sensor.name,
          value: sensor.value,
          unit: sensor.unit,
          status: sensor.status === 'normal' ? 'normal' as const : 
                 sensor.status === 'error' ? 'error' as const : 'warning' as const
        }));
      
      console.log('🔄 Updating flow sensors with API data:', flowSensorsFromAPI);
      // 無論是否有數據都更新，清除之前的模擬數據
      setFlowSensors(flowSensorsFromAPI.length > 0 ? flowSensorsFromAPI : []);
    }
  }, [selectedMachineConfig, getSensorDataFromConfig, realSensorReadings]); // 加入 realSensorReadings 依賴

  // 模擬即時數據更新 - 僅針對沒有真實API數據的感測器
  useEffect(() => {
    const interval = setInterval(() => {
      // 更新時間戳
      setSystemStatus(prev => ({
        ...prev,
        timestamp: new Date().toISOString()
      }));

      // 只有在沒有配置感測器時才模擬數據變化
      if (!selectedMachineConfig || configuredSensors.length === 0) {
        // 模擬感測器數據變化
        setTemperatureSensors(prev => prev.map(sensor => ({
          ...sensor,
          value: sensor.value + (Math.random() - 0.5) * 0.2
        })));

        setPressureSensors(prev => prev.map(sensor => ({
          ...sensor,
          value: sensor.value + (Math.random() - 0.5) * 0.01
        })));

        setFlowSensors(prev => prev.map(sensor => ({
          ...sensor,
          value: sensor.value + (Math.random() - 0.5) * 1.0
        })));
      }

      setPumpStatus(prev => prev.map(sensor => ({
        ...sensor,
        value: sensor.value + (Math.random() - 0.5) * 10
      })));
    }, 1000); // 每秒更新

    return () => clearInterval(interval);
  }, [selectedMachineConfig, configuredSensors]);

  // 手動測試API連接
  const testAPI = async () => {
    try {
      console.log('🧪 Manual API test started');
      setApiTestResult('測試中...');
      setDebugInfo('開始測試...');
      
      // 測試基本連接
      console.log('🔗 Testing http://localhost:8001/api/v1/test');
      const testResponse = await fetch('http://localhost:8001/api/v1/test');
      if (!testResponse.ok) {
        throw new Error(`Test API failed: ${testResponse.status} ${testResponse.statusText}`);
      }
      const testData = await testResponse.json();
      console.log('✅ Basic API response:', testData);
      
      setDebugInfo(`基本API測試通過: ${JSON.stringify(testData)}\n\n`);
      
      // 測試感測器數據
      console.log('📊 Testing http://localhost:8001/api/v1/sensors/readings');
      const sensorResponse = await fetch('http://localhost:8001/api/v1/sensors/readings');
      if (!sensorResponse.ok) {
        throw new Error(`Sensor API failed: ${sensorResponse.status} ${sensorResponse.statusText}`);
      }
      
      const sensorData = await sensorResponse.json();
      console.log('📈 Sensor data received:', sensorData);
      
      setApiTestResult(`✅ API正常，感測器數量: ${sensorData.length}`);
      setDebugInfo(prev => prev + `感測器數據:\n${JSON.stringify(sensorData, null, 2)}`);
      
      // 檢查是否有真實的HAL數據
      const hasRealValues = sensorData.some(sensor => sensor.value > 0 && sensor.health === 'OK');
      if (hasRealValues) {
        console.log('🎉 Found real HAL data!');
        setApiTestResult(prev => prev + ' | 檢測到真實HAL數據 🎉');
      } else {
        console.log('⚠️ No real HAL data detected');
        setApiTestResult(prev => prev + ' | 未檢測到真實HAL數據 ⚠️');
      }
      
    } catch (error) {
      setApiTestResult(`❌ API錯誤: ${error.message}`);
      setDebugInfo(`Error: ${error.message}\nStack: ${error.stack}`);
      console.error('❌ API測試失敗:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
      case 'ok':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
      case 'ok':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'running':
        return <PowerIcon color="info" />;
      default:
        return <CheckCircleIcon />;
    }
  };

  const SensorCard: React.FC<{ 
    title: string; 
    sensors: SensorReading[]; 
    icon: React.ReactNode;
  }> = ({ title, sensors, icon }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          {icon}
          <Typography variant="h6" ml={1}>
            {title}
          </Typography>
        </Box>
        {sensors.map(sensor => (
          <Box key={sensor.id} mb={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">{sensor.name}</Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="body2" mr={1}>
                  {sensor.value.toFixed(1)} {sensor.unit}
                </Typography>
                <Chip
                  size="small"
                  color={getStatusColor(sensor.status) as any}
                  label={sensor.status.toUpperCase()}
                />
              </Box>
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" gutterBottom>
          系統狀態監控
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={testAPI}
          size="large"
        >
          🧪 測試API連接
        </Button>
      </Box>
      
      {/* API測試結果顯示 */}
      {apiTestResult && (
        <Card sx={{ mb: 2, bgcolor: 'info.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>API測試結果</Typography>
            <Typography variant="body2">{apiTestResult}</Typography>
            {debugInfo && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {debugInfo}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 系統整體狀態 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              {getStatusIcon(systemStatus.overall)}
              <Typography variant="h6" ml={1}>
                系統整體狀態
              </Typography>
            </Box>
            <Box>
              <Chip
                color={getStatusColor(systemStatus.overall) as any}
                label={systemStatus.overall.toUpperCase()}
                size="large"
              />
              <Typography variant="caption" ml={2}>
                最後更新: {new Date(systemStatus.timestamp).toLocaleString()}
              </Typography>
            </Box>
          </Box>
          
          {/* 新增HAL連接狀態 */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" gutterBottom>
              HAL數據來源狀態
            </Typography>
            <Box display="flex" flexDirection="column" alignItems="flex-start">
              <Box display="flex" alignItems="center" mb={1}>
                <Chip
                  size="small"
                  color={realSensorReadings.length > 0 ? 'success' : 'warning'}
                  label={realSensorReadings.length > 0 ? '真實HAL數據' : '模擬數據'}
                  sx={{ mr: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {realSensorReadings.length > 0 
                    ? `已連接 ${realSensorReadings.length} 個感測器` 
                    : '無HAL連接，使用模擬數據'
                  }
                </Typography>
              </Box>
              
              {/* 調試信息和測試按鈕 */}
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  API端點: http://localhost:8001/api/v1/sensors/readings
                </Typography>
                <br />
                <Box display="flex" alignItems="center" mt={1} mb={1}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={testAPI}
                    sx={{ mr: 2 }}
                  >
                    測試API連接
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {apiTestResult}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  真實感測器數據: {JSON.stringify(realSensorReadings).slice(0, 200)}
                </Typography>
                {debugInfo && (
                  <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                    <Typography variant="caption" component="pre" style={{ fontSize: '10px' }}>
                      {debugInfo}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 感測器讀數 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <SensorCard
            title="溫度感測器"
            sensors={temperatureSensors}
            icon={<ThermostatIcon color="primary" />}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SensorCard
            title="壓力感測器"
            sensors={pressureSensors}
            icon={<SpeedIcon color="primary" />}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SensorCard
            title="流量感測器"
            sensors={flowSensors}
            icon={<WaterDropIcon color="primary" />}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SensorCard
            title="泵浦轉速"
            sensors={pumpStatus}
            icon={<PowerIcon color="primary" />}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SensorCard
            title="閥門開度"
            sensors={valveStatus}
            icon={<SpeedIcon color="primary" />}
          />
        </Grid>
      </Grid>

      {/* 機種定義配置感測器 */}
      {selectedMachineType && configuredSensors.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <SettingsIcon color="primary" />
              <Typography variant="h6" ml={1}>
                機種定義感測器數據 ({selectedMachineType})
              </Typography>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>感測器名稱</TableCell>
                    <TableCell>描述</TableCell>
                    <TableCell>數值</TableCell>
                    <TableCell>單位</TableCell>
                    <TableCell>配置來源</TableCell>
                    <TableCell>類別</TableCell>
                    <TableCell>狀態</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configuredSensors.map(sensor => {
                    // 檢查是否有對應的真實數據
                    // 對於分散式區塊，我們需要檢查配置中的 block_id
                    const hasRealData = realSensorReadings.some(reading => {
                      const sensorKey = sensor.id.replace(/^(temp_|press_|flow_|io_)/, '');
                      const sensorConfig = Object.values(selectedMachineConfig?.sensor_config || {})
                        .flatMap(category => Object.entries(category.sensors || {}))
                        .find(([key]) => key === sensorKey)?.[1];
                      
                      if (sensorConfig?.config_source === 'distributed_block' && sensorConfig.distributed_block) {
                        return reading.block_id === sensorConfig.distributed_block.block_id;
                      }
                      return reading.block_id === sensorKey;
                    });
                    
                    return (
                      <TableRow key={sensor.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2" fontWeight="medium">
                              {sensor.name}
                            </Typography>
                            {hasRealData && (
                              <Chip
                                size="small"
                                label="HAL"
                                color="success"
                                variant="outlined"
                                sx={{ ml: 1, fontSize: '0.7rem', height: '20px' }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {sensor.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            fontWeight="bold"
                            color={hasRealData ? 'primary.main' : 'text.primary'}
                          >
                            {sensor.value.toFixed(sensor.category === 'temperature' ? 1 : 
                              sensor.category === 'pressure' ? 2 : 
                              sensor.category === 'flow' ? 1 : 0)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {sensor.unit}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={sensor.config_source}
                            color={sensor.config_source === 'modbus_rtu' ? 'primary' : 
                                  sensor.config_source === 'distributed_block' ? 'secondary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={sensor.category}
                            variant="outlined"
                            color="info"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            {getStatusIcon(sensor.status)}
                            <Chip
                              size="small"
                              color={getStatusColor(sensor.status) as any}
                              label={sensor.status.toUpperCase()}
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Modbus RTU 數據監控 */}
      <Box sx={{ mb: 3 }}>
        <ModbusDataViewer 
          sensorConfig={mockMachineConfigs.machine_configs.cdu_compact.sensor_config}
          autoRefresh={true}
          refreshInterval={3000}
        />
      </Box>

      {/* 設備狀態 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            設備狀態
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>設備名稱</TableCell>
                  <TableCell>狀態</TableCell>
                  <TableCell>詳情</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deviceStatus.map(device => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getStatusIcon(device.status)}
                        <Typography ml={1}>{device.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        color={getStatusColor(device.status) as any}
                        label={device.status.toUpperCase()}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {device.details || '正常運行'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StatusTab;