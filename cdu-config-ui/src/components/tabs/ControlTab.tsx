import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

// 控制模式類型定義
type ControlMode = 'stop' | 'auto' | 'manual';
type AutoMode = 'pressure_diff' | 'flow_rate' | 'temperature';

interface ControlSettings {
  mode: ControlMode;
  autoMode: AutoMode;
  
  // 自動模式參數
  targetPressureDiff: number;    // 50-150 KPA
  targetFlowRate: number;        // 10-200 LPM
  targetTemperature: number;     // 20-60°C
  liquidTempControlEnabled: boolean;
  
  // 手動模式參數
  pumpLeftLoad: number;          // 0-100%
  pumpRightLoad: number;         // 0-100%
  hexValvePosition: number;      // 0-100%
  unifiedPumpControl: boolean;
  
  // 運行狀態
  isRunning: boolean;
  startTime?: Date;
}

interface SystemStatus {
  currentPressureDiff: number;
  currentFlowRate: number;
  currentTemperature: number;
  pumpLeftRPM: number;
  pumpRightRPM: number;
  systemHealth: 'normal' | 'warning' | 'error';
}

const ControlTab: React.FC = () => {
  const [controlSettings, setControlSettings] = useState<ControlSettings>({
    mode: 'stop',
    autoMode: 'pressure_diff',
    targetPressureDiff: 100,
    targetFlowRate: 50,
    targetTemperature: 25,
    liquidTempControlEnabled: false,
    pumpLeftLoad: 0,
    pumpRightLoad: 0,
    hexValvePosition: 50,
    unifiedPumpControl: true,
    isRunning: false
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    currentPressureDiff: 0,
    currentFlowRate: 0,
    currentTemperature: 22.5,
    pumpLeftRPM: 0,
    pumpRightRPM: 0,
    systemHealth: 'normal'
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'start' | 'stop' | 'mode_change';
    title: string;
    message: string;
  }>({
    open: false,
    action: 'start',
    title: '',
    message: ''
  });

  // 模擬系統狀態更新
  useEffect(() => {
    const interval = setInterval(() => {
      if (controlSettings.isRunning) {
        setSystemStatus(prev => ({
          ...prev,
          currentPressureDiff: controlSettings.mode === 'auto' && controlSettings.autoMode === 'pressure_diff'
            ? controlSettings.targetPressureDiff + (Math.random() - 0.5) * 5
            : prev.currentPressureDiff + (Math.random() - 0.5) * 2,
          currentFlowRate: controlSettings.mode === 'auto' && controlSettings.autoMode === 'flow_rate'
            ? controlSettings.targetFlowRate + (Math.random() - 0.5) * 3
            : prev.currentFlowRate + (Math.random() - 0.5) * 1,
          currentTemperature: prev.currentTemperature + (Math.random() - 0.5) * 0.1,
          pumpLeftRPM: controlSettings.mode === 'manual'
            ? (controlSettings.pumpLeftLoad / 100) * 1500 + (Math.random() - 0.5) * 20
            : Math.max(500, prev.pumpLeftRPM + (Math.random() - 0.5) * 30),
          pumpRightRPM: controlSettings.mode === 'manual'
            ? (controlSettings.pumpRightLoad / 100) * 1500 + (Math.random() - 0.5) * 20
            : Math.max(500, prev.pumpRightRPM + (Math.random() - 0.5) * 30)
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [controlSettings]);

  // 更新控制設定
  const updateControlSettings = (field: keyof ControlSettings, value: any) => {
    setControlSettings(prev => ({ ...prev, [field]: value }));
  };

  // 開始運行確認
  const handleStart = () => {
    setConfirmDialog({
      open: true,
      action: 'start',
      title: '確認開始運行',
      message: `確定要以${controlSettings.mode === 'auto' ? '自動' : '手動'}模式開始運行系統嗎？`
    });
  };

  // 停止運行確認
  const handleStop = () => {
    setConfirmDialog({
      open: true,
      action: 'stop',
      title: '確認停止運行',
      message: '確定要停止系統運行嗎？這將關閉所有泵浦。'
    });
  };

  // 模式變更確認
  const handleModeChange = (newMode: ControlMode) => {
    if (controlSettings.isRunning) {
      setConfirmDialog({
        open: true,
        action: 'mode_change',
        title: '確認模式變更',
        message: `系統正在運行中，變更為${newMode === 'auto' ? '自動' : '手動'}模式需要先停止系統。是否繼續？`
      });
    } else {
      updateControlSettings('mode', newMode);
    }
  };

  // 執行確認的動作
  const executeConfirmedAction = async () => {
    try {
      switch (confirmDialog.action) {
        case 'start':
          updateControlSettings('isRunning', true);
          updateControlSettings('startTime', new Date());
          break;
        case 'stop':
          updateControlSettings('isRunning', false);
          updateControlSettings('startTime', undefined);
          // 重置系統狀態
          setSystemStatus(prev => ({
            ...prev,
            currentPressureDiff: 0,
            currentFlowRate: 0,
            pumpLeftRPM: 0,
            pumpRightRPM: 0
          }));
          break;
        case 'mode_change':
          updateControlSettings('isRunning', false);
          updateControlSettings('startTime', undefined);
          // 在這裡應該執行實際的模式變更
          break;
      }
    } catch (error) {
      console.error('執行操作失敗:', error);
    } finally {
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  const getModeColor = (mode: ControlMode) => {
    switch (mode) {
      case 'stop':
        return 'default';
      case 'auto':
        return 'success';
      case 'manual':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusColor = (health: string) => {
    switch (health) {
      case 'normal':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        系統控制
      </Typography>

      {/* 系統狀態概覽 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6">系統狀態:</Typography>
                <Chip
                  color={getModeColor(controlSettings.mode) as any}
                  label={
                    controlSettings.mode === 'stop' ? '停止' :
                    controlSettings.mode === 'auto' ? '自動運行' : '手動運行'
                  }
                />
              </Box>
              {controlSettings.isRunning && controlSettings.startTime && (
                <Typography variant="body2" color="textSecondary">
                  運行時間: {Math.floor((Date.now() - controlSettings.startTime.getTime()) / 60000)} 分鐘
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="textSecondary">差壓</Typography>
                  <Typography variant="h6">
                    {systemStatus.currentPressureDiff.toFixed(1)} KPA
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="textSecondary">流量</Typography>
                  <Typography variant="h6">
                    {systemStatus.currentFlowRate.toFixed(1)} LPM
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="textSecondary">溫度</Typography>
                  <Typography variant="h6">
                    {systemStatus.currentTemperature.toFixed(1)} °C
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Box display="flex" gap={1}>
                {!controlSettings.isRunning ? (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PlayIcon />}
                    onClick={handleStart}
                    disabled={controlSettings.mode === 'stop'}
                  >
                    開始運行
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={handleStop}
                  >
                    停止運行
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* 運行模式選擇 */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                運行模式選擇
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>控制模式</InputLabel>
                <Select
                  value={controlSettings.mode}
                  onChange={(e) => handleModeChange(e.target.value as ControlMode)}
                  disabled={controlSettings.isRunning}
                >
                  <MenuItem value="stop">停止模式</MenuItem>
                  <MenuItem value="auto">自動模式</MenuItem>
                  <MenuItem value="manual">手動模式</MenuItem>
                </Select>
              </FormControl>

              {controlSettings.mode === 'auto' && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    自動控制參數
                  </Typography>
                  
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>自動模式類型</InputLabel>
                    <Select
                      value={controlSettings.autoMode}
                      onChange={(e) => updateControlSettings('autoMode', e.target.value)}
                      disabled={controlSettings.isRunning}
                    >
                      <MenuItem value="pressure_diff">差壓控制</MenuItem>
                      <MenuItem value="flow_rate">流量控制</MenuItem>
                      <MenuItem value="temperature">溫度控制</MenuItem>
                    </Select>
                  </FormControl>

                  {controlSettings.autoMode === 'pressure_diff' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography gutterBottom>
                        目標差壓: {controlSettings.targetPressureDiff} KPA
                      </Typography>
                      <Slider
                        value={controlSettings.targetPressureDiff}
                        onChange={(_, value) => updateControlSettings('targetPressureDiff', value)}
                        min={50}
                        max={150}
                        step={5}
                        marks={[
                          { value: 50, label: '50' },
                          { value: 100, label: '100' },
                          { value: 150, label: '150' }
                        ]}
                        disabled={controlSettings.isRunning}
                      />
                    </Box>
                  )}

                  {controlSettings.autoMode === 'flow_rate' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography gutterBottom>
                        目標流量: {controlSettings.targetFlowRate} LPM
                      </Typography>
                      <Slider
                        value={controlSettings.targetFlowRate}
                        onChange={(_, value) => updateControlSettings('targetFlowRate', value)}
                        min={10}
                        max={200}
                        step={5}
                        marks={[
                          { value: 10, label: '10' },
                          { value: 100, label: '100' },
                          { value: 200, label: '200' }
                        ]}
                        disabled={controlSettings.isRunning}
                      />
                    </Box>
                  )}

                  {controlSettings.autoMode === 'temperature' && (
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography gutterBottom>
                          目標溫度: {controlSettings.targetTemperature} °C
                        </Typography>
                        <Slider
                          value={controlSettings.targetTemperature}
                          onChange={(_, value) => updateControlSettings('targetTemperature', value)}
                          min={20}
                          max={60}
                          step={1}
                          marks={[
                            { value: 20, label: '20°C' },
                            { value: 40, label: '40°C' },
                            { value: 60, label: '60°C' }
                          ]}
                          disabled={controlSettings.isRunning}
                        />
                      </Box>
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={controlSettings.liquidTempControlEnabled}
                            onChange={(e) => updateControlSettings('liquidTempControlEnabled', e.target.checked)}
                            disabled={controlSettings.isRunning}
                          />
                        }
                        label="啟用液體溫度控制"
                      />
                    </>
                  )}
                </>
              )}

              {controlSettings.mode === 'manual' && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    手動控制參數
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={controlSettings.unifiedPumpControl}
                        onChange={(e) => updateControlSettings('unifiedPumpControl', e.target.checked)}
                        disabled={controlSettings.isRunning}
                      />
                    }
                    label="統一泵浦控制"
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>
                      左泵負載: {controlSettings.pumpLeftLoad}%
                    </Typography>
                    <Slider
                      value={controlSettings.pumpLeftLoad}
                      onChange={(_, value) => {
                        updateControlSettings('pumpLeftLoad', value);
                        if (controlSettings.unifiedPumpControl) {
                          updateControlSettings('pumpRightLoad', value);
                        }
                      }}
                      min={0}
                      max={100}
                      step={5}
                      marks={[
                        { value: 0, label: '0%' },
                        { value: 50, label: '50%' },
                        { value: 100, label: '100%' }
                      ]}
                      disabled={controlSettings.isRunning}
                    />
                  </Box>

                  {!controlSettings.unifiedPumpControl && (
                    <Box sx={{ mb: 2 }}>
                      <Typography gutterBottom>
                        右泵負載: {controlSettings.pumpRightLoad}%
                      </Typography>
                      <Slider
                        value={controlSettings.pumpRightLoad}
                        onChange={(_, value) => updateControlSettings('pumpRightLoad', value)}
                        min={0}
                        max={100}
                        step={5}
                        marks={[
                          { value: 0, label: '0%' },
                          { value: 50, label: '50%' },
                          { value: 100, label: '100%' }
                        ]}
                        disabled={controlSettings.isRunning}
                      />
                    </Box>
                  )}

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>
                      HEX 閥門開度: {controlSettings.hexValvePosition}%
                    </Typography>
                    <Slider
                      value={controlSettings.hexValvePosition}
                      onChange={(_, value) => updateControlSettings('hexValvePosition', value)}
                      min={0}
                      max={100}
                      step={5}
                      marks={[
                        { value: 0, label: '0%' },
                        { value: 50, label: '50%' },
                        { value: 100, label: '100%' }
                      ]}
                      disabled={controlSettings.isRunning}
                    />
                  </Box>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    泵浦在 10% 以上開始運行，0% 或低於 10% 時停止
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 即時監控數據 */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                即時監控數據
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      左泵轉速
                    </Typography>
                    <Typography variant="h5" color="primary">
                      {systemStatus.pumpLeftRPM.toFixed(0)} RPM
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      右泵轉速
                    </Typography>
                    <Typography variant="h5" color="primary">
                      {systemStatus.pumpRightRPM.toFixed(0)} RPM
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      系統差壓
                    </Typography>
                    <Typography variant="h5" color="secondary">
                      {systemStatus.currentPressureDiff.toFixed(1)} KPA
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      系統流量
                    </Typography>
                    <Typography variant="h5" color="secondary">
                      {systemStatus.currentFlowRate.toFixed(1)} LPM
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                系統健康狀態
              </Typography>
              <Chip
                color={getStatusColor(systemStatus.systemHealth) as any}
                label={
                  systemStatus.systemHealth === 'normal' ? '正常' :
                  systemStatus.systemHealth === 'warning' ? '警告' : '錯誤'
                }
                icon={systemStatus.systemHealth === 'warning' ? <WarningIcon /> : undefined}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 確認對話框 */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
            取消
          </Button>
          <Button onClick={executeConfirmedAction} variant="contained">
            確認
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ControlTab;