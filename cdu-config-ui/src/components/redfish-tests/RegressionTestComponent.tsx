/**
 * Regression Test Component
 * 
 * Automated regression testing system with continuous monitoring,
 * version comparison, and intelligent test scheduling
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  BugReport as RegressionIcon,
  PlayArrow as RunIcon,
  Stop as StopIcon,
  Schedule as ScheduleIcon,
  Timeline as TrendIcon,
  Warning as WarningIcon,
  CheckCircle as PassIcon,
  Error as FailIcon,
  Compare as CompareIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Assessment as ReportIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as ImprovementIcon,
  TrendingDown as DegradationIcon,
  Pause as PauseIcon,
  NotificationImportant as AlertIcon,
  Storage as DataIcon
} from '@mui/icons-material';

// Import API functions and components
import {
  runRedfishTestSuite,
  getRedfishHealthCheck,
  getRedfishSystemStatus,
  formatApiError
} from '../../api/cduApi';

interface RegressionConfig {
  baselineVersion: string;
  testSchedule: 'manual' | 'hourly' | 'daily' | 'weekly';
  enableContinuousMonitoring: boolean;
  regressionThresholds: {
    responseTimeDegradation: number; // percentage
    successRateDrop: number; // percentage
    errorRateIncrease: number; // percentage
  };
  testCategories: string[];
  notificationSettings: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    webhookUrl?: string;
  };
  retentionDays: number;
}

interface TestSnapshot {
  id: string;
  version: string;
  timestamp: string;
  results: Record<string, any>;
  metrics: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
  environment: {
    apiVersion?: string;
    systemVersion?: string;
    buildNumber?: string;
  };
}

interface RegressionResult {
  id: string;
  baselineSnapshot: TestSnapshot;
  currentSnapshot: TestSnapshot;
  timestamp: string;
  regressions: {
    testName: string;
    type: 'functionality' | 'performance' | 'reliability';
    severity: 'critical' | 'major' | 'minor';
    description: string;
    baselineValue: number;
    currentValue: number;
    changePercentage: number;
  }[];
  improvements: {
    testName: string;
    type: 'performance' | 'reliability';
    description: string;
    improvementPercentage: number;
  }[];
  summary: {
    totalRegressions: number;
    criticalRegressions: number;
    totalImprovements: number;
    overallStatus: 'pass' | 'warning' | 'fail';
  };
}

const DEFAULT_CONFIG: RegressionConfig = {
  baselineVersion: '1.0.0',
  testSchedule: 'manual',
  enableContinuousMonitoring: false,
  regressionThresholds: {
    responseTimeDegradation: 20, // 20% slower is a regression
    successRateDrop: 5, // 5% drop in success rate
    errorRateIncrease: 3 // 3% increase in error rate
  },
  testCategories: [
    'serviceDiscovery',
    'standardResources',
    'coolingResources',
    'sensorManagement',
    'plcManagement',
    'alarmSystem'
  ],
  notificationSettings: {
    emailEnabled: false,
    slackEnabled: false
  },
  retentionDays: 30
};

const RegressionTestComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState<RegressionConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [snapshots, setSnapshots] = useState<TestSnapshot[]>([]);
  const [regressionResults, setRegressionResults] = useState<RegressionResult[]>([]);
  const [baselineSnapshot, setBaselineSnapshot] = useState<TestSnapshot | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Create test snapshot
  const createSnapshot = useCallback(async (version: string): Promise<TestSnapshot> => {
    const testResults = await runRedfishTestSuite();
    const healthData = await getRedfishHealthCheck();
    const systemData = await getRedfishSystemStatus();
    
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter((r: any) => r.success).length;
    const failedTests = totalTests - passedTests;
    const responseTimes = Object.values(testResults).map((r: any) => r.duration || 0).filter(d => d > 0);
    const averageResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const errorRate = totalTests > 0 ? (failedTests / totalTests) * 100 : 0;

    const snapshot: TestSnapshot = {
      id: `snapshot_${Date.now()}`,
      version,
      timestamp: new Date().toISOString(),
      results: testResults,
      metrics: {
        totalTests,
        passedTests,
        failedTests,
        averageResponseTime,
        successRate,
        errorRate
      },
      environment: {
        apiVersion: healthData?.api_version || 'unknown',
        systemVersion: systemData?.system_version || 'unknown',
        buildNumber: systemData?.build_number || 'unknown'
      }
    };

    return snapshot;
  }, []);

  // Compare snapshots and detect regressions
  const detectRegressions = useCallback((baseline: TestSnapshot, current: TestSnapshot): RegressionResult => {
    const regressions: RegressionResult['regressions'] = [];
    const improvements: RegressionResult['improvements'] = [];

    // Compare overall metrics
    const responseTimeDiff = ((current.metrics.averageResponseTime - baseline.metrics.averageResponseTime) / baseline.metrics.averageResponseTime) * 100;
    const successRateDiff = current.metrics.successRate - baseline.metrics.successRate;
    const errorRateDiff = current.metrics.errorRate - baseline.metrics.errorRate;

    // Performance regressions
    if (responseTimeDiff > config.regressionThresholds.responseTimeDegradation) {
      regressions.push({
        testName: 'Overall Response Time',
        type: 'performance',
        severity: responseTimeDiff > 50 ? 'critical' : responseTimeDiff > 30 ? 'major' : 'minor',
        description: `平均響應時間增加了 ${responseTimeDiff.toFixed(1)}%`,
        baselineValue: baseline.metrics.averageResponseTime,
        currentValue: current.metrics.averageResponseTime,
        changePercentage: responseTimeDiff
      });
    } else if (responseTimeDiff < -10) {
      improvements.push({
        testName: 'Overall Response Time',
        type: 'performance',
        description: `響應時間改善了 ${Math.abs(responseTimeDiff).toFixed(1)}%`,
        improvementPercentage: Math.abs(responseTimeDiff)
      });
    }

    // Reliability regressions
    if (Math.abs(successRateDiff) > config.regressionThresholds.successRateDrop && successRateDiff < 0) {
      regressions.push({
        testName: 'Overall Success Rate',
        type: 'reliability',
        severity: Math.abs(successRateDiff) > 10 ? 'critical' : 'major',
        description: `成功率下降了 ${Math.abs(successRateDiff).toFixed(1)}%`,
        baselineValue: baseline.metrics.successRate,
        currentValue: current.metrics.successRate,
        changePercentage: successRateDiff
      });
    }

    if (errorRateDiff > config.regressionThresholds.errorRateIncrease) {
      regressions.push({
        testName: 'Overall Error Rate',
        type: 'reliability',
        severity: errorRateDiff > 10 ? 'critical' : errorRateDiff > 5 ? 'major' : 'minor',
        description: `錯誤率增加了 ${errorRateDiff.toFixed(1)}%`,
        baselineValue: baseline.metrics.errorRate,
        currentValue: current.metrics.errorRate,
        changePercentage: errorRateDiff
      });
    }

    // Compare individual test results
    Object.entries(baseline.results).forEach(([testName, baselineResult]: [string, any]) => {
      const currentResult = current.results[testName];
      if (!currentResult) {
        regressions.push({
          testName,
          type: 'functionality',
          severity: 'major',
          description: '測試項目在當前版本中缺失',
          baselineValue: 1,
          currentValue: 0,
          changePercentage: -100
        });
        return;
      }

      // Functionality regression: passed test now fails
      if (baselineResult.success && !currentResult.success) {
        regressions.push({
          testName,
          type: 'functionality',
          severity: 'critical',
          description: '原本通過的測試現在失敗了',
          baselineValue: 1,
          currentValue: 0,
          changePercentage: -100
        });
      }

      // Performance regression: significant response time increase
      if (baselineResult.duration && currentResult.duration) {
        const timeDiff = ((currentResult.duration - baselineResult.duration) / baselineResult.duration) * 100;
        if (timeDiff > config.regressionThresholds.responseTimeDegradation) {
          regressions.push({
            testName,
            type: 'performance',
            severity: timeDiff > 100 ? 'critical' : timeDiff > 50 ? 'major' : 'minor',
            description: `響應時間增加了 ${timeDiff.toFixed(1)}%`,
            baselineValue: baselineResult.duration,
            currentValue: currentResult.duration,
            changePercentage: timeDiff
          });
        }
      }
    });

    const criticalRegressions = regressions.filter(r => r.severity === 'critical').length;
    const majorRegressions = regressions.filter(r => r.severity === 'major').length;
    
    let overallStatus: 'pass' | 'warning' | 'fail' = 'pass';
    if (criticalRegressions > 0) {
      overallStatus = 'fail';
    } else if (majorRegressions > 0 || regressions.length > 3) {
      overallStatus = 'warning';
    }

    return {
      id: `regression_${Date.now()}`,
      baselineSnapshot: baseline,
      currentSnapshot: current,
      timestamp: new Date().toISOString(),
      regressions,
      improvements,
      summary: {
        totalRegressions: regressions.length,
        criticalRegressions,
        totalImprovements: improvements.length,
        overallStatus
      }
    };
  }, [config]);

  // Run regression test
  const runRegressionTest = useCallback(async (version?: string) => {
    if (!baselineSnapshot) {
      alert('請先設置基準版本快照');
      return;
    }

    setIsRunning(true);
    setCurrentProgress(0);
    setCurrentStep(0);

    try {
      // Step 1: Create current snapshot
      setCurrentStep(1);
      setCurrentProgress(25);
      const currentSnapshot = await createSnapshot(version || 'current');
      
      // Step 2: Add to snapshots
      setCurrentStep(2);
      setCurrentProgress(50);
      setSnapshots(prev => [currentSnapshot, ...prev].slice(0, 50)); // Keep last 50 snapshots
      
      // Step 3: Detect regressions
      setCurrentStep(3);
      setCurrentProgress(75);
      const regressionResult = detectRegressions(baselineSnapshot, currentSnapshot);
      
      // Step 4: Save results
      setCurrentStep(4);
      setCurrentProgress(100);
      setRegressionResults(prev => [regressionResult, ...prev].slice(0, 20)); // Keep last 20 results
      
      // Send notifications if needed
      if (regressionResult.summary.overallStatus === 'fail' && config.notificationSettings.webhookUrl) {
        sendRegressionNotification(regressionResult);
      }

    } catch (error) {
      console.error('Regression test failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentProgress(0);
      setCurrentStep(0);
    }
  }, [baselineSnapshot, createSnapshot, detectRegressions, config]);

  // Send regression notification
  const sendRegressionNotification = async (result: RegressionResult) => {
    if (!config.notificationSettings.webhookUrl) return;

    const notification = {
      text: `🚨 回歸測試警告 - 發現 ${result.summary.totalRegressions} 個回歸問題`,
      attachments: [
        {
          color: result.summary.overallStatus === 'fail' ? '#ff0000' : '#ffaa00',
          fields: [
            {
              title: '關鍵回歸',
              value: result.summary.criticalRegressions,
              short: true
            },
            {
              title: '總回歸數',
              value: result.summary.totalRegressions,
              short: true
            },
            {
              title: '改善項目',
              value: result.summary.totalImprovements,
              short: true
            }
          ]
        }
      ]
    };

    try {
      await fetch(config.notificationSettings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  // Setup baseline
  const setupBaseline = useCallback(async (version: string) => {
    setIsRunning(true);
    try {
      const snapshot = await createSnapshot(version);
      setBaselineSnapshot(snapshot);
      setSnapshots(prev => [snapshot, ...prev]);
    } catch (error) {
      console.error('Failed to create baseline:', error);
    } finally {
      setIsRunning(false);
    }
  }, [createSnapshot]);

  // Configuration dialog
  const ConfigurationDialog = () => (
    <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          <Typography variant="h6">回歸測試配置</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="基準版本"
              value={config.baselineVersion}
              onChange={(e) => setConfig(prev => ({ ...prev, baselineVersion: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>測試調度</InputLabel>
              <Select
                value={config.testSchedule}
                onChange={(e) => setConfig(prev => ({ ...prev, testSchedule: e.target.value as any }))}
              >
                <MenuItem value="manual">手動</MenuItem>
                <MenuItem value="hourly">每小時</MenuItem>
                <MenuItem value="daily">每日</MenuItem>
                <MenuItem value="weekly">每週</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="響應時間退化閾值 (%)"
              value={config.regressionThresholds.responseTimeDegradation}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                regressionThresholds: {
                  ...prev.regressionThresholds,
                  responseTimeDegradation: parseFloat(e.target.value)
                }
              }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="成功率下降閾值 (%)"
              value={config.regressionThresholds.successRateDrop}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                regressionThresholds: {
                  ...prev.regressionThresholds,
                  successRateDrop: parseFloat(e.target.value)
                }
              }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="錯誤率增加閾值 (%)"
              value={config.regressionThresholds.errorRateIncrease}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                regressionThresholds: {
                  ...prev.regressionThresholds,
                  errorRateIncrease: parseFloat(e.target.value)
                }
              }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Webhook URL (通知)"
              value={config.notificationSettings.webhookUrl || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                notificationSettings: {
                  ...prev.notificationSettings,
                  webhookUrl: e.target.value
                }
              }))}
              placeholder="https://hooks.slack.com/services/..."
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enableContinuousMonitoring}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    enableContinuousMonitoring: e.target.checked 
                  }))}
                />
              }
              label="啟用持續監控"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfigDialogOpen(false)}>取消</Button>
        <Button 
          variant="contained" 
          onClick={() => setConfigDialogOpen(false)}
        >
          保存配置
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Test execution panel with stepper
  const TestExecutionPanel = () => (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                回歸測試執行
              </Typography>
              <Typography variant="body2" color="textSecondary">
                自動化回歸檢測，比較當前版本與基準版本的差異
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => setConfigDialogOpen(true)}
              startIcon={<SettingsIcon />}
            >
              配置
            </Button>
          </Box>

          {!baselineSnapshot ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                請先設置基準版本快照才能執行回歸測試
              </Typography>
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                基準版本: {baselineSnapshot.version} 
                ({new Date(baselineSnapshot.timestamp).toLocaleString()})
              </Typography>
            </Alert>
          )}

          {isRunning && (
            <Box sx={{ mb: 2 }}>
              <Stepper activeStep={currentStep} orientation="horizontal">
                {['準備', '創建快照', '保存數據', '檢測回歸', '生成報告'].map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              <LinearProgress variant="determinate" value={currentProgress} sx={{ mt: 2 }} />
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="基準版本號"
                placeholder="例: v1.0.0"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const version = (e.target as HTMLInputElement).value;
                    if (version) setupBaseline(version);
                  }
                }}
              />
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="例: v1.0.0"]') as HTMLInputElement;
                  const version = input?.value || config.baselineVersion;
                  setupBaseline(version);
                }}
                disabled={isRunning}
                sx={{ mt: 1 }}
                startIcon={<DataIcon />}
              >
                設置基準版本
              </Button>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="當前版本號"
                placeholder="例: v1.1.0"
              />
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="例: v1.1.0"]') as HTMLInputElement;
                  const version = input?.value || 'current';
                  runRegressionTest(version);
                }}
                disabled={isRunning || !baselineSnapshot}
                sx={{ mt: 1 }}
                startIcon={isRunning ? <CircularProgress size={16} /> : <RegressionIcon />}
              >
                {isRunning ? '執行中...' : '執行回歸測試'}
              </Button>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ height: '56px', display: 'flex', alignItems: 'center', mb: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={monitoringEnabled}
                      onChange={(e) => setMonitoringEnabled(e.target.checked)}
                    />
                  }
                  label="持續監控"
                />
              </Box>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSnapshots([]);
                  setRegressionResults([]);
                  setBaselineSnapshot(null);
                }}
                startIcon={<RefreshIcon />}
              >
                重置所有數據
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {regressionResults.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {snapshots.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  測試快照
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {regressionResults[0]?.summary.totalRegressions || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  最近回歸
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {regressionResults[0]?.summary.criticalRegressions || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  關鍵問題
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {regressionResults[0]?.summary.totalImprovements || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  改善項目
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  // Regression results panel
  const RegressionResultsPanel = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        回歸測試結果
      </Typography>
      
      {regressionResults.length > 0 ? (
        regressionResults.map((result, index) => (
          <Accordion key={result.id} defaultExpanded={index === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Chip
                  icon={
                    result.summary.overallStatus === 'pass' ? <PassIcon /> :
                    result.summary.overallStatus === 'warning' ? <WarningIcon /> :
                    <FailIcon />
                  }
                  label={result.summary.overallStatus.toUpperCase()}
                  color={
                    result.summary.overallStatus === 'pass' ? 'success' :
                    result.summary.overallStatus === 'warning' ? 'warning' :
                    'error'
                  }
                  size="small"
                />
                <Typography variant="body1" fontWeight="medium">
                  {result.baselineSnapshot.version} → {result.currentSnapshot.version}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ ml: 'auto' }}>
                  {new Date(result.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {/* Regressions */}
                {result.regressions.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" color="error" gutterBottom>
                      🚨 發現回歸 ({result.regressions.length})
                    </Typography>
                    <List dense>
                      {result.regressions.map((regression, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon>
                            <Chip
                              label={regression.severity}
                              color={
                                regression.severity === 'critical' ? 'error' :
                                regression.severity === 'major' ? 'warning' : 'default'
                              }
                              size="small"
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={regression.testName}
                            secondary={`${regression.description} (${regression.type})`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}

                {/* Improvements */}
                {result.improvements.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" color="success.main" gutterBottom>
                      ✅ 發現改善 ({result.improvements.length})
                    </Typography>
                    <List dense>
                      {result.improvements.map((improvement, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon>
                            <ImprovementIcon color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary={improvement.testName}
                            secondary={improvement.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
              </Grid>

              {/* Metrics Comparison */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  指標比較
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>指標</TableCell>
                        <TableCell align="right">基準值</TableCell>
                        <TableCell align="right">當前值</TableCell>
                        <TableCell align="right">變化</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>平均響應時間 (ms)</TableCell>
                        <TableCell align="right">{result.baselineSnapshot.metrics.averageResponseTime.toFixed(0)}</TableCell>
                        <TableCell align="right">{result.currentSnapshot.metrics.averageResponseTime.toFixed(0)}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            {result.currentSnapshot.metrics.averageResponseTime > result.baselineSnapshot.metrics.averageResponseTime ? 
                              <DegradationIcon color="error" /> : 
                              <ImprovementIcon color="success" />
                            }
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {(((result.currentSnapshot.metrics.averageResponseTime - result.baselineSnapshot.metrics.averageResponseTime) / result.baselineSnapshot.metrics.averageResponseTime) * 100).toFixed(1)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>成功率 (%)</TableCell>
                        <TableCell align="right">{result.baselineSnapshot.metrics.successRate.toFixed(1)}</TableCell>
                        <TableCell align="right">{result.currentSnapshot.metrics.successRate.toFixed(1)}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            {result.currentSnapshot.metrics.successRate < result.baselineSnapshot.metrics.successRate ? 
                              <DegradationIcon color="error" /> : 
                              <ImprovementIcon color="success" />
                            }
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {(result.currentSnapshot.metrics.successRate - result.baselineSnapshot.metrics.successRate).toFixed(1)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Alert severity="info">
          尚無回歸測試結果，請執行回歸測試
        </Alert>
      )}
    </Box>
  );

  // Historical snapshots panel
  const HistoricalSnapshotsPanel = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        歷史測試快照
      </Typography>
      
      {snapshots.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>版本</TableCell>
                <TableCell>時間戳</TableCell>
                <TableCell align="right">總測試數</TableCell>
                <TableCell align="right">成功率</TableCell>
                <TableCell align="right">平均響應時間</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {snapshots.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {snapshot.version}
                      </Typography>
                      {snapshot.id === baselineSnapshot?.id && (
                        <Chip label="基準" color="primary" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(snapshot.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {snapshot.metrics.totalTests}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {snapshot.metrics.successRate.toFixed(1)}%
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {snapshot.metrics.averageResponseTime.toFixed(0)}ms
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      {snapshot.id !== baselineSnapshot?.id && (
                        <Tooltip title="設為基準版本">
                          <IconButton 
                            size="small"
                            onClick={() => setBaselineSnapshot(snapshot)}
                          >
                            <DataIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {baselineSnapshot && snapshot.id !== baselineSnapshot.id && (
                        <Tooltip title="與基準比較">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              const regressionResult = detectRegressions(baselineSnapshot, snapshot);
                              setRegressionResults(prev => [regressionResult, ...prev]);
                            }}
                          >
                            <CompareIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">
          尚無測試快照，請執行基準測試或回歸測試
        </Alert>
      )}
    </Box>
  );

  const tabLabels = [
    { label: '測試執行', icon: <RunIcon /> },
    { label: '回歸結果', icon: <RegressionIcon /> },
    { label: '歷史快照', icon: <HistoryIcon /> }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        自動化回歸測試系統
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        智能回歸檢測系統，自動比較版本差異，識別性能退化和功能回歸
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          {tabLabels.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              id={`regression-tab-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      {activeTab === 0 && <TestExecutionPanel />}
      {activeTab === 1 && <RegressionResultsPanel />}
      {activeTab === 2 && <HistoricalSnapshotsPanel />}

      <ConfigurationDialog />

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>使用說明:</strong> 首先設置基準版本快照，然後執行回歸測試比較新版本
            <br />
            <strong>回歸閾值:</strong> 響應時間 &gt; {config.regressionThresholds.responseTimeDegradation}%, 
            成功率下降 &gt; {config.regressionThresholds.successRateDrop}%, 
            錯誤率增加 &gt; {config.regressionThresholds.errorRateIncrease}%
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default RegressionTestComponent;