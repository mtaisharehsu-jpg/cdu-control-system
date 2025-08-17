/**
 * Performance Benchmark Component
 * 
 * Advanced API performance monitoring with load testing, benchmarking,
 * stress testing, and real-time performance analytics
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
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Speed as PerformanceIcon,
  Timeline as BenchmarkIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  PlayArrow as RunIcon,
  Stop as StopIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  DataUsage as DataIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  CloudQueue as LoadIcon
} from '@mui/icons-material';

// Import API functions
import {
  getRedfishHealthCheck,
  getRedfishSystemStatus,
  getRedfishSensorReadings,
  getRedfishServiceRoot,
  runRedfishTestSuite
} from '../../api/cduApi';

interface BenchmarkConfig {
  testDuration: number; // seconds
  concurrentRequests: number;
  requestInterval: number; // ms
  testEndpoints: string[];
  includeLoadTesting: boolean;
  includeStressTesting: boolean;
  maxRPS: number; // requests per second
  rampUpTime: number; // seconds
  cooldownTime: number; // seconds
}

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  throughput: number; // bytes per second
  cpuUsage?: number;
  memoryUsage?: number;
  networkLatency?: number;
}

interface BenchmarkResult {
  timestamp: string;
  config: BenchmarkConfig;
  metrics: PerformanceMetrics;
  responseTimes: number[];
  errors: { endpoint: string; error: string; timestamp: string }[];
  testType: 'baseline' | 'load' | 'stress' | 'endurance';
}

interface RealTimeMetrics {
  currentRPS: number;
  activeConnections: number;
  responseTime: number;
  errorCount: number;
  timestamp: string;
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  testDuration: 60,
  concurrentRequests: 10,
  requestInterval: 1000,
  testEndpoints: [
    'health',
    'status', 
    'sensors/readings',
    'serviceRoot'
  ],
  includeLoadTesting: true,
  includeStressTesting: false,
  maxRPS: 100,
  rampUpTime: 30,
  cooldownTime: 10
};

const PerformanceBenchmarkComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState<BenchmarkConfig>(DEFAULT_CONFIG);
  const [isRunning, setBenchmarkRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics[]>([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [baseline, setBaseline] = useState<BenchmarkResult | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [performanceAlerts, setPerformanceAlerts] = useState<string[]>([]);

  // Performance thresholds
  const THRESHOLDS = {
    responseTime: 2000, // ms
    errorRate: 5, // %
    rps: 50,
    cpuUsage: 80, // %
    memoryUsage: 75 // %
  };

  // API endpoint mapping
  const API_ENDPOINTS = {
    health: () => getRedfishHealthCheck(),
    status: () => getRedfishSystemStatus(),
    'sensors/readings': () => getRedfishSensorReadings(),
    serviceRoot: () => getRedfishServiceRoot()
  };

  // Execute single API request with timing
  const executeRequest = useCallback(async (endpoint: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
    responseSize?: number;
  }> => {
    const startTime = performance.now();
    
    try {
      const apiFunction = API_ENDPOINTS[endpoint as keyof typeof API_ENDPOINTS];
      if (!apiFunction) {
        throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      const response = await apiFunction();
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        responseTime,
        responseSize: JSON.stringify(response).length
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }, []);

  // Run baseline performance test
  const runBaselineTest = useCallback(async () => {
    setBenchmarkRunning(true);
    setCurrentProgress(0);
    
    const startTime = Date.now();
    const results: number[] = [];
    const errors: any[] = [];
    let successCount = 0;
    
    try {
      // Run sequential tests for baseline
      const totalRequests = config.testEndpoints.length * 10; // 10 requests per endpoint
      let requestCount = 0;

      for (const endpoint of config.testEndpoints) {
        for (let i = 0; i < 10; i++) {
          const result = await executeRequest(endpoint);
          results.push(result.responseTime);
          
          if (result.success) {
            successCount++;
          } else {
            errors.push({
              endpoint,
              error: result.error,
              timestamp: new Date().toISOString()
            });
          }
          
          requestCount++;
          setCurrentProgress((requestCount / totalRequests) * 100);
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      const metrics = calculateMetrics(results, successCount, errors.length, duration);
      
      const baselineResult: BenchmarkResult = {
        timestamp: new Date().toISOString(),
        config: { ...config },
        metrics,
        responseTimes: results,
        errors,
        testType: 'baseline'
      };

      setBaseline(baselineResult);
      setBenchmarkResults(prev => [baselineResult, ...prev]);
      setCurrentMetrics(metrics);
      
    } catch (error) {
      console.error('Baseline test failed:', error);
    } finally {
      setBenchmarkRunning(false);
      setCurrentProgress(0);
    }
  }, [config, executeRequest]);

  // Run load testing
  const runLoadTest = useCallback(async () => {
    setBenchmarkRunning(true);
    setCurrentProgress(0);
    setRealTimeMetrics([]);
    
    const startTime = Date.now();
    const results: number[] = [];
    const errors: any[] = [];
    let successCount = 0;
    
    try {
      // Concurrent load testing
      const testDuration = config.testDuration * 1000; // convert to ms
      const intervalMs = 1000 / (config.maxRPS / config.concurrentRequests);
      
      let requestCount = 0;
      const startTestTime = Date.now();
      
      const runConcurrentRequests = async () => {
        const promises = config.testEndpoints.map(async (endpoint) => {
          const result = await executeRequest(endpoint);
          results.push(result.responseTime);
          
          if (result.success) {
            successCount++;
          } else {
            errors.push({
              endpoint,
              error: result.error,
              timestamp: new Date().toISOString()
            });
          }
          
          return result;
        });
        
        await Promise.all(promises);
        requestCount += config.testEndpoints.length;
        
        // Update real-time metrics
        const currentTime = Date.now();
        const elapsed = (currentTime - startTestTime) / 1000;
        const currentRPS = requestCount / elapsed;
        
        setRealTimeMetrics(prev => [...prev, {
          currentRPS,
          activeConnections: config.concurrentRequests,
          responseTime: results[results.length - 1] || 0,
          errorCount: errors.length,
          timestamp: new Date().toISOString()
        }].slice(-100)); // Keep last 100 data points
        
        setCurrentProgress((elapsed / (config.testDuration)) * 100);
      };

      // Run load test with intervals
      const intervalId = setInterval(runConcurrentRequests, intervalMs);
      
      // Stop after configured duration
      setTimeout(() => {
        clearInterval(intervalId);
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        const metrics = calculateMetrics(results, successCount, errors.length, duration);
        
        const loadResult: BenchmarkResult = {
          timestamp: new Date().toISOString(),
          config: { ...config },
          metrics,
          responseTimes: results,
          errors,
          testType: 'load'
        };

        setBenchmarkResults(prev => [loadResult, ...prev]);
        setCurrentMetrics(metrics);
        
        // Check for performance alerts
        checkPerformanceAlerts(metrics);
        
        setBenchmarkRunning(false);
        setCurrentProgress(0);
      }, testDuration);
      
    } catch (error) {
      console.error('Load test failed:', error);
      setBenchmarkRunning(false);
    }
  }, [config, executeRequest]);

  // Calculate performance metrics
  const calculateMetrics = useCallback((
    responseTimes: number[],
    successCount: number,
    errorCount: number,
    duration: number
  ): PerformanceMetrics => {
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const totalRequests = responseTimes.length;
    
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    return {
      totalRequests,
      successfulRequests: successCount,
      failedRequests: errorCount,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
      minResponseTime: Math.min(...responseTimes) || 0,
      maxResponseTime: Math.max(...responseTimes) || 0,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      requestsPerSecond: totalRequests / duration,
      errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
      throughput: 0 // Would need actual byte measurements
    };
  }, []);

  // Check for performance alerts
  const checkPerformanceAlerts = useCallback((metrics: PerformanceMetrics) => {
    if (!alertsEnabled) return;

    const alerts: string[] = [];

    if (metrics.averageResponseTime > THRESHOLDS.responseTime) {
      alerts.push(`平均響應時間過高: ${metrics.averageResponseTime.toFixed(0)}ms (閾值: ${THRESHOLDS.responseTime}ms)`);
    }

    if (metrics.errorRate > THRESHOLDS.errorRate) {
      alerts.push(`錯誤率過高: ${metrics.errorRate.toFixed(1)}% (閾值: ${THRESHOLDS.errorRate}%)`);
    }

    if (metrics.requestsPerSecond < THRESHOLDS.rps) {
      alerts.push(`吞吐量過低: ${metrics.requestsPerSecond.toFixed(1)} RPS (閾值: ${THRESHOLDS.rps} RPS)`);
    }

    if (alerts.length > 0) {
      setPerformanceAlerts(prev => [...prev, ...alerts].slice(-10));
    }
  }, [alertsEnabled]);

  // Compare with baseline
  const compareWithBaseline = useCallback((current: PerformanceMetrics): {
    responseTimeChange: number;
    throughputChange: number;
    errorRateChange: number;
    overall: 'improved' | 'degraded' | 'similar';
  } => {
    if (!baseline) {
      return {
        responseTimeChange: 0,
        throughputChange: 0,
        errorRateChange: 0,
        overall: 'similar'
      };
    }

    const responseTimeChange = ((current.averageResponseTime - baseline.metrics.averageResponseTime) / baseline.metrics.averageResponseTime) * 100;
    const throughputChange = ((current.requestsPerSecond - baseline.metrics.requestsPerSecond) / baseline.metrics.requestsPerSecond) * 100;
    const errorRateChange = current.errorRate - baseline.metrics.errorRate;

    let overall: 'improved' | 'degraded' | 'similar' = 'similar';
    if (responseTimeChange < -5 && throughputChange > 5 && errorRateChange < 1) {
      overall = 'improved';
    } else if (responseTimeChange > 10 || throughputChange < -10 || errorRateChange > 2) {
      overall = 'degraded';
    }

    return {
      responseTimeChange,
      throughputChange,
      errorRateChange,
      overall
    };
  }, [baseline]);

  // Configuration dialog
  const ConfigurationDialog = () => (
    <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          <Typography variant="h6">性能測試配置</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="測試持續時間 (秒)"
              value={config.testDuration}
              onChange={(e) => setConfig(prev => ({ ...prev, testDuration: parseInt(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="併發請求數"
              value={config.concurrentRequests}
              onChange={(e) => setConfig(prev => ({ ...prev, concurrentRequests: parseInt(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="最大RPS"
              value={config.maxRPS}
              onChange={(e) => setConfig(prev => ({ ...prev, maxRPS: parseInt(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="預熱時間 (秒)"
              value={config.rampUpTime}
              onChange={(e) => setConfig(prev => ({ ...prev, rampUpTime: parseInt(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.includeLoadTesting}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeLoadTesting: e.target.checked }))}
                />
              }
              label="包含負載測試"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.includeStressTesting}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeStressTesting: e.target.checked }))}
                />
              }
              label="包含壓力測試"
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

  // Baseline testing panel
  const BaselineTestingPanel = () => (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                基準性能測試
              </Typography>
              <Typography variant="body2" color="textSecondary">
                建立系統性能基準線，用於後續性能比較和回歸檢測
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

          {isRunning && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={currentProgress} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                測試進度: {currentProgress.toFixed(0)}%
              </Typography>
            </Box>
          )}

          <Box display="flex" gap={2} mb={2}>
            <Button
              variant="contained"
              onClick={runBaselineTest}
              disabled={isRunning}
              startIcon={isRunning ? <CircularProgress size={16} /> : <TimerIcon />}
            >
              {isRunning ? '執行中...' : '執行基準測試'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={runLoadTest}
              disabled={isRunning || !baseline}
              startIcon={<LoadIcon />}
            >
              負載測試
            </Button>
          </Box>

          {baseline && (
            <Alert severity="success">
              基準測試已完成 - 平均響應時間: {baseline.metrics.averageResponseTime.toFixed(0)}ms, 
              成功率: {((baseline.metrics.successfulRequests / baseline.metrics.totalRequests) * 100).toFixed(1)}%
            </Alert>
          )}
        </CardContent>
      </Card>

      {currentMetrics && (
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {currentMetrics.averageResponseTime.toFixed(0)}ms
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  平均響應時間
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  {currentMetrics.requestsPerSecond.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  RPS
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {((currentMetrics.successfulRequests / currentMetrics.totalRequests) * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  成功率
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color={currentMetrics.errorRate > 5 ? "error.main" : "success.main"}>
                  {currentMetrics.errorRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  錯誤率
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  // Real-time monitoring panel
  const RealTimeMonitoringPanel = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        即時性能監控
      </Typography>
      
      {realTimeMetrics.length > 0 ? (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  實時指標
                </Typography>
                {realTimeMetrics.slice(-1).map((metrics, index) => (
                  <Box key={index}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">當前RPS:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {metrics.currentRPS.toFixed(1)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">活躍連接:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {metrics.activeConnections}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">響應時間:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {metrics.responseTime.toFixed(0)}ms
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">錯誤計數:</Typography>
                      <Typography variant="body2" fontWeight="bold" color={metrics.errorCount > 0 ? "error.main" : "success.main"}>
                        {metrics.errorCount}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  性能警報
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={alertsEnabled}
                      onChange={(e) => setAlertsEnabled(e.target.checked)}
                    />
                  }
                  label="啟用警報"
                />
                
                {performanceAlerts.length > 0 ? (
                  <List dense>
                    {performanceAlerts.slice(-5).map((alert, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={alert}
                          secondary={`警報 #${index + 1}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="success.main">
                    ✅ 無性能警報
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info">
          執行負載測試以查看即時監控數據
        </Alert>
      )}
    </Box>
  );

  // Historical results panel
  const HistoricalResultsPanel = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        歷史測試結果
      </Typography>
      
      {benchmarkResults.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>測試時間</TableCell>
                <TableCell>類型</TableCell>
                <TableCell>平均響應時間</TableCell>
                <TableCell>RPS</TableCell>
                <TableCell>成功率</TableCell>
                <TableCell>與基準比較</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {benchmarkResults.map((result, index) => {
                const comparison = compareWithBaseline(result.metrics);
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(result.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={result.testType}
                        color={result.testType === 'baseline' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {result.metrics.averageResponseTime.toFixed(0)}ms
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {result.metrics.requestsPerSecond.toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {((result.metrics.successfulRequests / result.metrics.totalRequests) * 100).toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {result.testType !== 'baseline' && baseline && (
                        <Box display="flex" alignItems="center" gap={1}>
                          {comparison.overall === 'improved' && <TrendingUpIcon color="success" />}
                          {comparison.overall === 'degraded' && <TrendingDownIcon color="error" />}
                          <Typography 
                            variant="body2" 
                            color={
                              comparison.overall === 'improved' ? 'success.main' :
                              comparison.overall === 'degraded' ? 'error.main' : 'textSecondary'
                            }
                          >
                            {comparison.responseTimeChange > 0 ? '+' : ''}{comparison.responseTimeChange.toFixed(1)}%
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">
          尚無歷史測試結果，請先執行基準測試
        </Alert>
      )}
    </Box>
  );

  const tabLabels = [
    { label: '基準測試', icon: <TimerIcon /> },
    { label: '即時監控', icon: <NetworkIcon /> },
    { label: '歷史結果', icon: <AssessmentIcon /> }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        API性能監控與基準測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        全面的API性能測試工具，支持基準測試、負載測試、即時監控和性能回歸檢測
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          {tabLabels.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              id={`performance-tab-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      {activeTab === 0 && <BaselineTestingPanel />}
      {activeTab === 1 && <RealTimeMonitoringPanel />}
      {activeTab === 2 && <HistoricalResultsPanel />}

      <ConfigurationDialog />

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>性能基準:</strong> 建議先執行基準測試建立性能基線，再進行負載測試和回歸檢測
            <br />
            <strong>監控閾值:</strong> 響應時間 &lt; 2s, 錯誤率 &lt; 5%, RPS &gt; 50
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default PerformanceBenchmarkComponent;