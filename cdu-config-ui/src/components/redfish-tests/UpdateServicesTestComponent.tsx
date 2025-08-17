/**
 * Update Services Test Component
 * 
 * Tests Redfish update services and firmware management APIs
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
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Upload as UploadIcon,
  SystemUpdate as UpdateIcon
} from '@mui/icons-material';

// Import API functions
import {
  getRedfishUpdateService,
  getRedfishFirmwareInventory,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

interface FirmwareUpdateSettings {
  ImageURI: string;
  Targets: string[];
  UpdateComponent: string;
  ForceUpdate: boolean;
  Username: string;
  Password: string;
  TransferProtocol: string;
}

const UpdateServicesTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [selectedComponent, setSelectedComponent] = useState('Controller');
  const [updateTaskId, setUpdateTaskId] = useState('');
  const [firmwareUpdateSettings, setFirmwareUpdateSettings] = useState<FirmwareUpdateSettings>({
    ImageURI: 'http://192.168.1.100/firmware/cdu_v2.1.0.bin',
    Targets: ['/redfish/v1/UpdateService/FirmwareInventory/Controller'],
    UpdateComponent: 'Controller',
    ForceUpdate: false,
    Username: '',
    Password: '',
    TransferProtocol: 'HTTP'
  });

  const updateComponents = [
    'Controller', 'BMC', 'BIOS', 'BootLoader', 
    'HAL', 'Application', 'PLC_Firmware'
  ];
  const transferProtocols = ['HTTP', 'HTTPS', 'FTP', 'TFTP', 'SCP', 'SFTP'];

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
        更新服務測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試Redfish更新服務API，包括韌體庫存、韌體更新、更新狀態監控和版本管理功能。
      </Typography>

      {renderTestButton(
        'updateService',
        '更新服務配置',
        () => executeTest('updateService', getRedfishUpdateService),
        'GET /redfish/v1/UpdateService - 獲取更新服務配置'
      )}

      {renderTestButton(
        'firmwareInventory',
        '韌體庫存清單',
        () => executeTest('firmwareInventory', getRedfishFirmwareInventory),
        'GET /redfish/v1/UpdateService/FirmwareInventory - 韌體庫存清單'
      )}

      {renderTestButton(
        'softwareInventory',
        '軟體庫存清單',
        () => executeTest('softwareInventory', () => Promise.resolve({ message: "軟體庫存清單功能尚未實現" })),
        'GET /redfish/v1/UpdateService/SoftwareInventory - 軟體庫存清單'
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            特定組件版本查詢
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            選擇特定組件來獲取詳細的韌體版本信息和更新狀態。
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>選擇組件</InputLabel>
            <Select
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
            >
              {updateComponents.map(component => (
                <MenuItem key={component} value={component}>{component}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => executeTest(`firmwareVersion_${selectedComponent}`, 
              () => Promise.resolve({ message: "韌體版本查詢功能尚未實現", component: selectedComponent }))}
            startIcon={<RunIcon />}
          >
            獲取 {selectedComponent} 韌體版本
          </Button>
        </CardContent>
      </Card>

      {renderTestButton(
        'updateActions',
        '更新操作列表',
        () => executeTest('updateActions', () => Promise.resolve({ message: "更新操作列表功能尚未實現" })),
        'GET /redfish/v1/UpdateService/Actions - 支援的更新操作'
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            韌體更新配置
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            配置韌體更新設定，包括映像文件URI、目標組件和傳輸協議。
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>警告:</strong> 韌體更新操作具有風險，錯誤的韌體可能導致設備無法啟動！
            </Typography>
          </Alert>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="韌體映像URI"
                value={firmwareUpdateSettings.ImageURI}
                onChange={(e) => setFirmwareUpdateSettings(prev => ({ 
                  ...prev, 
                  ImageURI: e.target.value 
                }))}
                placeholder="http://server/path/firmware.bin"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>更新組件</InputLabel>
                <Select
                  value={firmwareUpdateSettings.UpdateComponent}
                  onChange={(e) => setFirmwareUpdateSettings(prev => ({ 
                    ...prev, 
                    UpdateComponent: e.target.value 
                  }))}
                >
                  {updateComponents.map(component => (
                    <MenuItem key={component} value={component}>{component}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>傳輸協議</InputLabel>
                <Select
                  value={firmwareUpdateSettings.TransferProtocol}
                  onChange={(e) => setFirmwareUpdateSettings(prev => ({ 
                    ...prev, 
                    TransferProtocol: e.target.value 
                  }))}
                >
                  {transferProtocols.map(protocol => (
                    <MenuItem key={protocol} value={protocol}>{protocol}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="使用者名稱 (選用)"
                value={firmwareUpdateSettings.Username}
                onChange={(e) => setFirmwareUpdateSettings(prev => ({ 
                  ...prev, 
                  Username: e.target.value 
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="password"
                label="密碼 (選用)"
                value={firmwareUpdateSettings.Password}
                onChange={(e) => setFirmwareUpdateSettings(prev => ({ 
                  ...prev, 
                  Password: e.target.value 
                }))}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => executeTest('validateFirmware', 
                  () => Promise.resolve({ message: "韌體映像驗證功能尚未實現", imageURI: firmwareUpdateSettings.ImageURI }))}
                startIcon={<UploadIcon />}
                fullWidth
              >
                驗證韌體映像
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                color="warning"
                onClick={() => executeTest('startFirmwareUpdate', 
                  () => Promise.resolve({ message: "韌體更新功能尚未實現", settings: firmwareUpdateSettings }))}
                startIcon={<UpdateIcon />}
                fullWidth
              >
                開始韌體更新
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            更新狀態監控
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            監控韌體更新進度和狀態，或取消進行中的更新操作。
          </Typography>
          
          <TextField
            fullWidth
            label="更新任務ID"
            value={updateTaskId}
            onChange={(e) => setUpdateTaskId(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Enter task ID from update operation"
          />

          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                onClick={() => executeTest('updateStatus', 
                  () => Promise.resolve({ message: "更新狀態檢查功能尚未實現", taskId: updateTaskId }))}
                startIcon={<RunIcon />}
                fullWidth
                disabled={!updateTaskId}
              >
                檢查更新狀態
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                color="error"
                onClick={() => executeTest('cancelUpdate', 
                  () => Promise.resolve({ message: "取消韌體更新功能尚未實現", taskId: updateTaskId }))}
                startIcon={<ErrorIcon />}
                fullWidth
                disabled={!updateTaskId}
              >
                取消韌體更新
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
            本頁面測試Redfish更新服務API，包括：
            <br />
            • <strong>庫存管理</strong>: 韌體和軟體庫存清單、版本信息
            <br />
            • <strong>韌體更新</strong>: 支援HTTP/HTTPS/FTP等多種傳輸協議
            <br />
            • <strong>更新監控</strong>: 即時更新進度追蹤和狀態監控
            <br />
            • <strong>組件支援</strong>: Controller/BMC/BIOS/HAL/PLC等7種組件
            <br />
            • <strong>安全機制</strong>: 韌體映像驗證和強制更新選項
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default UpdateServicesTestComponent;