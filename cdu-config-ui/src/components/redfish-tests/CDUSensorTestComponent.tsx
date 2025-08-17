/**
 * CDU Sensor Test Component
 * 
 * Tests CDU-specific sensor management APIs
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

// Import API functions
import {
  getRedfishSensors,
  getRedfishSensorReadings,
  getRedfishSensorDetail,
  getRedfishFunctionBlocksConfig,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

const CDUSensorTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [selectedSensorId, setSelectedSensorId] = useState('PLC1-Temp1');
  
  const sensorIds = [
    'Temp1', 'Temp2', 'Temp3',
    'Press1', 'Press2',
    'PLC1-Temp1', 'PLC1-Temp2', 'PLC1-Temp3', 'PLC1-Temp4',
    'PLC1-Press1', 'PLC1-Press2', 'PLC1-Press3',
    'PLC1-Flow1', 'PLC1-Flow2'
  ];

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
                startIcon={<RunIcon />}
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CDU感測器管理測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試CDU特定的感測器管理API，包括溫度、壓力、流量感測器的詳細測試。
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
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            選擇特定感測器ID來獲取詳細信息，包括Modbus RTU感測器(Temp1-3, Press1-2)和PLC感測器(PLC1-*)。
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

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面測試CDU特定的感測器管理API，包括：
            <br />
            • <strong>Modbus RTU感測器</strong>: Temp1-3 (溫度), Press1-2 (壓力)
            <br />
            • <strong>PLC感測器</strong>: PLC1-Temp1~4 (溫度), PLC1-Press1~3 (壓力), PLC1-Flow1~2 (流量)
            <br />
            • <strong>功能區塊</strong>: 動態配置管理和即時數據讀取
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default CDUSensorTestComponent;