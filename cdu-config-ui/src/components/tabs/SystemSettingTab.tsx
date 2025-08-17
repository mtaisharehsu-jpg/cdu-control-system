import React, { useState } from 'react';
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
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Restore as RestoreIcon,
  Visibility,
  VisibilityOff,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
// Date picker removed due to compatibility issues
// Using standard TextField for date/time input

// 系統設定類型定義
interface SystemSettings {
  // 單位設定
  temperatureUnit: 'celsius' | 'fahrenheit';
  pressureUnit: 'mpa' | 'psi';
  flowUnit: 'lpm' | 'gpm';
  
  // 冷卻液特性
  coolantType: string;
  coolantDensity: number;        // kg/m³
  coolantViscosity: number;      // cP
  coolantSpecificHeat: number;   // kJ/kg·K
  
  // 密碼設定
  adminPassword: string;
  userPassword: string;
  passwordExpiration: boolean;
  passwordExpirationDays: number;
  
  // 日期時間設定
  dateTime: Date;
  timezone: string;
  ntpEnabled: boolean;
  ntpServer: string;
  
  // 系統維護
  autoBackup: boolean;
  backupInterval: number;        // days
  logRetentionDays: number;
  
  // 顯示設定
  language: string;
  screenBrightness: number;      // 0-100%
  screenTimeout: number;         // minutes
}

