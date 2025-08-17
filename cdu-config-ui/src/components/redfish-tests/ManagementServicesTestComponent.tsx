/**
 * Management Services Test Component
 * 
 * Tests Redfish management services and system management APIs
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
  Grid,
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
  getRedfishManagers,
  getRedfishCDUController,
  getRedfishEthernetInterfaces,
  getRedfishNetworkProtocol,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

interface NetworkProtocolSettings {
  IPMI: {
    ProtocolEnabled: boolean;
    Port: number;
  };
  SSH: {
    ProtocolEnabled: boolean;
    Port: number;
  };
  HTTP: {
    ProtocolEnabled: boolean;
    Port: number;
  };
  HTTPS: {
    ProtocolEnabled: boolean;
    Port: number;
  };
  SNMP: {
    ProtocolEnabled: boolean;
    Port: number;
  };
}

const ManagementServicesTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [selectedEthernetInterface, setSelectedEthernetInterface] = useState('eth0');
  const [resetType, setResetType] = useState('GracefulRestart');
  const [networkProtocolSettings, setNetworkProtocolSettings] = useState<NetworkProtocolSettings>({
    IPMI: { ProtocolEnabled: true, Port: 623 },
    SSH: { ProtocolEnabled: true, Port: 22 },
    HTTP: { ProtocolEnabled: true, Port: 80 },
    HTTPS: { ProtocolEnabled: true, Port: 443 },
    SNMP: { ProtocolEnabled: true, Port: 161 }
  });

  const ethernetInterfaces = ['eth0', 'eth1', 'wlan0'];
  const resetTypes = [
    'On', 'ForceOff', 'GracefulShutdown', 'GracefulRestart', 
    'ForceRestart', 'Nmi', 'PowerCycle'
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
        管理服務測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試Redfish管理服務API，包括管理器集合、CDU控制器、網路介面和系統協議設定。
      </Typography>

      {renderTestButton(
        'managersCollection',
        '管理器集合',
        () => executeTest('managersCollection', getRedfishManagers),
        'GET /redfish/v1/Managers - 獲取管理器集合'
      )}

      {renderTestButton(
        'cduManager',
        'CDU管理器詳細信息',
        () => executeTest('cduManager', getRedfishCDUController),
        'GET /redfish/v1/Managers/CDU_Main - CDU控制器詳細信息'
      )}

      {renderTestButton(
        'ethernetInterfaces',
        '網路介面集合',
        () => executeTest('ethernetInterfaces', getRedfishEthernetInterfaces),
        'GET /redfish/v1/Managers/CDU_Main/EthernetInterfaces - 網路介面列表'
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            特定網路介面測試
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            選擇特定網路介面來獲取詳細信息，包括IP配置、MAC地址、連接狀態等。
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>選擇網路介面</InputLabel>
            <Select
              value={selectedEthernetInterface}
              onChange={(e) => setSelectedEthernetInterface(e.target.value)}
            >
              {ethernetInterfaces.map(iface => (
                <MenuItem key={iface} value={iface}>{iface}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => executeTest(`ethernetInterface_${selectedEthernetInterface}`, 
              () => Promise.resolve({ interface: selectedEthernetInterface, message: "以太網接口功能尚未實現" }))}
            startIcon={<RunIcon />}
          >
            測試 GET /redfish/v1/Managers/CDU_Main/EthernetInterfaces/{selectedEthernetInterface}
          </Button>
        </CardContent>
      </Card>

      {renderTestButton(
        'networkProtocol',
        '網路協議設定',
        () => executeTest('networkProtocol', getRedfishNetworkProtocol),
        'GET /redfish/v1/Managers/CDU_Main/NetworkProtocol - 網路協議配置'
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            網路協議設定更新
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            配置系統網路協議，包括IPMI、SSH、HTTP/HTTPS和SNMP服務。
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>警告:</strong> 修改網路協議設定可能會影響系統連接性，請謹慎操作！
            </Typography>
          </Alert>

          {Object.entries(networkProtocolSettings).map(([protocol, settings]) => (
            <Box key={protocol} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>{protocol}</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>啟用狀態</InputLabel>
                    <Select
                      value={settings.ProtocolEnabled.toString()}
                      onChange={(e) => setNetworkProtocolSettings(prev => ({
                        ...prev,
                        [protocol]: {
                          ...prev[protocol as keyof NetworkProtocolSettings],
                          ProtocolEnabled: e.target.value === 'true'
                        }
                      }))}
                    >
                      <MenuItem value="true">啟用</MenuItem>
                      <MenuItem value="false">停用</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="端口"
                    value={settings.Port}
                    onChange={(e) => setNetworkProtocolSettings(prev => ({
                      ...prev,
                      [protocol]: {
                        ...prev[protocol as keyof NetworkProtocolSettings],
                        Port: parseInt(e.target.value)
                      }
                    }))}
                  />
                </Grid>
              </Grid>
            </Box>
          ))}

          <Button
            variant="contained"
            color="warning"
            onClick={() => executeTest('updateNetworkProtocol', 
              () => Promise.resolve({ message: "網路協議更新功能尚未實現", settings: networkProtocolSettings }))}
            startIcon={<RunIcon />}
            sx={{ mr: 2 }}
          >
            更新網路協議設定
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            CDU控制器重置
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            執行CDU控制器重置操作。支援多種重置類型，包括優雅重啟、強制重啟等。
          </Typography>
          
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>危險操作:</strong> 控制器重置會中斷所有連接和服務，請謹慎使用！
            </Typography>
          </Alert>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>重置類型</InputLabel>
            <Select
              value={resetType}
              onChange={(e) => setResetType(e.target.value)}
            >
              {resetTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="error"
            onClick={() => executeTest('resetController', 
              () => Promise.resolve({ message: `控制器重置功能尚未實現`, resetType: resetType }))}
            startIcon={<RunIcon />}
          >
            執行控制器重置 ({resetType})
          </Button>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面測試Redfish管理服務API，包括：
            <br />
            • <strong>管理器集合</strong>: Managers集合和CDU控制器信息
            <br />
            • <strong>網路介面</strong>: Ethernet介面配置和狀態 (eth0/eth1/wlan0)
            <br />
            • <strong>網路協議</strong>: IPMI/SSH/HTTP/HTTPS/SNMP協議設定
            <br />
            • <strong>系統控制</strong>: 控制器重置和電源管理操作
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default ManagementServicesTestComponent;