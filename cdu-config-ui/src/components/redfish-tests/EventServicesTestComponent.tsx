/**
 * Event Services Test Component
 * 
 * Tests Redfish event services and logging systems
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
  Switch,
  FormControlLabel
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
  getRedfishEventService,
  getRedfishEventSubscriptions,
  getRedfishLogServices,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

interface EventSubscriptionSettings {
  Destination: string;
  EventTypes: string[];
  HttpHeaders: Record<string, string>;
  Protocol: string;
  SubscriptionType: string;
  EventFormatType: string;
  Context: string;
}

const EventServicesTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [selectedLogService, setSelectedLogService] = useState('System');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [eventSubscriptionSettings, setEventSubscriptionSettings] = useState<EventSubscriptionSettings>({
    Destination: 'http://192.168.1.100:8080/events',
    EventTypes: ['Alert', 'StatusChange', 'ResourceAdded', 'ResourceRemoved'],
    HttpHeaders: {
      'Authorization': 'Bearer token123',
      'Content-Type': 'application/json'
    },
    Protocol: 'Redfish',
    SubscriptionType: 'RedfishEvent',
    EventFormatType: 'Event',
    Context: 'CDU_Event_Context'
  });

  const logServices = ['System', 'Security', 'Application', 'CDU'];
  const eventTypes = [
    'StatusChange', 'ResourceUpdated', 'ResourceAdded', 'ResourceRemoved',
    'Alert', 'MetricReport', 'Other'
  ];
  const protocols = ['Redfish'];
  const eventFormatTypes = ['Event', 'MetricReport'];

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

  const handleEventTypeChange = (eventType: string, checked: boolean) => {
    setEventSubscriptionSettings(prev => ({
      ...prev,
      EventTypes: checked 
        ? [...prev.EventTypes, eventType]
        : prev.EventTypes.filter(type => type !== eventType)
    }));
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
        事件服務測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試Redfish事件服務API，包括事件訂閱、日誌服務和事件記錄管理功能。
      </Typography>

      {renderTestButton(
        'eventService',
        '事件服務配置',
        () => executeTest('eventService', getRedfishEventService),
        'GET /redfish/v1/EventService - 獲取事件服務配置'
      )}

      {renderTestButton(
        'eventSubscriptions',
        '事件訂閱列表',
        () => executeTest('eventSubscriptions', getRedfishEventSubscriptions),
        'GET /redfish/v1/EventService/Subscriptions - 獲取事件訂閱列表'
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            創建事件訂閱
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            配置事件訂閱設定，當CDU系統發生特定事件時會自動推送通知。
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="目標URL"
                value={eventSubscriptionSettings.Destination}
                onChange={(e) => setEventSubscriptionSettings(prev => ({ 
                  ...prev, 
                  Destination: e.target.value 
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="上下文標識"
                value={eventSubscriptionSettings.Context}
                onChange={(e) => setEventSubscriptionSettings(prev => ({ 
                  ...prev, 
                  Context: e.target.value 
                }))}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>協議類型</InputLabel>
                <Select
                  value={eventSubscriptionSettings.Protocol}
                  onChange={(e) => setEventSubscriptionSettings(prev => ({ 
                    ...prev, 
                    Protocol: e.target.value 
                  }))}
                >
                  {protocols.map(protocol => (
                    <MenuItem key={protocol} value={protocol}>{protocol}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>事件格式類型</InputLabel>
                <Select
                  value={eventSubscriptionSettings.EventFormatType}
                  onChange={(e) => setEventSubscriptionSettings(prev => ({ 
                    ...prev, 
                    EventFormatType: e.target.value 
                  }))}
                >
                  {eventFormatTypes.map(format => (
                    <MenuItem key={format} value={format}>{format}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            事件類型選擇
          </Typography>
          <Box sx={{ mb: 2 }}>
            {eventTypes.map(eventType => (
              <FormControlLabel
                key={eventType}
                control={
                  <Switch
                    checked={eventSubscriptionSettings.EventTypes.includes(eventType)}
                    onChange={(e) => handleEventTypeChange(eventType, e.target.checked)}
                  />
                }
                label={eventType}
              />
            ))}
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={() => executeTest('createSubscription', 
              () => Promise.resolve({ message: "事件訂閱創建功能尚未實現", settings: eventSubscriptionSettings }))}
            startIcon={<RunIcon />}
            sx={{ mr: 2 }}
          >
            創建事件訂閱
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            刪除事件訂閱
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            輸入訂閱ID來刪除特定的事件訂閱。
          </Typography>
          
          <TextField
            fullWidth
            label="訂閱ID"
            value={subscriptionId}
            onChange={(e) => setSubscriptionId(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            color="error"
            onClick={() => executeTest('deleteSubscription', 
              () => Promise.resolve({ message: "事件訂閱刪除功能尚未實現", subscriptionId: subscriptionId }))}
            startIcon={<RunIcon />}
            disabled={!subscriptionId}
          >
            刪除事件訂閱
          </Button>
        </CardContent>
      </Card>

      {renderTestButton(
        'logService',
        '日誌服務配置',
        () => executeTest('logService', getRedfishLogServices),
        'GET /redfish/v1/Systems/CDU1/LogServices - 獲取日誌服務配置'
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            特定日誌服務測試
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            選擇特定日誌服務來獲取日誌條目和執行日誌管理操作。
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>選擇日誌服務</InputLabel>
            <Select
              value={selectedLogService}
              onChange={(e) => setSelectedLogService(e.target.value)}
            >
              {logServices.map(service => (
                <MenuItem key={service} value={service}>{service}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                onClick={() => executeTest(`logEntries_${selectedLogService}`, 
                  () => Promise.resolve({ message: "日誌條目獲取功能尚未實現", service: selectedLogService }))}
                startIcon={<RunIcon />}
                fullWidth
              >
                獲取日誌條目
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                color="warning"
                onClick={() => executeTest(`clearLogs_${selectedLogService}`, 
                  () => Promise.resolve({ message: "日誌清除功能尚未實現", service: selectedLogService }))}
                startIcon={<RunIcon />}
                fullWidth
              >
                清除日誌條目
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {renderTestButton(
        'systemEventLog',
        '系統事件日誌',
        () => executeTest('systemEventLog', () => Promise.resolve({ message: "系統事件日誌功能尚未實現" })),
        'GET /redfish/v1/Systems/CDU1/LogServices/EventLog/Entries - 系統事件日誌'
      )}

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面測試Redfish事件服務API，包括：
            <br />
            • <strong>事件服務</strong>: EventService配置和事件訂閱管理
            <br />
            • <strong>事件訂閱</strong>: 創建、查看和刪除事件訂閱 (HTTP推送通知)
            <br />
            • <strong>日誌服務</strong>: System/Security/Application/CDU日誌管理
            <br />
            • <strong>事件類型</strong>: Alert/StatusChange/ResourceAdded等7種事件類型
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default EventServicesTestComponent;