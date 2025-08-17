/**
 * System Info Test Component
 * 
 * Tests system information and basic Redfish service endpoints
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
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Computer as SystemIcon,
  NetworkCheck as NetworkIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

// Import API functions
import {
  getRedfishServiceRoot,
  getRedfishServiceVersion,
  getRedfishODataService,
  getRedfishMetadata,
  getRedfishSystems,
  getRedfishCDUSystem,
  getRedfishSystemActions,
  getRedfishApiTest,
  getRedfishHealthCheck,
  getRedfishSystemStatus,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

interface SystemHealthMetrics {
  overall: 'Healthy' | 'Warning' | 'Critical';
  cpu: number;
  memory: number;
  disk: number;
  network: 'Connected' | 'Disconnected' | 'Limited';
  temperature: number;
  uptime: string;
}

const SystemInfoTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

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

  const getMockSystemHealthMetrics = (): Promise<SystemHealthMetrics> => {
    return Promise.resolve({
      overall: 'Healthy',
      cpu: 23.5,
      memory: 67.2,
      disk: 45.8,
      network: 'Connected',
      temperature: 42.3,
      uptime: '7 days, 14:32:15'
    });
  };

  const getMockSystemInfo = () => {
    return Promise.resolve({
      manufacturer: 'CDU Systems',
      model: 'CDU-Pro-2024',
      serialNumber: 'CDU2024001',
      firmwareVersion: 'v2.1.0',
      bootTime: '2025-01-01T10:00:00Z',
      systemType: 'Physical',
      processorSummary: {
        count: 4,
        model: 'ARM Cortex-A78',
        status: 'Enabled'
      },
      memorySummary: {
        totalSystemMemoryGiB: 8,
        status: 'Enabled'
      },
      storageSummary: {
        totalSystemStorageGiB: 64,
        status: 'Enabled'
      },
      networkInterfaces: [
        { name: 'eth0', status: 'LinkUp', ipAddress: '192.168.1.100' },
        { name: 'eth1', status: 'LinkDown', ipAddress: null },
        { name: 'wlan0', status: 'LinkUp', ipAddress: '192.168.1.101' }
      ],
      powerState: 'On',
      indicatorLED: 'Off',
      systemHealth: 'OK'
    });
  };

  const renderTestButton = (
    testName: string, 
    label: string, 
    testFn: () => void,
    description?: string,
    icon?: React.ReactNode
  ) => {
    const isLoading = loading[testName];
    const result = results[testName];
    const isExpanded = expandedResults[testName];

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              {icon}
              <Box>
                <Typography variant="h6">{label}</Typography>
                {description && (
                  <Typography variant="body2" color="textSecondary">
                    {description}
                  </Typography>
                )}
              </Box>
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
        系統信息測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試Redfish系統信息API，包括服務根節點、系統狀態、健康檢查和基本連接測試。
      </Typography>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        🔧 基礎服務端點測試
      </Typography>

      {renderTestButton(
        'serviceRoot',
        'Redfish服務根節點',
        () => executeTest('serviceRoot', getRedfishServiceRoot),
        'GET /redfish/v1/ - Redfish服務入口點',
        <InfoIcon color="primary" />
      )}

      {renderTestButton(
        'serviceVersion',
        'Redfish服務版本',
        () => executeTest('serviceVersion', getRedfishServiceVersion),
        'GET /redfish/v1/ServiceVersion - 服務版本信息',
        <InfoIcon color="primary" />
      )}

      {renderTestButton(
        'oDataService',
        'OData服務文檔',
        () => executeTest('oDataService', getRedfishODataService),
        'GET /redfish/v1/odata - OData服務描述文檔',
        <InfoIcon color="primary" />
      )}

      {renderTestButton(
        'metadata',
        'Redfish元數據',
        () => executeTest('metadata', getRedfishMetadata),
        'GET /redfish/v1/$metadata - Redfish CSDL元數據',
        <InfoIcon color="primary" />
      )}

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        🖥️ 系統信息測試
      </Typography>

      {renderTestButton(
        'systems',
        '系統集合',
        () => executeTest('systems', getRedfishSystems),
        'GET /redfish/v1/Systems - 計算系統集合',
        <SystemIcon color="primary" />
      )}

      {renderTestButton(
        'cduSystem',
        'CDU系統詳細信息',
        () => executeTest('cduSystem', getRedfishCDUSystem),
        'GET /redfish/v1/Systems/CDU1 - CDU系統詳細資料',
        <SystemIcon color="primary" />
      )}

      {renderTestButton(
        'systemActions',
        '系統操作列表',
        () => executeTest('systemActions', getRedfishSystemActions),
        'GET /redfish/v1/Systems/CDU1/Actions - 支援的系統操作',
        <SystemIcon color="primary" />
      )}

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        🏥 健康檢查和狀態監控
      </Typography>

      {renderTestButton(
        'apiTest',
        'API連接測試',
        () => executeTest('apiTest', getRedfishApiTest),
        'GET /api/v1/test - 基本API連接測試',
        <NetworkIcon color="success" />
      )}

      {renderTestButton(
        'healthCheck',
        '系統健康檢查',
        () => executeTest('healthCheck', getRedfishHealthCheck),
        '全面系統健康狀態檢查',
        <SecurityIcon color="success" />
      )}

      {renderTestButton(
        'systemStatus',
        '系統狀態詳情',
        () => executeTest('systemStatus', getRedfishSystemStatus),
        '詳細系統運行狀態和指標',
        <PerformanceIcon color="success" />
      )}

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        📊 系統性能指標
      </Typography>

      {renderTestButton(
        'systemMetrics',
        '系統性能指標',
        () => executeTest('systemMetrics', getMockSystemHealthMetrics),
        '系統資源使用情況和性能數據',
        <PerformanceIcon color="info" />
      )}

      {renderTestButton(
        'systemInfo',
        '完整系統資訊',
        () => executeTest('systemInfo', getMockSystemInfo),
        '包含硬體、網路、存儲的完整系統信息',
        <StorageIcon color="info" />
      )}

      <Box sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 測試項目說明
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <InfoIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="基礎服務測試" 
                  secondary="驗證Redfish服務根節點、版本信息、OData和元數據端點"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <SystemIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="系統信息測試" 
                  secondary="獲取CDU系統配置、硬體資訊和支援的操作列表"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <NetworkIcon color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="連接和健康檢查" 
                  secondary="測試API連接性、系統健康狀態和運行狀態監控"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <PerformanceIcon color="info" />
                </ListItemIcon>
                <ListItemText 
                  primary="性能和資源監控" 
                  secondary="監控CPU、記憶體、磁碟使用率和系統溫度等關鍵指標"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面測試Redfish系統信息API，包括：
            <br />
            • <strong>基礎服務</strong>: ServiceRoot/Version/OData/Metadata等核心端點
            <br />
            • <strong>系統資訊</strong>: CDU硬體配置、處理器、記憶體、存儲摘要
            <br />
            • <strong>健康監控</strong>: API連接測試、系統健康檢查、運行狀態
            <br />
            • <strong>性能指標</strong>: CPU/記憶體/磁碟使用率、溫度、運行時間監控
            <br />
            • <strong>網路狀態</strong>: 以太網和無線網路介面連接狀態
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default SystemInfoTestComponent;