const SystemSettingTab: React.FC = () => {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    temperatureUnit: 'celsius',
    pressureUnit: 'mpa',
    flowUnit: 'lpm',
    coolantType: 'Water',
    coolantDensity: 1000,
    coolantViscosity: 1.0,
    coolantSpecificHeat: 4.18,
    adminPassword: '',
    userPassword: '',
    passwordExpiration: true,
    passwordExpirationDays: 90,
    dateTime: new Date(),
    timezone: 'Asia/Taipei',
    ntpEnabled: true,
    ntpServer: 'pool.ntp.org',
    autoBackup: true,
    backupInterval: 7,
    logRetentionDays: 730,
    language: 'zh-TW',
    screenBrightness: 80,
    screenTimeout: 30
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPasswords, setShowPasswords] = useState({
    admin: false,
    user: false
  });
  const [passwordChangeDialog, setPasswordChangeDialog] = useState({
    open: false,
    type: 'admin' as 'admin' | 'user',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 更新系統設定
  const updateSystemSettings = (field: keyof SystemSettings, value: any) => {
    setSystemSettings(prev => ({ ...prev, [field]: value }));
  };

  // 儲存系統設定
  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 這裡應該調用實際的 API 來儲存系統設定
      // await api.saveSystemSettings(systemSettings);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('儲存系統設定失敗:', error);
      setSaveStatus('error');
    }
  };

  // 恢復預設值
  const handleRestore = () => {
    if (confirm('確定要恢復所有系統設定為預設值嗎？')) {
      // 恢復預設設定的邏輯
      setSaveStatus('idle');
    }
  };

  // 密碼變更處理
  const handlePasswordChange = () => {
    if (passwordChangeDialog.newPassword !== passwordChangeDialog.confirmPassword) {
      alert('新密碼與確認密碼不符');
      return;
    }
    
    if (passwordChangeDialog.newPassword.length < 8) {
      alert('密碼長度至少需要 8 個字元');
      return;
    }
    
    // 更新密碼
    const field = passwordChangeDialog.type === 'admin' ? 'adminPassword' : 'userPassword';
    updateSystemSettings(field, passwordChangeDialog.newPassword);
    
    // 關閉對話框
    setPasswordChangeDialog({
      open: false,
      type: 'admin',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    alert('密碼已更新');
  };

  // 同步系統時間
  const syncSystemTime = async () => {
    try {
      // 模擬時間同步
      const currentTime = new Date();
      updateSystemSettings('dateTime', currentTime);
      alert('時間同步成功');
    } catch (error) {
      alert('時間同步失敗');
    }
  };

  const coolantTypes = [
    'Water',
    'Ethylene Glycol 30%',
    'Ethylene Glycol 50%',
    'Propylene Glycol 30%',
    'Propylene Glycol 50%',
    'Custom'
  ];

  const timezones = [
    'Asia/Taipei',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London'
  ];

  const languages = [
    { value: 'zh-TW', label: '繁體中文' },
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en-US', label: 'English' },
    { value: 'ja-JP', label: '日本語' }
  ];

  return (
      <Box>
        <Typography variant="h4" gutterBottom>
          系統設定
        </Typography>

        {/* 儲存狀態提示 */}
        {saveStatus === 'saved' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            系統設定已成功儲存
          </Alert>
        )}
        {saveStatus === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            儲存系統設定時發生錯誤
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* 單位設定 */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  單位設定
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>溫度單位</InputLabel>
                      <Select
                        value={systemSettings.temperatureUnit}
                        onChange={(e) => updateSystemSettings('temperatureUnit', e.target.value)}
                      >
                        <MenuItem value="celsius">攝氏度 (°C)</MenuItem>
                        <MenuItem value="fahrenheit">華氏度 (°F)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>壓力單位</InputLabel>
                      <Select
                        value={systemSettings.pressureUnit}
                        onChange={(e) => updateSystemSettings('pressureUnit', e.target.value)}
                      >
                        <MenuItem value="mpa">MPa</MenuItem>
                        <MenuItem value="psi">PSI</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>流量單位</InputLabel>
                      <Select
                        value={systemSettings.flowUnit}
                        onChange={(e) => updateSystemSettings('flowUnit', e.target.value)}
                      >
                        <MenuItem value="lpm">LPM (公升/分)</MenuItem>
                        <MenuItem value="gpm">GPM (加侖/分)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 冷卻液特性設定 */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  冷卻液特性
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>冷卻液類型</InputLabel>
                      <Select
                        value={systemSettings.coolantType}
                        onChange={(e) => updateSystemSettings('coolantType', e.target.value)}
                      >
                        {coolantTypes.map(type => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="密度"
                      type="number"
                      value={systemSettings.coolantDensity}
                      onChange={(e) => updateSystemSettings('coolantDensity', parseFloat(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">kg/m³</InputAdornment>
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="黏度"
                      type="number"
                      value={systemSettings.coolantViscosity}
                      onChange={(e) => updateSystemSettings('coolantViscosity', parseFloat(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">cP</InputAdornment>
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="比熱"
                      type="number"
                      value={systemSettings.coolantSpecificHeat}
                      onChange={(e) => updateSystemSettings('coolantSpecificHeat', parseFloat(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">kJ/kg·K</InputAdornment>
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 密碼設定 */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  密碼設定
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setPasswordChangeDialog({
                        open: true,
                        type: 'admin',
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      })}
                    >
                      變更管理員密碼
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setPasswordChangeDialog({
                        open: true,
                        type: 'user',
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      })}
                    >
                      變更使用者密碼
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.passwordExpiration}
                          onChange={(e) => updateSystemSettings('passwordExpiration', e.target.checked)}
                        />
                      }
                      label="啟用密碼過期"
                    />
                  </Grid>
                  
                  {systemSettings.passwordExpiration && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="密碼過期天數"
                        type="number"
                        value={systemSettings.passwordExpirationDays}
                        onChange={(e) => updateSystemSettings('passwordExpirationDays', parseInt(e.target.value))}
                        inputProps={{ min: 30, max: 365 }}
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 日期時間設定 */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  日期時間設定
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="系統時間"
                      type="datetime-local"
                      value={systemSettings.dateTime.toISOString().slice(0, 16)}
                      onChange={(e) => updateSystemSettings('dateTime', new Date(e.target.value))}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>時區</InputLabel>
                      <Select
                        value={systemSettings.timezone}
                        onChange={(e) => updateSystemSettings('timezone', e.target.value)}
                      >
                        {timezones.map(tz => (
                          <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.ntpEnabled}
                          onChange={(e) => updateSystemSettings('ntpEnabled', e.target.checked)}
                        />
                      }
                      label="啟用 NTP 時間同步"
                    />
                  </Grid>
                  
                  {systemSettings.ntpEnabled && (
                    <>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="NTP 伺服器"
                          value={systemSettings.ntpServer}
                          onChange={(e) => updateSystemSettings('ntpServer', e.target.value)}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<ScheduleIcon />}
                          onClick={syncSystemTime}
                        >
                          立即同步時間
                        </Button>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 顯示設定 */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  顯示設定
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>語言</InputLabel>
                      <Select
                        value={systemSettings.language}
                        onChange={(e) => updateSystemSettings('language', e.target.value)}
                      >
                        {languages.map(lang => (
                          <MenuItem key={lang.value} value={lang.value}>{lang.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography gutterBottom>
                      螢幕亮度: {systemSettings.screenBrightness}%
                    </Typography>
                    <Box sx={{ px: 2 }}>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={systemSettings.screenBrightness}
                        onChange={(e) => updateSystemSettings('screenBrightness', parseInt(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="螢幕超時"
                      type="number"
                      value={systemSettings.screenTimeout}
                      onChange={(e) => updateSystemSettings('screenTimeout', parseInt(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">分鐘</InputAdornment>
                      }}
                      inputProps={{ min: 5, max: 120 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 系統維護設定 */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  系統維護
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.autoBackup}
                          onChange={(e) => updateSystemSettings('autoBackup', e.target.checked)}
                        />
                      }
                      label="啟用自動備份"
                    />
                  </Grid>
                  
                  {systemSettings.autoBackup && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="備份間隔"
                        type="number"
                        value={systemSettings.backupInterval}
                        onChange={(e) => updateSystemSettings('backupInterval', parseInt(e.target.value))}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">天</InputAdornment>
                        }}
                        inputProps={{ min: 1, max: 30 }}
                      />
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="日誌保留天數"
                      type="number"
                      value={systemSettings.logRetentionDays}
                      onChange={(e) => updateSystemSettings('logRetentionDays', parseInt(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">天</InputAdornment>
                      }}
                      inputProps={{ min: 30, max: 2555 }}
                      helperText="建議保留 2 年 (730 天)"
                    />
                  </Grid>
                </Grid>
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

        {/* 密碼變更對話框 */}
        <Dialog
          open={passwordChangeDialog.open}
          onClose={() => setPasswordChangeDialog(prev => ({ ...prev, open: false }))}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            變更{passwordChangeDialog.type === 'admin' ? '管理員' : '使用者'}密碼
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="目前密碼"
                  type="password"
                  value={passwordChangeDialog.currentPassword}
                  onChange={(e) => setPasswordChangeDialog(prev => ({
                    ...prev,
                    currentPassword: e.target.value
                  }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="新密碼"
                  type="password"
                  value={passwordChangeDialog.newPassword}
                  onChange={(e) => setPasswordChangeDialog(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))}
                  helperText="密碼長度至少 8 個字元"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="確認新密碼"
                  type="password"
                  value={passwordChangeDialog.confirmPassword}
                  onChange={(e) => setPasswordChangeDialog(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordChangeDialog(prev => ({ ...prev, open: false }))}>
              取消
            </Button>
            <Button onClick={handlePasswordChange} variant="contained">
              確認變更
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
};

export default SystemSettingTab;