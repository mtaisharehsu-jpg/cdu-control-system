/**
 * Alarm System Test Component
 * 
 * Tests alarm system APIs including 80 alarm codes (A001-A080) and alarm management
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
  getRedfishCDUAlarmRegisters,
  getRedfishActiveAlarms,
  acknowledgeRedfishAlarm,
  getRedfishAlarmStatistics,
  getRedfishAlarmHistory,
  updateRedfishSNMPSettings,
  testRedfishSNMPConnection,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

interface SNMPSettings {
  destination_ip: string;
  port: number;
  community: string;
  version: string;
}

const AlarmSystemTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [snmpSettings, setSNMPSettings] = useState<SNMPSettings>({
    destination_ip: '192.168.1.100',
    port: 162,
    community: 'public',
    version: 'v2c'
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
        警報系統測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試警報系統API，包括80種警報代碼(A001-A080)和警報管理功能。
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
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            配置SNMP Trap目標，用於將CDU警報發送到網管系統。支持SNMPv1/v2c協議。
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

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Community String"
                value={snmpSettings.community}
                onChange={(e) => setSNMPSettings(prev => ({ 
                  ...prev, 
                  community: e.target.value 
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SNMP版本"
                value={snmpSettings.version}
                onChange={(e) => setSNMPSettings(prev => ({ 
                  ...prev, 
                  version: e.target.value 
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

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面測試CDU警報系統API，包括：
            <br />
            • <strong>80種警報代碼</strong>: A001-A080 完整警報代碼覆蓋
            <br />
            • <strong>警報暫存器</strong>: PLC R10001-R10005 警報狀態暫存器
            <br />
            • <strong>警報管理</strong>: 活躍警報列表、統計信息、歷史記錄
            <br />
            • <strong>SNMP Trap</strong>: 網管系統整合和警報轉發功能
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default AlarmSystemTestComponent;