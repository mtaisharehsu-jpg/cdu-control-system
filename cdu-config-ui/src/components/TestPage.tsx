/**
 * Test Page Component
 * 
 * A simple test page to verify that the frontend is working correctly.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import DiagnosticInfo from './DiagnosticInfo';

const TestPage: React.FC = () => {
  const [testStatus, setTestStatus] = React.useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);

  const runBasicTest = () => {
    setTestStatus('testing');
    
    // Simulate a test
    setTimeout(() => {
      setTestStatus('success');
    }, 1000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CDU 系統測試頁面
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography>
          這是一個測試頁面，用於驗證前端系統是否正常運行。
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CheckCircleIcon color="success" sx={{ mr: 1, verticalAlign: 'middle' }} />
                基本功能測試
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                測試React組件、Material-UI和基本功能是否正常工作。
              </Typography>
              <Button 
                variant="contained" 
                onClick={runBasicTest}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' ? '測試中...' : '運行測試'}
              </Button>
              {testStatus === 'success' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  基本功能測試通過！
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <InfoIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
                系統信息
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>前端框架:</strong> React 18 + TypeScript
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>UI庫:</strong> Material-UI (MUI)
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>構建工具:</strong> Vite
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>開發服務器:</strong> localhost:5173
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              功能模組狀態
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography>機種定義管理</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography>系統狀態監控</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography>API測試工具</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={12}>
          <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              快速導航
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small">
                機種定義管理
              </Button>
              <Button variant="outlined" size="small">
                當前系統狀態
              </Button>
              <Button variant="outlined" size="small">
                API測試工具
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<BugReportIcon />}
                onClick={() => setShowDiagnostics(!showDiagnostics)}
              >
                {showDiagnostics ? '隱藏' : '顯示'}診斷信息
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {showDiagnostics && (
        <Box sx={{ mt: 3 }}>
          <DiagnosticInfo />
        </Box>
      )}
    </Box>
  );
};

export default TestPage;
