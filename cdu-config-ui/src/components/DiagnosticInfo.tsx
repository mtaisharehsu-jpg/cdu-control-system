/**
 * Diagnostic Information Component
 * 
 * This component displays diagnostic information to help troubleshoot issues.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const DiagnosticInfo: React.FC = () => {
  const [diagnostics, setDiagnostics] = React.useState({
    react: false,
    mui: false,
    api: false,
    routing: false
  });

  React.useEffect(() => {
    // Test React
    try {
      setDiagnostics(prev => ({ ...prev, react: true }));
    } catch (e) {
      console.error('React test failed:', e);
    }

    // Test MUI
    try {
      const testElement = document.createElement('div');
      testElement.className = 'MuiBox-root';
      setDiagnostics(prev => ({ ...prev, mui: true }));
    } catch (e) {
      console.error('MUI test failed:', e);
    }

    // Test API module
    try {
      import('../api/simpleApi').then(() => {
        setDiagnostics(prev => ({ ...prev, api: true }));
      }).catch(e => {
        console.error('API module test failed:', e);
      });
    } catch (e) {
      console.error('API import test failed:', e);
    }

    // Test routing
    try {
      setDiagnostics(prev => ({ ...prev, routing: true }));
    } catch (e) {
      console.error('Routing test failed:', e);
    }
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircleIcon color="success" />
    ) : (
      <ErrorIcon color="error" />
    );
  };

  const getOverallStatus = () => {
    const allPassed = Object.values(diagnostics).every(Boolean);
    if (allPassed) {
      return { severity: 'success' as const, message: '所有診斷測試通過' };
    }
    const somePassed = Object.values(diagnostics).some(Boolean);
    if (somePassed) {
      return { severity: 'warning' as const, message: '部分診斷測試失敗' };
    }
    return { severity: 'error' as const, message: '多項診斷測試失敗' };
  };

  const status = getOverallStatus();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        系統診斷信息
      </Typography>

      <Alert severity={status.severity} sx={{ mb: 3 }}>
        {status.message}
      </Alert>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          快速狀態檢查
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={getStatusIcon(diagnostics.react)}
            label="React"
            color={diagnostics.react ? 'success' : 'error'}
          />
          <Chip
            icon={getStatusIcon(diagnostics.mui)}
            label="Material-UI"
            color={diagnostics.mui ? 'success' : 'error'}
          />
          <Chip
            icon={getStatusIcon(diagnostics.api)}
            label="API模組"
            color={diagnostics.api ? 'success' : 'error'}
          />
          <Chip
            icon={getStatusIcon(diagnostics.routing)}
            label="路由"
            color={diagnostics.routing ? 'success' : 'error'}
          />
        </Box>
      </Paper>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">環境信息</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ '& > *': { mb: 1 } }}>
            <Typography><strong>用戶代理:</strong> {navigator.userAgent}</Typography>
            <Typography><strong>當前URL:</strong> {window.location.href}</Typography>
            <Typography><strong>視窗大小:</strong> {window.innerWidth} x {window.innerHeight}</Typography>
            <Typography><strong>時間戳:</strong> {new Date().toISOString()}</Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">控制台日誌</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="textSecondary">
            請檢查瀏覽器開發者工具的控制台標籤以查看詳細的錯誤信息。
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" fontFamily="monospace">
              按 F12 打開開發者工具<br/>
              切換到 Console 標籤<br/>
              查看紅色錯誤信息
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">建議的解決步驟</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ '& > *': { mb: 1 } }}>
            <Typography variant="subtitle2">1. 檢查網路連接</Typography>
            <Typography variant="body2" color="textSecondary">
              確保能夠訪問 localhost:5173
            </Typography>

            <Typography variant="subtitle2">2. 清除瀏覽器緩存</Typography>
            <Typography variant="body2" color="textSecondary">
              按 Ctrl+Shift+R 強制刷新頁面
            </Typography>

            <Typography variant="subtitle2">3. 檢查開發服務器</Typography>
            <Typography variant="body2" color="textSecondary">
              確認終端中的 Vite 開發服務器正在運行
            </Typography>

            <Typography variant="subtitle2">4. 檢查瀏覽器兼容性</Typography>
            <Typography variant="body2" color="textSecondary">
              使用現代瀏覽器 (Chrome 90+, Firefox 88+, Safari 14+)
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
        <Typography variant="body2">
          <strong>提示:</strong> 如果頁面仍然顯示空白，請嘗試點擊左側導航欄中的"測試頁面"選項。
        </Typography>
      </Box>
    </Box>
  );
};

export default DiagnosticInfo;
