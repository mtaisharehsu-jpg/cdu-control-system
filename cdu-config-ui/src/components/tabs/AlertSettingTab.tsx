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
  Divider,
  Alert,
  Slider,
  Paper,
  Tabs,
  Tab,
  Chip,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Restore as RestoreIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Import alarm management API functions
import {
  getActiveAlarms,
  getAlarmStatistics,
  getAlarmHistory,
  getCDUAlarmRegisters,
  acknowledgeAlarm,
  clearAlarm,
  updateAlarmThresholds,
  updateSNMPSettings,
  testSNMPConnection,
  AlarmResponse,
  AlarmStatistics as AlarmStatsType,
  AlarmHistoryItem,
  AlarmsResponse,
  AlarmThresholdUpdate,
  SNMPSettings
} from '../../api/cduApi';

// 警報設定類型定義
interface AlertThreshold {
  id: string;
  name: string;
  unit: string;
  warningMin: number;
  warningMax: number;
  alertMin: number;
  alertMax: number;
  enabled: boolean;
  currentValue?: number;
}

interface SNMPSettings {
  enabled: boolean;
  version: 'v1' | 'v2c' | 'v3';
  community: string;
  trapDestination: string;
  port: number;
  securityLevel?: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
  authProtocol?: 'MD5' | 'SHA';
  authPassword?: string;
  privProtocol?: 'DES' | 'AES';
  privPassword?: string;
  warningInterval: number; // 警告發送間隔 (秒)
  alertInterval: number;   // 警報發送間隔 (秒)
}

