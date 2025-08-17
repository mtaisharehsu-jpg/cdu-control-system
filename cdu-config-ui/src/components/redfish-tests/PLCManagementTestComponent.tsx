/**
 * PLC Management Test Component
 * 
 * Tests PLC management APIs including register read/write operations
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
  TextField,
  Grid
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
  getRedfishPLCs,
  getRedfishPLCDetail,
  getRedfishPLCRegisters,
  writeRedfishPLCRegister,
  writeRedfishPLCRegistersBatch,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

interface PLCWriteParams {
  plcId: string;
  registerAddress: number;
  value: number;
  batchStartAddress: number;
  batchValues: string;
}

const PLCManagementTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [plcWriteParams, setPLCWriteParams] = useState<PLCWriteParams>({
    plcId: 'PLC1',
    registerAddress: 100,
    value: 0,
    batchStartAddress: 100,
    batchValues: '1,2,3,4,5'
  });

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
        PLC管理測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試PLC管理API，包括PLC詳細信息、暫存器讀取和寫入操作。
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
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>警告:</strong> PLC暫存器寫入操作會直接修改PLC設備的暫存器值，請謹慎操作！
            </Typography>
          </Alert>
          
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
                () => writeRedfishPLCRegistersBatch(
                  plcWriteParams.plcId, 
                  plcWriteParams.batchStartAddress, 
                  values
                ));
            }}
            startIcon={<RunIcon />}
          >
            批量寫入暫存器
          </Button>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面測試PLC管理API，包括：
            <br />
            • <strong>PLC詳細信息</strong>: 獲取PLC狀態、配置和連接信息
            <br />
            • <strong>暫存器讀取</strong>: 讀取D和R暫存器數據 (如D100-D199, R100-R199)
            <br />
            • <strong>暫存器寫入</strong>: 單個和批量寫入操作 (請謹慎使用)
            <br />
            • <strong>Modbus TCP</strong>: 通過IP/Ethernet與三菱PLC通信 (預設10.10.40.8:502)
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default PLCManagementTestComponent;