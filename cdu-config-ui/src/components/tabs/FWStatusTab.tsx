import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// 韌體資訊類型定義
interface FirmwareInfo {
  module: string;
  moduleName: string;
  currentVersion: string;
  buildDate: string;
  checksum: string;
  status: 'normal' | 'outdated' | 'error';
  description: string;
  size: string;
}

interface SystemInfo {
  deviceModel: string;
  serialNumber: string;
  hardwareRevision: string;
  bootloaderVersion: string;
  systemUptime: string;
  lastUpdateDate: string;
}

const FWStatusTab: React.FC = () => {
  const [firmwareList, setFirmwareList] = useState<FirmwareInfo[]>([
    {
      module: 'web_interface',
      moduleName: 'Web I/F',
      currentVersion: '2.1.5',
      buildDate: '2025-07-15',
      checksum: 'A1B2C3D4E5F6',
      status: 'normal',
      description: 'Web界面控制模組',
      size: '2.5 MB'
    },
    {
      module: 'control_unit_left',
      moduleName: 'Control Unit Left',
      currentVersion: '1.8.2',
      buildDate: '2025-07-10',
      checksum: 'F6E5D4C3B2A1',
      status: 'normal',
      description: '左控制單元韌體',
      size: '1.2 MB'
    },
    {
      module: 'control_unit_right',
      moduleName: 'Control Unit Right',
      currentVersion: '1.8.2',
      buildDate: '2025-07-10',
      checksum: 'F6E5D4C3B2A1',
      status: 'normal',
      description: '右控制單元韌體',
      size: '1.2 MB'
    },
    {
      module: 'pump_left',
      moduleName: 'Pump Left',
      currentVersion: '3.2.1',
      buildDate: '2025-06-25',
      checksum: '123456789ABC',
      status: 'outdated',
      description: '左泵浦控制韌體',
      size: '512 KB'
    },
    {
      module: 'pump_right',
      moduleName: 'Pump Right',
      currentVersion: '3.2.1',
      buildDate: '2025-06-25',
      checksum: '123456789ABC',
      status: 'outdated',
      description: '右泵浦控制韌體',
      size: '512 KB'
    },
    {
      module: 'valve_controller',
      moduleName: 'Valve Controller',
      currentVersion: '2.0.3',
      buildDate: '2025-07-01',
      checksum: 'DEF123456789',
      status: 'normal',
      description: '閥門控制器韌體',
      size: '256 KB'
    },
    {
      module: 'sensor_module',
      moduleName: 'Sensor Module',
      currentVersion: '1.5.7',
      buildDate: '2025-07-08',
      checksum: '789ABCDEF123',
      status: 'normal',
      description: '感測器模組韌體',
      size: '384 KB'
    }
  ]);

  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    deviceModel: 'CDU-200KW-V2.2',
    serialNumber: 'CDU202500728001',
    hardwareRevision: 'HW-Rev-2.1',
    bootloaderVersion: 'BL-1.0.3',
    systemUptime: '15 天 8 小時 23 分鐘',
    lastUpdateDate: '2025-07-15 14:30:00'
  });

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    firmware?: FirmwareInfo;
  }>({
    open: false
  });

  // 掃描韌體版本
  const scanFirmware = async () => {
    setScanning(true);
    setScanProgress(0);
    
    try {
      // 模擬掃描過程
      for (let i = 0; i <= 100; i += 10) {
        setScanProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // 模擬更新韌體資訊
      setFirmwareList(prev => prev.map(fw => ({
        ...fw,
        // 隨機更新一些狀態用於演示
        status: Math.random() > 0.8 ? 'outdated' : fw.status
      })));
      
      setSystemInfo(prev => ({
        ...prev,
        lastUpdateDate: new Date().toLocaleString()
      }));
      
    } catch (error) {
      console.error('韌體掃描失敗:', error);
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  };

  // 取得狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'success';
      case 'outdated':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  // 取得狀態圖示
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircleIcon color="success" />;
      case 'outdated':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon />;
    }
  };

  // 取得狀態文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal':
        return '正常';
      case 'outdated':
        return '需要更新';
      case 'error':
        return '錯誤';
      default:
        return '未知';
    }
  };

  const outdatedCount = firmwareList.filter(fw => fw.status === 'outdated').length;
  const errorCount = firmwareList.filter(fw => fw.status === 'error').length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        韌體狀態
      </Typography>

      {/* 狀態概覽 */}
      {outdatedCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          發現 {outdatedCount} 個模組的韌體需要更新，建議前往韌體更新頁面進行更新。
        </Alert>
      )}
      
      {errorCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          發現 {errorCount} 個模組存在韌體錯誤，請聯繫技術支援。
        </Alert>
      )}

      {scanning && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography>正在掃描韌體版本...</Typography>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress variant="determinate" value={scanProgress} />
            </Box>
            <Typography variant="body2">{scanProgress}%</Typography>
          </Box>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 系統資訊 */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                系統資訊
              </Typography>
              
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell><strong>設備型號</strong></TableCell>
                    <TableCell>{systemInfo.deviceModel}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>序號</strong></TableCell>
                    <TableCell>{systemInfo.serialNumber}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>硬體版本</strong></TableCell>
                    <TableCell>{systemInfo.hardwareRevision}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Bootloader</strong></TableCell>
                    <TableCell>{systemInfo.bootloaderVersion}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>系統運行時間</strong></TableCell>
                    <TableCell>{systemInfo.systemUptime}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>最後掃描時間</strong></TableCell>
                    <TableCell>{systemInfo.lastUpdateDate}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              <Box mt={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={scanFirmware}
                  disabled={scanning}
                >
                  {scanning ? '掃描中...' : '重新掃描'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 韌體模組列表 */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                韌體模組清單
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>模組名稱</TableCell>
                      <TableCell>版本</TableCell>
                      <TableCell>建置日期</TableCell>
                      <TableCell>狀態</TableCell>
                      <TableCell>大小</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {firmwareList.map((firmware) => (
                      <TableRow key={firmware.module}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            {getStatusIcon(firmware.status)}
                            <Box ml={1}>
                              <Typography variant="body2" fontWeight="bold">
                                {firmware.moduleName}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {firmware.description}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {firmware.currentVersion}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {firmware.buildDate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={getStatusColor(firmware.status) as any}
                            label={getStatusText(firmware.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {firmware.size}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="查看詳細資訊">
                            <IconButton
                              size="small"
                              onClick={() => setDetailDialog({
                                open: true,
                                firmware
                              })}
                            >
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 韌體詳細資訊對話框 */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          韌體詳細資訊 - {detailDialog.firmware?.moduleName}
        </DialogTitle>
        <DialogContent>
          {detailDialog.firmware && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    模組 ID
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {detailDialog.firmware.module}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    當前版本
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {detailDialog.firmware.currentVersion}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    建置日期
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {detailDialog.firmware.buildDate}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    檔案大小
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {detailDialog.firmware.size}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    校驗碼 (MD5)
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ fontFamily: 'monospace' }}>
                    {detailDialog.firmware.checksum}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    狀態
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(detailDialog.firmware.status)}
                    <Chip
                      color={getStatusColor(detailDialog.firmware.status) as any}
                      label={getStatusText(detailDialog.firmware.status)}
                      size="small"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    描述
                  </Typography>
                  <Typography variant="body1">
                    {detailDialog.firmware.description}
                  </Typography>
                </Grid>
              </Grid>
              
              {detailDialog.firmware.status === 'outdated' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  此模組的韌體版本較舊，建議前往韌體更新頁面進行更新以獲得最新功能和安全修復。
                </Alert>
              )}
              
              {detailDialog.firmware.status === 'error' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  此模組存在韌體錯誤，可能影響系統正常運行。請聯繫技術支援或嘗試重新安裝韌體。
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false })}>
            關閉
          </Button>
        </DialogActions>
      </Dialog>

      {/* 操作說明 */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>使用說明：</strong>
          <br />
          • 點擊「重新掃描」按鈕可以重新檢查所有模組的韌體版本
          <br />
          • 點擊資訊圖示可以查看各模組的詳細韌體資訊
          <br />
          • 如需更新韌體，請前往「韌體更新」頁面
        </Typography>
      </Alert>
    </Box>
  );
};

export default FWStatusTab;