/**
 * API Test Component
 * 
 * This component provides a simple interface to test CDU API functionality.
 * Useful for development and debugging.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  getMachineConfigs,
  getSystemStatus,
  getSensors,
  getIntegratedAlarms,
  setCurrentMachine,
  executeOperation,
  writeValue,
  formatApiError,
  runAllTests,
  type MachineConfigResponse,
  type SystemStatus,
  type SensorsResponse,
  type IntegratedAlarmsResponse
} from '../api';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

const ApiTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const setTestLoading = (testName: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [testName]: isLoading }));
  };

  const setTestResult = (testName: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [testName]: result }));
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

  const testMachineConfigs = () => {
    executeTest('machineConfigs', getMachineConfigs);
  };

  const testSystemStatus = () => {
    executeTest('systemStatus', getSystemStatus);
  };

  const testSensors = () => {
    executeTest('sensors', () => getSensors('temperature'));
  };

  const testAlarms = () => {
    executeTest('alarms', getIntegratedAlarms);
  };

  const testSwitchMachine = () => {
    executeTest('switchMachine', () => setCurrentMachine('cdu_compact'));
  };

  const testOperation = () => {
    executeTest('operation', () => executeOperation({ operation: 'start' }));
  };

  const testWriteValue = () => {
    executeTest('writeValue', () => writeValue({ parameter: 'temp_setting', value: 25.0 }));
  };

  const runFullTest = () => {
    executeTest('fullTest', runAllTests);
  };

  const renderTestButton = (testName: string, label: string, testFn: () => void) => {
    const isLoading = loading[testName];
    const result = results[testName];

    return (
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={testFn}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
          color={result?.success ? 'success' : result?.error ? 'error' : 'primary'}
          fullWidth
        >
          {label}
        </Button>
        
        {result && (
          <Box sx={{ mt: 1 }}>
            <Alert 
              severity={result.success ? 'success' : 'error'}
              sx={{ mb: 1 }}
            >
              <Typography variant="body2">
                {result.success ? '✅ 測試成功' : `❌ 測試失敗: ${result.error}`}
              </Typography>
              {result.duration && (
                <Typography variant="caption">
                  執行時間: {result.duration}ms
                </Typography>
              )}
            </Alert>
            
            {result.success && result.data && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">查看響應數據</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',
                      backgroundColor: '#f5f5f5',
                      padding: 1,
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 300
                    }}
                  >
                    {JSON.stringify(result.data, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}
      </Box>
    );
  };

  const renderSystemOverview = () => {
    const machineResult = results.machineConfigs;
    const statusResult = results.systemStatus;
    const sensorResult = results.sensors;
    const alarmResult = results.alarms;

    if (!machineResult?.success && !statusResult?.success && !sensorResult?.success && !alarmResult?.success) {
      return null;
    }

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            系統概覽
          </Typography>
          
          <Grid container spacing={2}>
            {machineResult?.success && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    當前機種
                  </Typography>
                  <Chip
                    label={(machineResult.data as MachineConfigResponse).current_machine}
                    color="primary"
                    size="small"
                  />
                </Box>
              </Grid>
            )}

            {statusResult?.success && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    系統狀態
                  </Typography>
                  <Chip
                    label={(statusResult.data as SystemStatus).summary.overall_status}
                    color={(statusResult.data as SystemStatus).summary.running ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </Grid>
            )}
            
            {sensorResult?.success && (
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    感測器狀態
                  </Typography>
                  <Typography variant="body2">
                    {(sensorResult.data as SensorsResponse).sensor_summary.active_sensors}/
                    {(sensorResult.data as SensorsResponse).sensor_summary.total_sensors} 正常
                  </Typography>
                </Box>
              </Grid>
            )}
            
            {alarmResult?.success && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    系統健康評分
                  </Typography>
                  <Chip 
                    label={`${(alarmResult.data as IntegratedAlarmsResponse).system_health_score}%`}
                    color={
                      (alarmResult.data as IntegratedAlarmsResponse).system_health_score > 80 
                        ? 'success' 
                        : (alarmResult.data as IntegratedAlarmsResponse).system_health_score > 60 
                        ? 'warning' 
                        : 'error'
                    }
                    size="small"
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CDU API 測試工具
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        這個工具可以測試CDU API的各種功能。點擊下方按鈕來測試不同的API端點。
      </Typography>

      {renderSystemOverview()}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                基本API測試
              </Typography>

              {renderTestButton('machineConfigs', '獲取機種配置', testMachineConfigs)}
              {renderTestButton('systemStatus', '獲取系統狀態', testSystemStatus)}
              {renderTestButton('sensors', '獲取溫度感測器', testSensors)}
              {renderTestButton('alarms', '獲取異常信息', testAlarms)}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                操作API測試
              </Typography>
              
              {renderTestButton('switchMachine', '切換到緊湊型機種', testSwitchMachine)}
              {renderTestButton('operation', '執行啟動操作', testOperation)}
              {renderTestButton('writeValue', '設定溫度值', testWriteValue)}
              {renderTestButton('fullTest', '運行完整測試套件', runFullTest)}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default ApiTestComponent;
