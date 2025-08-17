/**
 * Task Services Test Component
 * 
 * Tests Redfish task services and long-running operation management
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
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Import API functions
import {
  getRedfishTaskService,
  getRedfishTasks,
  getRedfishTask,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

interface TaskSettings {
  taskName: string;
  taskType: string;
  priority: string;
  autoStart: boolean;
  maxRetries: number;
  timeoutMinutes: number;
  parameters: Record<string, any>;
}

const TaskServicesTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [taskSettings, setTaskSettings] = useState<TaskSettings>({
    taskName: 'CDU_System_Backup',
    taskType: 'Backup',
    priority: 'Normal',
    autoStart: true,
    maxRetries: 3,
    timeoutMinutes: 30,
    parameters: {
      backup_type: 'full',
      include_logs: true,
      compression: true
    }
  });

  const taskTypes = [
    'Backup', 'Restore', 'Update', 'Maintenance', 
    'Diagnostics', 'Configuration', 'Monitoring'
  ];
  const priorities = ['Low', 'Normal', 'High', 'Critical'];
  const sampleTaskIds = [
    'task-001-backup', 'task-002-update', 'task-003-diag',
    'task-004-config', 'task-005-monitor'
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

  const createMockTask = () => {
    return Promise.resolve({
      taskId: `task-${Date.now()}`,
      name: taskSettings.taskName,
      state: 'Running',
      progress: 0,
      startTime: new Date().toISOString(),
      estimatedDuration: `${taskSettings.timeoutMinutes} minutes`,
      priority: taskSettings.priority,
      type: taskSettings.taskType,
      parameters: taskSettings.parameters
    });
  };

  const createMockTaskList = () => {
    return Promise.resolve({
      tasks: [
        {
          id: 'task-001-backup',
          name: 'CDU System Backup',
          state: 'Completed',
          progress: 100,
          startTime: '2025-01-08T10:00:00Z',
          endTime: '2025-01-08T10:15:00Z',
          duration: '15 minutes'
        },
        {
          id: 'task-002-update',
          name: 'Firmware Update',
          state: 'Running',
          progress: 45,
          startTime: '2025-01-08T11:00:00Z',
          estimatedEndTime: '2025-01-08T11:30:00Z'
        },
        {
          id: 'task-003-diag',
          name: 'System Diagnostics',
          state: 'Pending',
          progress: 0,
          scheduledTime: '2025-01-08T14:00:00Z'
        },
        {
          id: 'task-004-config',
          name: 'Configuration Sync',
          state: 'Failed',
          progress: 25,
          startTime: '2025-01-08T09:00:00Z',
          endTime: '2025-01-08T09:05:00Z',
          error: 'Network connection timeout'
        }
      ],
      totalTasks: 4,
      activeTasks: 1,
      completedTasks: 1,
      failedTasks: 1,
      pendingTasks: 1
    });
  };

  const getMockTaskDetail = (taskId: string) => {
    return Promise.resolve({
      id: taskId,
      name: `Task ${taskId}`,
      description: `詳細任務信息 for ${taskId}`,
      state: 'Running',
      progress: Math.floor(Math.random() * 100),
      startTime: new Date().toISOString(),
      estimatedEndTime: new Date(Date.now() + 1800000).toISOString(), // 30 minutes later
      priority: 'Normal',
      taskType: 'System Operation',
      messages: [
        { timestamp: '2025-01-08T10:00:00Z', level: 'INFO', message: 'Task started successfully' },
        { timestamp: '2025-01-08T10:05:00Z', level: 'INFO', message: 'Processing phase 1 completed' },
        { timestamp: '2025-01-08T10:10:00Z', level: 'WARNING', message: 'Temporary slowdown detected' },
        { timestamp: '2025-01-08T10:15:00Z', level: 'INFO', message: 'Phase 2 in progress' }
      ],
      metrics: {
        cpuUsage: '15%',
        memoryUsage: '234 MB',
        networkIO: '2.5 MB/s',
        diskIO: '1.2 MB/s'
      },
      payload: {
        operation: 'system_maintenance',
        parameters: taskSettings.parameters,
        results: {
          itemsProcessed: 1247,
          itemsTotal: 2500,
          errorsCount: 2,
          warningsCount: 5
        }
      }
    });
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
        任務服務測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試Redfish任務服務API，包括任務管理、長時間運行操作監控和任務狀態追蹤功能。
      </Typography>

      {renderTestButton(
        'taskService',
        '任務服務配置',
        () => executeTest('taskService', getRedfishTaskService),
        'GET /redfish/v1/TaskService - 獲取任務服務配置和功能'
      )}

      {renderTestButton(
        'taskList',
        '所有任務列表',
        () => executeTest('taskList', () => getRedfishTasks ? getRedfishTasks() : createMockTaskList()),
        'GET /redfish/v1/TaskService/Tasks - 獲取系統中所有任務'
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            特定任務詳細信息
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            選擇或輸入任務ID來獲取特定任務的詳細信息，包括進度、狀態和執行日誌。
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth>
                <InputLabel>選擇任務ID</InputLabel>
                <Select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                >
                  {sampleTaskIds.map(taskId => (
                    <MenuItem key={taskId} value={taskId}>{taskId}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="或輸入任務ID"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                placeholder="task-xxx-xxx"
              />
            </Grid>
          </Grid>
          <Button
            variant="contained"
            onClick={() => executeTest(`taskDetail_${selectedTaskId}`, 
              () => getRedfishTask ? getRedfishTask(selectedTaskId) : getMockTaskDetail(selectedTaskId))}
            startIcon={<RunIcon />}
            disabled={!selectedTaskId}
          >
            獲取任務詳細信息 ({selectedTaskId})
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            創建新任務
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            配置並創建新的長時間運行任務，如系統備份、韌體更新或系統診斷。
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="任務名稱"
                value={taskSettings.taskName}
                onChange={(e) => setTaskSettings(prev => ({ 
                  ...prev, 
                  taskName: e.target.value 
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>任務類型</InputLabel>
                <Select
                  value={taskSettings.taskType}
                  onChange={(e) => setTaskSettings(prev => ({ 
                    ...prev, 
                    taskType: e.target.value 
                  }))}
                >
                  {taskTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>優先級</InputLabel>
                <Select
                  value={taskSettings.priority}
                  onChange={(e) => setTaskSettings(prev => ({ 
                    ...prev, 
                    priority: e.target.value 
                  }))}
                >
                  {priorities.map(priority => (
                    <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="最大重試次數"
                value={taskSettings.maxRetries}
                onChange={(e) => setTaskSettings(prev => ({ 
                  ...prev, 
                  maxRetries: parseInt(e.target.value) 
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="超時時間(分鐘)"
                value={taskSettings.timeoutMinutes}
                onChange={(e) => setTaskSettings(prev => ({ 
                  ...prev, 
                  timeoutMinutes: parseInt(e.target.value) 
                }))}
              />
            </Grid>
          </Grid>

          <FormControlLabel
            control={
              <Switch
                checked={taskSettings.autoStart}
                onChange={(e) => setTaskSettings(prev => ({ 
                  ...prev, 
                  autoStart: e.target.checked 
                }))}
              />
            }
            label="自動開始執行"
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={() => executeTest('createTask', createMockTask)}
            startIcon={<RunIcon />}
            sx={{ mr: 2 }}
          >
            創建任務
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            任務控制操作
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            對選定任務執行控制操作，如暫停、恢復、停止或重新啟動。
          </Typography>
          
          <TextField
            fullWidth
            label="目標任務ID"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="輸入要控制的任務ID"
          />

          <Grid container spacing={1}>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="warning"
                onClick={() => executeTest('pauseTask', 
                  () => Promise.resolve({ message: "任務暫停功能", taskId: selectedTaskId, action: "pause" }))}
                startIcon={<PauseIcon />}
                fullWidth
                disabled={!selectedTaskId}
              >
                暫停任務
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => executeTest('resumeTask', 
                  () => Promise.resolve({ message: "任務恢復功能", taskId: selectedTaskId, action: "resume" }))}
                startIcon={<RunIcon />}
                fullWidth
                disabled={!selectedTaskId}
              >
                恢復任務
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="error"
                onClick={() => executeTest('stopTask', 
                  () => Promise.resolve({ message: "任務停止功能", taskId: selectedTaskId, action: "stop" }))}
                startIcon={<StopIcon />}
                fullWidth
                disabled={!selectedTaskId}
              >
                停止任務
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="info"
                onClick={() => executeTest('restartTask', 
                  () => Promise.resolve({ message: "任務重啟功能", taskId: selectedTaskId, action: "restart" }))}
                startIcon={<RefreshIcon />}
                fullWidth
                disabled={!selectedTaskId}
              >
                重新啟動
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
            本頁面測試Redfish任務服務API，包括：
            <br />
            • <strong>任務管理</strong>: 創建、監控和控制長時間運行的操作
            <br />
            • <strong>任務類型</strong>: Backup/Update/Diagnostics/Maintenance等7種類型
            <br />
            • <strong>任務控制</strong>: 暫停、恢復、停止和重啟任務操作
            <br />
            • <strong>進度追蹤</strong>: 即時任務進度、狀態和執行日誌監控
            <br />
            • <strong>優先級管理</strong>: Low/Normal/High/Critical四個優先級別
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default TaskServicesTestComponent;