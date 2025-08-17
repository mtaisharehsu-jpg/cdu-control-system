/**
 * Simple API Test Component
 * 
 * A simplified version of the API test component for basic functionality testing.
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
  Paper
} from '@mui/material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

const SimpleApiTest: React.FC = () => {
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
    } catch (error: any) {
      const duration = Date.now() - startTime;
      setTestResult(testName, { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Unknown error', 
        duration 
      });
    } finally {
      setTestLoading(testName, false);
    }
  };

  const testSystemStatus = () => {
    executeTest('systemStatus', async () => {
      const response = await axios.get(`${API_BASE_URL}/Status`, { timeout: 5000 });
      return response.data;
    });
  };

  const testMachineConfigs = () => {
    executeTest('machineConfigs', async () => {
      const response = await axios.get(`${API_BASE_URL}/MachineConfig`, { timeout: 5000 });
      return response.data;
    });
  };

  const testSensors = () => {
    executeTest('sensors', async () => {
      const response = await axios.get(`${API_BASE_URL}/Sensors?sensor_type=temperature`, { timeout: 5000 });
      return response.data;
    });
  };

  const testAlarms = () => {
    executeTest('alarms', async () => {
      const response = await axios.get(`${API_BASE_URL}/IntegratedAlarms`, { timeout: 5000 });
      return response.data;
    });
  };

  const testSwitchMachine = () => {
    executeTest('switchMachine', async () => {
      const response = await axios.post(`${API_BASE_URL}/MachineConfig/Set`, 
        { machine_type: 'cdu_compact' }, 
        { timeout: 5000 }
      );
      return response.data;
    });
  };

  const testOperation = () => {
    executeTest('operation', async () => {
      const response = await axios.post(`${API_BASE_URL}/Operations/Execute`, 
        { operation: 'start' }, 
        { timeout: 5000 }
      );
      return response.data;
    });
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
              <Paper sx={{ p: 2, mt: 1, maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="caption" component="div">
                  響應數據:
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    fontSize: '0.75rem',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {JSON.stringify(result.data, null, 2)}
                </Box>
              </Paper>
            )}
          </Box>
        )}
      </Box>
    );
  };

  const renderSystemOverview = () => {
    const machineResult = results.machineConfigs;
    const statusResult = results.systemStatus;

    if (!machineResult?.success && !statusResult?.success) {
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
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    當前機種
                  </Typography>
                  <Typography variant="body1">
                    {machineResult.data?.current_machine || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            )}
            
            {statusResult?.success && (
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    系統狀態
                  </Typography>
                  <Typography variant="body1">
                    {statusResult.data?.summary?.overall_status || 'N/A'}
                  </Typography>
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
        CDU API 簡易測試工具
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        這個工具可以測試CDU API的基本功能。點擊下方按鈕來測試不同的API端點。
      </Typography>

      {renderSystemOverview()}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                基本API測試
              </Typography>
              
              {renderTestButton('systemStatus', '獲取系統狀態', testSystemStatus)}
              {renderTestButton('machineConfigs', '獲取機種配置', testMachineConfigs)}
              {renderTestButton('sensors', '獲取溫度感測器', testSensors)}
              {renderTestButton('alarms', '獲取異常信息', testAlarms)}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                操作API測試
              </Typography>
              
              {renderTestButton('switchMachine', '切換到緊湊型機種', testSwitchMachine)}
              {renderTestButton('operation', '執行啟動操作', testOperation)}
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

      <Box sx={{ mt: 2 }}>
        <Alert severity="warning">
          <Typography variant="body2">
            <strong>提示:</strong> 由於沒有實際的PLC連接，某些API可能會返回錯誤，這是正常現象。
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default SimpleApiTest;