// Tab Panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`alert-tabpanel-${index}`}
      aria-labelledby={`alert-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `alert-tab-${index}`,
    'aria-controls': `alert-tabpanel-${index}`,
  };
}

const AlertSettingTab: React.FC = () => {
  // Tab management
  const [currentTab, setCurrentTab] = useState(0);
  
  // Original threshold settings state (for Settings tab)
  const [alertThresholds, setAlertThresholds] = useState<AlertThreshold[]>([
    {
      id: 'temp_server_from',
      name: '伺服器入口溫度',
      unit: '°C',
      warningMin: 15,
      warningMax: 35,
      alertMin: 10,
      alertMax: 40,
      enabled: true,
      currentValue: 25.5
    },
    {
      id: 'temp_server_to',
      name: '伺服器出口溫度',
      unit: '°C',
      warningMin: 18,
      warningMax: 38,
      alertMin: 13,
      alertMax: 43,
      enabled: true,
      currentValue: 28.2
    },
    {
      id: 'press_server_diff',
      name: '伺服器差壓',
      unit: 'KPA',
      warningMin: 40,
      warningMax: 160,
      alertMin: 30,
      alertMax: 170,
      enabled: true,
      currentValue: 70
    },
    {
      id: 'flow_server',
      name: '伺服器流量',
      unit: 'LPM',
      warningMin: 15,
      warningMax: 190,
      alertMin: 5,
      alertMax: 200,
      enabled: true,
      currentValue: 45.2
    },
    {
      id: 'dewpoint_facility',
      name: '設施露點溫度',
      unit: '°C',
      warningMin: -10,
      warningMax: 25,
      alertMin: -15,
      alertMax: 30,
      enabled: true,
      currentValue: 12.5
    }
  ]);

  const [snmpSettings, setSNMPSettings] = useState<SNMPSettings>({
    enabled: true,
    version: 'v2c',
    community: 'public',
    trapDestination: '192.168.100.100',
    port: 162,
    warningInterval: 30,
    alertInterval: 10
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // New alarm management states
  const [activeAlarms, setActiveAlarms] = useState<AlarmResponse[]>([]);
  const [alarmHistory, setAlarmHistory] = useState<AlarmHistoryItem[]>([]);
  const [alarmStats, setAlarmStats] = useState<AlarmStatsType | null>(null);
  const [cduAlarmData, setCduAlarmData] = useState<AlarmsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Pagination states
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
  
  // Date filters for history
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // 更新警報閾值
  const updateThreshold = (id: string, field: keyof AlertThreshold, value: any) => {
    setAlertThresholds(prev => prev.map(threshold => 
      threshold.id === id ? { ...threshold, [field]: value } : threshold
    ));
  };

  // 驗證閾值設定的合理性
  const validateThreshold = (threshold: AlertThreshold): string[] => {
    const errors: string[] = [];
    
    if (threshold.alertMin >= threshold.warningMin) {
      errors.push('警報最小值必須小於警告最小值');
    }
    if (threshold.warningMin >= threshold.warningMax) {
      errors.push('警告最小值必須小於警告最大值');
    }
    if (threshold.warningMax >= threshold.alertMax) {
      errors.push('警告最大值必須小於警報最大值');
    }
    
    return errors;
  };

  // 儲存設定
  const handleSave = async () => {
    setSaveStatus('saving');
    
    // 驗證所有閾值
    let hasErrors = false;
    alertThresholds.forEach(threshold => {
      const errors = validateThreshold(threshold);
      if (errors.length > 0) {
        hasErrors = true;
        console.error(`閾值設定錯誤 (${threshold.name}):`, errors);
      }
    });
    
    if (hasErrors) {
      setSaveStatus('error');
      return;
    }
    
    try {
      // 模擬API調用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 這裡應該調用實際的API來儲存設定
      // await api.saveAlertSettings({ alertThresholds, snmpSettings });
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('儲存設定失敗:', error);
      setSaveStatus('error');
    }
  };

  // 恢復預設值
  const handleRestore = () => {
    if (confirm('確定要恢復所有警報設定為預設值嗎？')) {
      // 恢復預設設定的邏輯
      setSaveStatus('idle');
    }
  };

  // New alarm management functions
  const fetchActiveAlarms = async () => {
    try {
      setLoading(true);
      const alarms = await getActiveAlarms();
      setActiveAlarms(alarms);
    } catch (error) {
      console.error('Error fetching active alarms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlarmHistory = async () => {
    try {
      setLoading(true);
      const history = await getAlarmHistory(
        historyStartDate || undefined,
        historyEndDate || undefined,
        100
      );
      setAlarmHistory(history);
    } catch (error) {
      console.error('Error fetching alarm history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlarmStats = async () => {
    try {
      const stats = await getAlarmStatistics();
      setAlarmStats(stats);
    } catch (error) {
      console.error('Error fetching alarm statistics:', error);
    }
  };

  const fetchCDUAlarmData = async () => {
    try {
      setLoading(true);
      const data = await getCDUAlarmRegisters();
      setCduAlarmData(data);
    } catch (error) {
      console.error('Error fetching CDU alarm data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlarm = async (alarmId: string) => {
    try {
      await acknowledgeAlarm(alarmId);
      // Refresh active alarms
      await fetchActiveAlarms();
    } catch (error) {
      console.error('Error acknowledging alarm:', error);
    }
  };

  const handleClearAlarm = async (alarmId: string) => {
    try {
      await clearAlarm(alarmId);
      // Refresh active alarms
      await fetchActiveAlarms();
    } catch (error) {
      console.error('Error clearing alarm:', error);
    }
  };

  const handleTestSNMP = async () => {
    try {
      const result = await testSNMPConnection();
      alert(result.message);
    } catch (error) {
      console.error('Error testing SNMP:', error);
      alert('SNMP 測試失敗');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    
    // Load data when switching to specific tabs
    switch (newValue) {
      case 1: // Real-time Alarms tab
        fetchCDUAlarmData();
        break;
      case 2: // Alarm History tab
        fetchAlarmHistory();
        break;
      case 3: // Statistics tab
        fetchAlarmStats();
        fetchActiveAlarms();
        break;
    }
  };

  // Load initial data
  useEffect(() => {
    if (currentTab === 1) {
      fetchCDUAlarmData();
    } else if (currentTab === 2) {
      fetchAlarmHistory();
    } else if (currentTab === 3) {
      fetchAlarmStats();
      fetchActiveAlarms();
    }
  }, [currentTab, historyStartDate, historyEndDate]);

  const ThresholdSlider: React.FC<{ threshold: AlertThreshold }> = ({ threshold }) => {
    const minValue = Math.min(threshold.alertMin - 10, 0);
    const maxValue = Math.max(threshold.alertMax + 10, 100);
    const values = [threshold.alertMin, threshold.warningMin, threshold.warningMax, threshold.alertMax];
    
    return (
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="body2" gutterBottom>
          閾值視覺化: {threshold.name}
        </Typography>
        <Box sx={{ position: 'relative', height: 40 }}>
          {/* 背景區域 */}
          <Box
            sx={{
              position: 'absolute',
              top: 15,
              left: `${((threshold.alertMin - minValue) / (maxValue - minValue)) * 100}%`,
              width: `${((threshold.warningMin - threshold.alertMin) / (maxValue - minValue)) * 100}%`,
              height: 10,
              backgroundColor: 'error.light',
              opacity: 0.3
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 15,
              left: `${((threshold.warningMin - minValue) / (maxValue - minValue)) * 100}%`,
              width: `${((threshold.warningMax - threshold.warningMin) / (maxValue - minValue)) * 100}%`,
              height: 10,
              backgroundColor: 'success.light',
              opacity: 0.3
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 15,
              left: `${((threshold.warningMax - minValue) / (maxValue - minValue)) * 100}%`,
              width: `${((threshold.alertMax - threshold.warningMax) / (maxValue - minValue)) * 100}%`,
              height: 10,
              backgroundColor: 'error.light',
              opacity: 0.3
            }}
          />
          
          {/* 當前值指示器 */}
          {threshold.currentValue && (
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                left: `${((threshold.currentValue - minValue) / (maxValue - minValue)) * 100}%`,
                width: 2,
                height: 20,
                backgroundColor: 'primary.main'
              }}
            />
          )}
        </Box>
        
        <Box display="flex" justifyContent="space-between" mt={1}>
          <Typography variant="caption">
            警報: {threshold.alertMin} - {threshold.alertMax} {threshold.unit}
          </Typography>
          <Typography variant="caption">
            警告: {threshold.warningMin} - {threshold.warningMax} {threshold.unit}
          </Typography>
          {threshold.currentValue && (
            <Typography variant="caption" color="primary">
              目前: {threshold.currentValue.toFixed(1)} {threshold.unit}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        警報管理系統
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="alarm management tabs"
          >
            <Tab 
              icon={<SettingsIcon />} 
              label="設定" 
              {...a11yProps(0)} 
              sx={{ minHeight: 64 }}
            />
            <Tab 
              icon={
                <Badge badgeContent={cduAlarmData?.active_alarms?.length || 0} color="error">
                  <NotificationsIcon />
                </Badge>
              } 
              label="即時警報" 
              {...a11yProps(1)}
              sx={{ minHeight: 64 }}
            />
            <Tab 
              icon={<HistoryIcon />} 
              label="警報歷史" 
              {...a11yProps(2)}
              sx={{ minHeight: 64 }}
            />
            <Tab 
              icon={<AssessmentIcon />} 
              label="統計報表" 
              {...a11yProps(3)}
              sx={{ minHeight: 64 }}
            />
          </Tabs>
        </Box>

        {/* 設定標籤 - 原有的閾值和SNMP設定 */}
        <TabPanel value={currentTab} index={0}>
          {/* 儲存狀態提示 */}
          {saveStatus === 'saved' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              設定已成功儲存
            </Alert>
          )}
          {saveStatus === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              儲存設定時發生錯誤，請檢查設定值是否正確
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* 警報閾值設定 */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    感測器警報閾值設定
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    設定範圍：警報最小值 ≤ 警告最小值 &lt; 警告最大值 ≤ 警報最大值
                  </Typography>
                  
                  {alertThresholds.map((threshold, index) => (
                    <Paper key={threshold.id} sx={{ p: 2, mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1">
                          {threshold.name} ({threshold.unit})
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={threshold.enabled}
                              onChange={(e) => updateThreshold(threshold.id, 'enabled', e.target.checked)}
                            />
                          }
                          label="啟用"
                        />
                      </Box>
                      
                      {threshold.enabled && (
                        <>
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={3}>
                              <TextField
                                fullWidth
                                label="警報最小值"
                                type="number"
                                value={threshold.alertMin}
                                onChange={(e) => updateThreshold(threshold.id, 'alertMin', parseFloat(e.target.value))}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={3}>
                              <TextField
                                fullWidth
                                label="警告最小值"
                                type="number"
                                value={threshold.warningMin}
                                onChange={(e) => updateThreshold(threshold.id, 'warningMin', parseFloat(e.target.value))}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={3}>
                              <TextField
                                fullWidth
                                label="警告最大值"
                                type="number"
                                value={threshold.warningMax}
                                onChange={(e) => updateThreshold(threshold.id, 'warningMax', parseFloat(e.target.value))}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={3}>
                              <TextField
                                fullWidth
                                label="警報最大值"
                                type="number"
                                value={threshold.alertMax}
                                onChange={(e) => updateThreshold(threshold.id, 'alertMax', parseFloat(e.target.value))}
                                size="small"
                              />
                            </Grid>
                          </Grid>
                          
                          <ThresholdSlider threshold={threshold} />
                        </>
                      )}
                    </Paper>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* SNMP 設定 */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    SNMP Trap 設定
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={snmpSettings.enabled}
                        onChange={(e) => setSNMPSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                      />
                    }
                    label="啟用 SNMP Trap"
                    sx={{ mb: 2 }}
                  />
                  
                  {snmpSettings.enabled && (
                    <>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>SNMP 版本</InputLabel>
                        <Select
                          value={snmpSettings.version}
                          onChange={(e) => setSNMPSettings(prev => ({ ...prev, version: e.target.value as any }))}
                        >
                          <MenuItem value="v1">SNMP v1</MenuItem>
                          <MenuItem value="v2c">SNMP v2c</MenuItem>
                          <MenuItem value="v3">SNMP v3</MenuItem>
                        </Select>
                      </FormControl>
                      
                      {(snmpSettings.version === 'v1' || snmpSettings.version === 'v2c') && (
                        <TextField
                          fullWidth
                          label="Community"
                          value={snmpSettings.community}
                          onChange={(e) => setSNMPSettings(prev => ({ ...prev, community: e.target.value }))}
                          sx={{ mb: 2 }}
                        />
                      )}
                      
                      <TextField
                        fullWidth
                        label="Trap 目標 IP"
                        value={snmpSettings.trapDestination}
                        onChange={(e) => setSNMPSettings(prev => ({ ...prev, trapDestination: e.target.value }))}
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="埠號"
                        type="number"
                        value={snmpSettings.port}
                        onChange={(e) => setSNMPSettings(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                        sx={{ mb: 2 }}
                      />
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle2" gutterBottom>
                        發送頻率設定
                      </Typography>
                      
                      <TextField
                        fullWidth
                        label="警告發送間隔 (秒)"
                        type="number"
                        value={snmpSettings.warningInterval}
                        onChange={(e) => setSNMPSettings(prev => ({ ...prev, warningInterval: parseInt(e.target.value) }))}
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="警報發送間隔 (秒)"
                        type="number"
                        value={snmpSettings.alertInterval}
                        onChange={(e) => setSNMPSettings(prev => ({ ...prev, alertInterval: parseInt(e.target.value) }))}
                        sx={{ mb: 2 }}
                      />

                      <Box display="flex" gap={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleTestSNMP}
                        >
                          測試 SNMP
                        </Button>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 操作按鈕 */}
          <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleRestore}
            >
              恢復預設值
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '儲存中...' : '儲存設定'}
            </Button>
          </Box>
        </TabPanel>

        {/* 即時警報標籤 - 80個異常代碼顯示 */}
        <TabPanel value={currentTab} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              CDU 異常代碼監控 (R10001-R10005)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchCDUAlarmData}
              disabled={loading}
            >
              刷新
            </Button>
          </Box>

          {cduAlarmData && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      {cduAlarmData.alarm_summary.total_alarms}
                    </Typography>
                    <Typography variant="body2">
                      總異常數量
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="error">
                      {cduAlarmData.alarm_summary.critical_alarms_count}
                    </Typography>
                    <Typography variant="body2">
                      關鍵異常
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Chip
                      label={cduAlarmData.alarm_summary.overall_status}
                      color={
                        cduAlarmData.alarm_summary.severity === 'Critical' ? 'error' :
                        cduAlarmData.alarm_summary.severity === 'Major' ? 'warning' :
                        cduAlarmData.alarm_summary.severity === 'Minor' ? 'info' : 'success'
                      }
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      整體狀態
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="info">
                      {cduAlarmData.alarm_summary.category_counts.pump_alarms || 0}
                    </Typography>
                    <Typography variant="body2">
                      水泵異常
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* 活躍異常列表 */}
          {cduAlarmData?.active_alarms && cduAlarmData.active_alarms.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  活躍異常 ({cduAlarmData.active_alarms.length} 項)
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>異常代碼</TableCell>
                        <TableCell>異常名稱</TableCell>
                        <TableCell>暫存器</TableCell>
                        <TableCell>位元位置</TableCell>
                        <TableCell>狀態</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cduAlarmData.active_alarms.map((alarm) => (
                        <TableRow key={alarm.alarm_code}>
                          <TableCell>
                            <Chip 
                              label={alarm.alarm_code} 
                              color="error" 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>{alarm.name}</TableCell>
                          <TableCell>R{alarm.register}</TableCell>
                          <TableCell>bit{alarm.bit_position}</TableCell>
                          <TableCell>
                            <Chip 
                              label={alarm.status} 
                              color="error" 
                              size="small"
                              icon={<ErrorIcon />}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {(!cduAlarmData?.active_alarms || cduAlarmData.active_alarms.length === 0) && (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  系統正常運行
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  目前沒有檢測到任何異常
                </Typography>
              </CardContent>
            </Card>
          )}
        </TabPanel>

        {/* 警報歷史標籤 */}
        <TabPanel value={currentTab} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              警報歷史記錄
            </Typography>
            <Box display="flex" gap={1}>
              <TextField
                label="開始日期"
                type="date"
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                label="結束日期"
                type="date"
                value={historyEndDate}
                onChange={(e) => setHistoryEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchAlarmHistory}
                disabled={loading}
              >
                查詢
              </Button>
            </Box>
          </Box>

          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>時間</TableCell>
                      <TableCell>警報ID</TableCell>
                      <TableCell>名稱</TableCell>
                      <TableCell>類別</TableCell>
                      <TableCell>等級</TableCell>
                      <TableCell>狀態</TableCell>
                      <TableCell>清除時間</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alarmHistory
                      .slice(historyPage * historyRowsPerPage, historyPage * historyRowsPerPage + historyRowsPerPage)
                      .map((alarm, index) => (
                      <TableRow key={`${alarm.alarm_id}-${alarm.timestamp}-${index}`}>
                        <TableCell>
                          {new Date(alarm.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{alarm.alarm_id}</TableCell>
                        <TableCell>{alarm.name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={alarm.category} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={alarm.level} 
                            color={
                              alarm.level === 'Critical' ? 'error' :
                              alarm.level === 'Warning' ? 'warning' : 'info'
                            }
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            {alarm.acknowledged && (
                              <Chip label="已確認" color="info" size="small" />
                            )}
                            {alarm.cleared && (
                              <Chip label="已清除" color="success" size="small" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {alarm.clear_timestamp ? 
                            new Date(alarm.clear_timestamp).toLocaleString() : 
                            '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={alarmHistory.length}
                rowsPerPage={historyRowsPerPage}
                page={historyPage}
                onPageChange={(event, newPage) => setHistoryPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setHistoryRowsPerPage(parseInt(event.target.value, 10));
                  setHistoryPage(0);
                }}
              />
            </CardContent>
          </Card>
        </TabPanel>

        {/* 統計報表標籤 */}
        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" gutterBottom>
            警報統計分析
          </Typography>

          {alarmStats && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      當前狀態
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box textAlign="center">
                          <Typography variant="h3" color="primary">
                            {alarmStats.total_active}
                          </Typography>
                          <Typography variant="body2">
                            活躍警報
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box textAlign="center">
                          <Typography variant="h3" color="success">
                            {alarmStats.total_acknowledged}
                          </Typography>
                          <Typography variant="body2">
                            已確認警報
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      今日統計
                    </Typography>
                    <Box textAlign="center">
                      <Typography variant="h3" color="warning">
                        {alarmStats.total_today}
                      </Typography>
                      <Typography variant="body2">
                        今日警報總數
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      按類別統計
                    </Typography>
                    <Grid container spacing={2}>
                      {Object.entries(alarmStats.by_category).map(([category, count]) => (
                        <Grid item xs={6} sm={4} md={3} key={category}>
                          <Box textAlign="center">
                            <Typography variant="h4">
                              {count}
                            </Typography>
                            <Typography variant="body2">
                              {category}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      按等級統計
                    </Typography>
                    <Grid container spacing={2}>
                      {Object.entries(alarmStats.by_level).map(([level, count]) => (
                        <Grid item xs={6} sm={4} md={3} key={level}>
                          <Box textAlign="center">
                            <Typography 
                              variant="h4"
                              color={
                                level === 'Critical' ? 'error' :
                                level === 'Warning' ? 'warning' : 'info'
                              }
                            >
                              {count}
                            </Typography>
                            <Typography variant="body2">
                              {level}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AlertSettingTab;