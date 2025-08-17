/**
 * Batch Testing Test Component
 * 
 * Comprehensive batch testing for all Redfish API endpoints
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Stop as StopIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Timeline as BatchIcon
} from '@mui/icons-material';

// Import API functions
import {
  runRedfishTestSuite,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

const BatchTestingTestComponent: React.FC = () => {
  const [batchTesting, setBatchTesting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const setTestResult = (testName: string, result: TestResult) => {
    setResults(prev => ({ 
      ...prev, 
      [testName]: { 
        ...result, 
        timestamp: new Date().toISOString() 
      }
    }));
  };

  const runBatchTest = async () => {
    setBatchTesting(true);
    setBatchProgress(0);
    
    try {
      const results = await runRedfishTestSuite();
      const testNames = Object.keys(results);
      
      // 逐步更新進度和結果
      testNames.forEach((testName, index) => {
        setTimeout(() => {
          setTestResult(testName, results[testName]);
          setBatchProgress(((index + 1) / testNames.length) * 100);
        }, index * 100);
      });
      
      setTimeout(() => {
        setBatchTesting(false);
      }, testNames.length * 100);
      
    } catch (error) {
      console.error('Batch test failed:', error);
      setBatchTesting(false);
    }
  };

  const getTestSuccessRate = () => {
    const testNames = Object.keys(results);
    if (testNames.length === 0) return 0;
    
    const successCount = testNames.filter(name => results[name]?.success).length;
    return (successCount / testNames.length) * 100;
  };

  const testSuccessRate = getTestSuccessRate();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        批量測試套件
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        執行所有DMTF標準Redfish API端點的綜合測試，包括服務發現、標準資源、DMTF 2024.4冷卻資源、
        感測器管理、PLC控制、警報系統、管理服務、事件服務、更新服務、任務服務和集群管理。
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            完整API測試套件
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            執行所有DMTF標準Redfish API端點的綜合測試，包括服務發現、標準資源、DMTF 2024.4冷卻資源、
            感測器管理、PLC控制、警報系統、管理服務、事件服務、更新服務、任務服務和集群管理。
          </Typography>
          
          {batchTesting && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={batchProgress} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                測試進度: {Math.round(batchProgress)}%
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={runBatchTest}
            disabled={batchTesting}
            startIcon={batchTesting ? <StopIcon /> : <BatchIcon />}
          >
            {batchTesting ? '測試進行中...' : '執行完整測試套件'}
          </Button>
        </CardContent>
      </Card>

      {/* 測試成功率顯示 */}
      {Object.keys(results).length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              測試成功率
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <LinearProgress 
                variant="determinate" 
                value={testSuccessRate} 
                color={testSuccessRate > 80 ? 'success' : testSuccessRate > 60 ? 'warning' : 'error'}
                sx={{ flexGrow: 1 }}
              />
              <Typography 
                variant="h6" 
                color={testSuccessRate > 80 ? 'success.main' : testSuccessRate > 60 ? 'warning.main' : 'error.main'}
              >
                {testSuccessRate.toFixed(0)}%
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              已完成 {Object.keys(results).length} 項測試，
              成功 {Object.values(results).filter(r => r.success).length} 項，
              失敗 {Object.values(results).filter(r => !r.success).length} 項
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* 測試結果摘要 */}
      {Object.keys(results).length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              測試結果摘要
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>測試項目</TableCell>
                    <TableCell>狀態</TableCell>
                    <TableCell>執行時間</TableCell>
                    <TableCell>時間戳</TableCell>
                    <TableCell>錯誤信息</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(results)
                    .sort(([,a], [,b]) => (b.timestamp || '').localeCompare(a.timestamp || ''))
                    .map(([testName, result]) => (
                    <TableRow key={testName}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {testName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={result.success ? <SuccessIcon /> : <ErrorIcon />}
                          label={result.success ? 'Success' : 'Failed'}
                          color={result.success ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {result.duration ? `${result.duration}ms` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          color="error"
                          sx={{ 
                            maxWidth: 200, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={result.error}
                        >
                          {result.error || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            批量測試將依序執行所有Redfish API端點測試，包括：
            <br />
            • 標準Redfish服務發現、資源管理和DMTF 2024.4冷卻資源
            <br />
            • 80種警報代碼(A001-A080)和48個PLC感測器的完整功能
            <br />
            • 管理服務、事件服務、更新服務、任務服務等完整Redfish生態系統
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default BatchTestingTestComponent;