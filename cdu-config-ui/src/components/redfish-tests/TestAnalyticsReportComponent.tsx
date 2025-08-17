/**
 * Test Analytics and Report Generation Component
 * 
 * Advanced analytics system for test results with comprehensive reporting,
 * trend analysis, performance benchmarking, and automated insights
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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Assessment as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Speed as PerformanceIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  GetApp as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Insights as InsightsIcon,
  Compare as CompareIcon,
  Schedule as ScheduleIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  DataUsage as DataIcon,
  BugReport as BugIcon,
  Security as SecurityIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
  memoryUsage?: number;
  responseSize?: number;
  retryCount?: number;
}

interface TestSession {
  id: string;
  name: string;
  timestamp: string;
  results: Record<string, TestResult>;
  configuration: any;
  duration: number;
  successRate: number;
}

interface AnalyticsMetrics {
  totalTests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  totalDuration: number;
  errorCategories: Record<string, number>;
  performanceTrends: {
    timestamp: string;
    avgResponseTime: number;
    successRate: number;
  }[];
  criticalIssues: string[];
  recommendations: string[];
}

interface ReportConfig {
  includePerformanceMetrics: boolean;
  includeErrorAnalysis: boolean;
  includeTrendAnalysis: boolean;
  includeRecommendations: boolean;
  reportFormat: 'detailed' | 'summary' | 'executive';
  timeRange: 'last_session' | 'last_24h' | 'last_week' | 'all_time';
}

const DEFAULT_REPORT_CONFIG: ReportConfig = {
  includePerformanceMetrics: true,
  includeErrorAnalysis: true,
  includeTrendAnalysis: true,
  includeRecommendations: true,
  reportFormat: 'detailed',
  timeRange: 'last_session'
};

const TestAnalyticsReportComponent: React.FC<{
  testResults?: Record<string, TestResult>;
  testSessions?: TestSession[];
}> = ({ testResults = {}, testSessions = [] }) => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>(DEFAULT_REPORT_CONFIG);
  const [analyticsMetrics, setAnalyticsMetrics] = useState<AnalyticsMetrics | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string>('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('last_session');

  // Calculate comprehensive analytics metrics
  const calculateAnalytics = useCallback((
    results: Record<string, TestResult>, 
    sessions: TestSession[]
  ): AnalyticsMetrics => {
    const allResults = Object.values(results);
    const durations = allResults.map(r => r.duration || 0).filter(d => d > 0);
    const errors = allResults.filter(r => !r.success);
    
    // Error categorization
    const errorCategories: Record<string, number> = {};
    errors.forEach(error => {
      const category = categorizeError(error.error || 'Unknown error');
      errorCategories[category] = (errorCategories[category] || 0) + 1;
    });

    // Performance trends from sessions
    const performanceTrends = sessions.slice(0, 10).map(session => ({
      timestamp: session.timestamp,
      avgResponseTime: Object.values(session.results)
        .map(r => r.duration || 0)
        .reduce((a, b) => a + b, 0) / Object.keys(session.results).length,
      successRate: session.successRate
    }));

    // Critical issues identification
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    const successRate = allResults.length > 0 ? (allResults.filter(r => r.success).length / allResults.length) * 100 : 0;
    const avgResponseTime = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    if (successRate < 70) {
      criticalIssues.push('整體測試成功率過低 (< 70%)');
      recommendations.push('檢查API服務狀態，確認網路連接穩定性');
    }

    if (avgResponseTime > 5000) {
      criticalIssues.push('API響應時間過長 (> 5秒)');
      recommendations.push('優化API性能，考慮增加緩存機制');
    }

    if (errorCategories['Network Error'] > 3) {
      criticalIssues.push('網路連接錯誤頻繁發生');
      recommendations.push('檢查網路設置和防火牆配置');
    }

    if (Object.keys(errorCategories).length > 5) {
      recommendations.push('錯誤類型過多，建議進行全面的系統診斷');
    }

    return {
      totalTests: allResults.length,
      successCount: allResults.filter(r => r.success).length,
      failureCount: errors.length,
      successRate,
      averageResponseTime: avgResponseTime,
      maxResponseTime: durations.length > 0 ? Math.max(...durations) : 0,
      minResponseTime: durations.length > 0 ? Math.min(...durations) : 0,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      errorCategories,
      performanceTrends,
      criticalIssues,
      recommendations
    };
  }, []);

  // Categorize errors for better analysis
  const categorizeError = (errorMessage: string): string => {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return 'Network Error';
    } else if (message.includes('404') || message.includes('not found')) {
      return 'Resource Not Found';
    } else if (message.includes('500') || message.includes('internal server')) {
      return 'Server Error';
    } else if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      return 'Authentication Error';
    } else if (message.includes('400') || message.includes('bad request')) {
      return 'Request Error';
    } else if (message.includes('parse') || message.includes('json') || message.includes('xml')) {
      return 'Data Format Error';
    } else {
      return 'Other Error';
    }
  };

  // Generate comprehensive report
  const generateReport = useCallback(async () => {
    setGeneratingReport(true);
    
    try {
      // Simulate report generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!analyticsMetrics) return;

      let report = '';

      // Executive Summary
      report += '# CDU Redfish API 測試分析報告\n\n';
      report += `**生成時間:** ${new Date().toLocaleString()}\n`;
      report += `**測試範圍:** ${reportConfig.timeRange}\n`;
      report += `**報告類型:** ${reportConfig.reportFormat}\n\n`;

      // Overall Statistics
      report += '## 整體統計\n\n';
      report += `- **總測試數:** ${analyticsMetrics.totalTests}\n`;
      report += `- **成功測試:** ${analyticsMetrics.successCount}\n`;
      report += `- **失敗測試:** ${analyticsMetrics.failureCount}\n`;
      report += `- **成功率:** ${analyticsMetrics.successRate.toFixed(1)}%\n`;
      report += `- **平均響應時間:** ${analyticsMetrics.averageResponseTime.toFixed(0)}ms\n`;
      report += `- **總測試時間:** ${(analyticsMetrics.totalDuration / 1000).toFixed(1)}s\n\n`;

      // Performance Metrics
      if (reportConfig.includePerformanceMetrics) {
        report += '## 性能指標\n\n';
        report += `- **最快響應時間:** ${analyticsMetrics.minResponseTime}ms\n`;
        report += `- **最慢響應時間:** ${analyticsMetrics.maxResponseTime}ms\n`;
        report += `- **響應時間標準差:** ${calculateStandardDeviation()}ms\n`;
        
        if (analyticsMetrics.averageResponseTime < 1000) {
          report += '- **性能評級:** 優秀 ✅\n';
        } else if (analyticsMetrics.averageResponseTime < 3000) {
          report += '- **性能評級:** 良好 ⚡\n';
        } else {
          report += '- **性能評級:** 需要改進 ⚠️\n';
        }
        report += '\n';
      }

      // Error Analysis
      if (reportConfig.includeErrorAnalysis && Object.keys(analyticsMetrics.errorCategories).length > 0) {
        report += '## 錯誤分析\n\n';
        Object.entries(analyticsMetrics.errorCategories).forEach(([category, count]) => {
          report += `- **${category}:** ${count} 次\n`;
        });
        report += '\n';
      }

      // Critical Issues
      if (analyticsMetrics.criticalIssues.length > 0) {
        report += '## 🚨 關鍵問題\n\n';
        analyticsMetrics.criticalIssues.forEach(issue => {
          report += `- ${issue}\n`;
        });
        report += '\n';
      }

      // Recommendations
      if (reportConfig.includeRecommendations && analyticsMetrics.recommendations.length > 0) {
        report += '## 💡 建議與改進方案\n\n';
        analyticsMetrics.recommendations.forEach((rec, index) => {
          report += `${index + 1}. ${rec}\n`;
        });
        report += '\n';
      }

      // Trend Analysis
      if (reportConfig.includeTrendAnalysis && analyticsMetrics.performanceTrends.length > 0) {
        report += '## 趨勢分析\n\n';
        report += '最近 10 次測試的性能趨勢:\n\n';
        analyticsMetrics.performanceTrends.forEach((trend, index) => {
          report += `${index + 1}. ${new Date(trend.timestamp).toLocaleString()} - `;
          report += `成功率: ${trend.successRate.toFixed(1)}%, `;
          report += `平均響應: ${trend.avgResponseTime.toFixed(0)}ms\n`;
        });
        report += '\n';
      }

      // Detailed Results (for detailed report)
      if (reportConfig.reportFormat === 'detailed') {
        report += '## 詳細測試結果\n\n';
        Object.entries(testResults).forEach(([testName, result]) => {
          report += `### ${testName}\n`;
          report += `- 狀態: ${result.success ? '✅ 成功' : '❌ 失敗'}\n`;
          report += `- 執行時間: ${result.duration || 0}ms\n`;
          if (result.error) {
            report += `- 錯誤信息: ${result.error}\n`;
          }
          if (result.retryCount) {
            report += `- 重試次數: ${result.retryCount}\n`;
          }
          report += '\n';
        });
      }

      report += '---\n';
      report += '*此報告由 CDU Redfish API 測試分析系統自動生成*';

      setGeneratedReport(report);
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setGeneratingReport(false);
    }
  }, [analyticsMetrics, reportConfig, testResults]);

  // Calculate standard deviation for response times
  const calculateStandardDeviation = (): number => {
    if (!analyticsMetrics) return 0;
    
    const durations = Object.values(testResults).map(r => r.duration || 0).filter(d => d > 0);
    if (durations.length === 0) return 0;
    
    const mean = analyticsMetrics.averageResponseTime;
    const squaredDiffs = durations.map(duration => Math.pow(duration - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / durations.length;
    return Math.sqrt(variance);
  };

  // Update analytics when data changes
  useEffect(() => {
    if (Object.keys(testResults).length > 0 || testSessions.length > 0) {
      const metrics = calculateAnalytics(testResults, testSessions);
      setAnalyticsMetrics(metrics);
    }
  }, [testResults, testSessions, calculateAnalytics]);

  // Export functions
  const exportReport = (format: 'txt' | 'json' | 'csv') => {
    if (!generatedReport && format !== 'json') return;
    
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'txt':
        content = generatedReport;
        filename = `cdu_test_report_${Date.now()}.txt`;
        mimeType = 'text/plain';
        break;
      case 'json':
        content = JSON.stringify({
          timestamp: new Date().toISOString(),
          analytics: analyticsMetrics,
          testResults,
          configuration: reportConfig
        }, null, 2);
        filename = `cdu_test_data_${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      case 'csv':
        content = convertToCSV();
        filename = `cdu_test_results_${Date.now()}.csv`;
        mimeType = 'text/csv';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (): string => {
    const headers = ['測試名稱', '狀態', '執行時間(ms)', '錯誤信息', '重試次數', '時間戳'];
    const rows = Object.entries(testResults).map(([name, result]) => [
      name,
      result.success ? 'Success' : 'Failed',
      result.duration || 0,
      result.error || '',
      result.retryCount || 0,
      result.timestamp || ''
    ]);

    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  };

  // Report configuration dialog
  const ReportConfigDialog = () => (
    <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AnalyticsIcon />
          <Typography variant="h6">報告生成配置</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>報告格式</InputLabel>
              <Select
                value={reportConfig.reportFormat}
                onChange={(e) => setReportConfig(prev => ({ 
                  ...prev, 
                  reportFormat: e.target.value as any 
                }))}
              >
                <MenuItem value="summary">摘要報告</MenuItem>
                <MenuItem value="detailed">詳細報告</MenuItem>
                <MenuItem value="executive">執行摘要</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>時間範圍</InputLabel>
              <Select
                value={reportConfig.timeRange}
                onChange={(e) => setReportConfig(prev => ({ 
                  ...prev, 
                  timeRange: e.target.value as any 
                }))}
              >
                <MenuItem value="last_session">最近一次測試</MenuItem>
                <MenuItem value="last_24h">最近24小時</MenuItem>
                <MenuItem value="last_week">最近一週</MenuItem>
                <MenuItem value="all_time">所有時間</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>包含內容:</Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {[
                { key: 'includePerformanceMetrics', label: '性能指標分析' },
                { key: 'includeErrorAnalysis', label: '錯誤分析統計' },
                { key: 'includeTrendAnalysis', label: '趨勢分析圖表' },
                { key: 'includeRecommendations', label: '改進建議' }
              ].map(option => (
                <Box key={option.key} display="flex" alignItems="center">
                  <input
                    type="checkbox"
                    checked={reportConfig[option.key as keyof ReportConfig] as boolean}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      [option.key]: e.target.checked
                    }))}
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {option.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReportDialogOpen(false)}>取消</Button>
        <Button
          variant="contained"
          onClick={() => {
            generateReport();
            setReportDialogOpen(false);
          }}
          startIcon={generatingReport ? <CircularProgress size={16} /> : <AnalyticsIcon />}
          disabled={generatingReport}
        >
          生成報告
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Main analytics dashboard
  const AnalyticsDashboard = () => {
    if (!analyticsMetrics) {
      return (
        <Alert severity="info">
          運行測試以查看分析結果和生成報告
        </Alert>
      );
    }

    return (
      <Grid container spacing={3}>
        {/* Key Metrics Cards */}
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {analyticsMetrics.successRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                成功率
              </Typography>
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={analyticsMetrics.successRate}
                  color={analyticsMetrics.successRate > 80 ? 'success' : 'warning'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                {analyticsMetrics.averageResponseTime.toFixed(0)}ms
              </Typography>
              <Typography variant="body2" color="textSecondary">
                平均響應時間
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
                {analyticsMetrics.averageResponseTime < 1000 ? (
                  <TrendingUpIcon color="success" />
                ) : (
                  <TrendingDownIcon color="error" />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {analyticsMetrics.successCount}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                成功測試
              </Typography>
              <SuccessIcon color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {analyticsMetrics.failureCount}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                失敗測試
              </Typography>
              <ErrorIcon color="error" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>

        {/* Critical Issues */}
        {analyticsMetrics.criticalIssues.length > 0 && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                🚨 發現關鍵問題
              </Typography>
              <List dense>
                {analyticsMetrics.criticalIssues.map((issue, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color="error" />
                    </ListItemIcon>
                    <ListItemText primary={issue} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          </Grid>
        )}

        {/* Error Categories */}
        {Object.keys(analyticsMetrics.errorCategories).length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  錯誤分類統計
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>錯誤類型</TableCell>
                        <TableCell align="right">次數</TableCell>
                        <TableCell align="right">百分比</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(analyticsMetrics.errorCategories).map(([category, count]) => (
                        <TableRow key={category}>
                          <TableCell>{category}</TableCell>
                          <TableCell align="right">{count}</TableCell>
                          <TableCell align="right">
                            {((count / analyticsMetrics.failureCount) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recommendations */}
        {analyticsMetrics.recommendations.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💡 改進建議
                </Typography>
                <List>
                  {analyticsMetrics.recommendations.map((rec, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <InsightsIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" gutterBottom>
          測試分析與報告生成
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            onClick={() => setReportDialogOpen(true)}
            startIcon={<AnalyticsIcon />}
            disabled={!analyticsMetrics}
          >
            生成報告
          </Button>
          {generatedReport && (
            <>
              <Button
                variant="outlined"
                onClick={() => exportReport('txt')}
                startIcon={<DownloadIcon />}
              >
                匯出TXT
              </Button>
              <Button
                variant="outlined"
                onClick={() => exportReport('json')}
                startIcon={<DataIcon />}
              >
                匯出JSON
              </Button>
              <Button
                variant="outlined"
                onClick={() => exportReport('csv')}
                startIcon={<StorageIcon />}
              >
                匯出CSV
              </Button>
            </>
          )}
        </Box>
      </Box>

      <AnalyticsDashboard />

      {/* Generated Report Preview */}
      {generatedReport && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              生成的報告預覽
            </Typography>
            <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto', bgcolor: '#f5f5f5' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                {generatedReport}
              </pre>
            </Paper>
          </CardContent>
        </Card>
      )}

      <ReportConfigDialog />

      {generatingReport && (
        <Box 
          sx={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">正在生成分析報告...</Typography>
            <Typography variant="body2" color="textSecondary">
              分析測試結果並生成智能建議
            </Typography>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default TestAnalyticsReportComponent;