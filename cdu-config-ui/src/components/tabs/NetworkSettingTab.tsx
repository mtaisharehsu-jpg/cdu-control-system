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
  Divider,
  Alert,
  Paper,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Restore as RestoreIcon,
  NetworkCheck as NetworkCheckIcon,
  Wifi as WifiIcon
} from '@mui/icons-material';

// 網路設定類型定義
interface IPv4Settings {
  enabled: boolean;
  dhcpEnabled: boolean;
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  primaryDNS: string;
  secondaryDNS: string;
}

interface IPv6Settings {
  enabled: boolean;
  autoConfig: boolean;
  ipAddress: string;
  prefixLength: number;
  gateway: string;
  primaryDNS: string;
  secondaryDNS: string;
}

interface NetworkSettings {
  hostname: string;
  ipv4: IPv4Settings;
  ipv6: IPv6Settings;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

const NetworkSettingTab: React.FC = () => {
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>({
    hostname: 'CDU-MAIN-001',
    ipv4: {
      enabled: true,
      dhcpEnabled: false,
      ipAddress: '192.168.100.10',
      subnetMask: '255.255.255.0',
      gateway: '192.168.100.1',
      primaryDNS: '8.8.8.8',
      secondaryDNS: '8.8.4.4'
    },
    ipv6: {
      enabled: true,
      autoConfig: true,
      ipAddress: '2001:db8::10',
      prefixLength: 64,
      gateway: '2001:db8::1',
      primaryDNS: '2001:4860:4860::8888',
      secondaryDNS: '2001:4860:4860::8844'
    },
    connectionStatus: 'connected'
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'failed' | null>(null);

  // 更新 IPv4 設定
  const updateIPv4Settings = (field: keyof IPv4Settings, value: any) => {
    setNetworkSettings(prev => ({
      ...prev,
      ipv4: { ...prev.ipv4, [field]: value }
    }));
  };

  // 更新 IPv6 設定
  const updateIPv6Settings = (field: keyof IPv6Settings, value: any) => {
    setNetworkSettings(prev => ({
      ...prev,
      ipv6: { ...prev.ipv6, [field]: value }
    }));
  };

  // 驗證 IP 位址格式
  const isValidIPv4 = (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  };

  const isValidIPv6 = (ip: string): boolean => {
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  };

  // 測試網路連接
  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    
    try {
      // 模擬網路連接測試
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 這裡應該調用實際的網路測試 API
      // const result = await api.testNetworkConnection(networkSettings);
      
      // 模擬測試結果
      const success = Math.random() > 0.3; // 70% 成功率
      setConnectionTestResult(success ? 'success' : 'failed');
    } catch (error) {
      setConnectionTestResult('failed');
    } finally {
      setTestingConnection(false);
    }
  };

  // 儲存網路設定
  const handleSave = async () => {
    setSaveStatus('saving');
    
    // 驗證設定
    if (networkSettings.ipv4.enabled && !networkSettings.ipv4.dhcpEnabled) {
      if (!isValidIPv4(networkSettings.ipv4.ipAddress) ||
          !isValidIPv4(networkSettings.ipv4.subnetMask) ||
          !isValidIPv4(networkSettings.ipv4.gateway)) {
        setSaveStatus('error');
        return;
      }
    }
    
    if (networkSettings.ipv6.enabled && !networkSettings.ipv6.autoConfig) {
      if (!isValidIPv6(networkSettings.ipv6.ipAddress) ||
          !isValidIPv6(networkSettings.ipv6.gateway)) {
        setSaveStatus('error');
        return;
      }
    }
    
    try {
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 這裡應該調用實際的 API 來儲存網路設定
      // await api.saveNetworkSettings(networkSettings);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('儲存網路設定失敗:', error);
      setSaveStatus('error');
    }
  };

  // 恢復預設值
  const handleRestore = () => {
    if (confirm('確定要恢復網路設定為預設值嗎？這可能會中斷網路連接。')) {
      setNetworkSettings(prev => ({
        ...prev,
        ipv4: {
          enabled: true,
          dhcpEnabled: true,
          ipAddress: '192.168.100.10',
          subnetMask: '255.255.255.0',
          gateway: '192.168.100.1',
          primaryDNS: '8.8.8.8',
          secondaryDNS: '8.8.4.4'
        },
        ipv6: {
          enabled: true,
          autoConfig: true,
          ipAddress: '',
          prefixLength: 64,
          gateway: '',
          primaryDNS: '2001:4860:4860::8888',
          secondaryDNS: '2001:4860:4860::8844'
        }
      }));
      setSaveStatus('idle');
      setConnectionTestResult(null);
    }
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        網路設定
      </Typography>

      {/* 儲存狀態提示 */}
      {saveStatus === 'saved' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          網路設定已成功儲存，新設定將在重新啟動後生效
        </Alert>
      )}
      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          儲存網路設定時發生錯誤，請檢查 IP 位址格式是否正確
        </Alert>
      )}

      {/* 連接測試結果 */}
      {connectionTestResult === 'success' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          網路連接測試成功
        </Alert>
      )}
      {connectionTestResult === 'failed' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          網路連接測試失敗，請檢查網路設定
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 基本網路資訊 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  基本網路資訊
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <WifiIcon />
                  <Chip
                    color={getConnectionStatusColor(networkSettings.connectionStatus) as any}
                    label={
                      networkSettings.connectionStatus === 'connected' ? '已連接' :
                      networkSettings.connectionStatus === 'connecting' ? '連接中' : '未連接'
                    }
                  />
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="主機名稱"
                    value={networkSettings.hostname}
                    onChange={(e) => setNetworkSettings(prev => ({ ...prev, hostname: e.target.value }))}
                    helperText="支援 ASCII 字母數字，最大 63 字元"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Button
                      variant="outlined"
                      startIcon={<NetworkCheckIcon />}
                      onClick={testConnection}
                      disabled={testingConnection}
                    >
                      {testingConnection ? '測試中...' : '測試連接'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* IPv4 設定 */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  IPv4 設定
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={networkSettings.ipv4.enabled}
                      onChange={(e) => updateIPv4Settings('enabled', e.target.checked)}
                    />
                  }
                  label="啟用 IPv4"
                />
              </Box>
              
              {networkSettings.ipv4.enabled && (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={networkSettings.ipv4.dhcpEnabled}
                        onChange={(e) => updateIPv4Settings('dhcpEnabled', e.target.checked)}
                      />
                    }
                    label="啟用 DHCP"
                    sx={{ mb: 2 }}
                  />
                  
                  {!networkSettings.ipv4.dhcpEnabled && (
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="IP 位址"
                          value={networkSettings.ipv4.ipAddress}
                          onChange={(e) => updateIPv4Settings('ipAddress', e.target.value)}
                          error={networkSettings.ipv4.ipAddress && !isValidIPv4(networkSettings.ipv4.ipAddress)}
                          helperText={
                            networkSettings.ipv4.ipAddress && !isValidIPv4(networkSettings.ipv4.ipAddress)
                              ? "無效的 IPv4 位址格式"
                              : ""
                          }
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="子網路遮罩"
                          value={networkSettings.ipv4.subnetMask}
                          onChange={(e) => updateIPv4Settings('subnetMask', e.target.value)}
                          error={networkSettings.ipv4.subnetMask && !isValidIPv4(networkSettings.ipv4.subnetMask)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="預設閘道"
                          value={networkSettings.ipv4.gateway}
                          onChange={(e) => updateIPv4Settings('gateway', e.target.value)}
                          error={networkSettings.ipv4.gateway && !isValidIPv4(networkSettings.ipv4.gateway)}
                        />
                      </Grid>
                    </Grid>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    DNS 設定
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="主要 DNS"
                        value={networkSettings.ipv4.primaryDNS}
                        onChange={(e) => updateIPv4Settings('primaryDNS', e.target.value)}
                        error={networkSettings.ipv4.primaryDNS && !isValidIPv4(networkSettings.ipv4.primaryDNS)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="次要 DNS"
                        value={networkSettings.ipv4.secondaryDNS}
                        onChange={(e) => updateIPv4Settings('secondaryDNS', e.target.value)}
                        error={networkSettings.ipv4.secondaryDNS && !isValidIPv4(networkSettings.ipv4.secondaryDNS)}
                      />
                    </Grid>
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* IPv6 設定 */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  IPv6 設定
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={networkSettings.ipv6.enabled}
                      onChange={(e) => updateIPv6Settings('enabled', e.target.checked)}
                    />
                  }
                  label="啟用 IPv6"
                />
              </Box>
              
              {networkSettings.ipv6.enabled && (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={networkSettings.ipv6.autoConfig}
                        onChange={(e) => updateIPv6Settings('autoConfig', e.target.checked)}
                      />
                    }
                    label="自動配置"
                    sx={{ mb: 2 }}
                  />
                  
                  {!networkSettings.ipv6.autoConfig && (
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="IPv6 位址"
                          value={networkSettings.ipv6.ipAddress}
                          onChange={(e) => updateIPv6Settings('ipAddress', e.target.value)}
                          error={networkSettings.ipv6.ipAddress && !isValidIPv6(networkSettings.ipv6.ipAddress)}
                          helperText={
                            networkSettings.ipv6.ipAddress && !isValidIPv6(networkSettings.ipv6.ipAddress)
                              ? "無效的 IPv6 位址格式"
                              : ""
                          }
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="前綴長度"
                          type="number"
                          value={networkSettings.ipv6.prefixLength}
                          onChange={(e) => updateIPv6Settings('prefixLength', parseInt(e.target.value))}
                          inputProps={{ min: 1, max: 128 }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="預設閘道"
                          value={networkSettings.ipv6.gateway}
                          onChange={(e) => updateIPv6Settings('gateway', e.target.value)}
                          error={networkSettings.ipv6.gateway && !isValidIPv6(networkSettings.ipv6.gateway)}
                        />
                      </Grid>
                    </Grid>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    IPv6 DNS 設定
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="主要 DNS"
                        value={networkSettings.ipv6.primaryDNS}
                        onChange={(e) => updateIPv6Settings('primaryDNS', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="次要 DNS"
                        value={networkSettings.ipv6.secondaryDNS}
                        onChange={(e) => updateIPv6Settings('secondaryDNS', e.target.value)}
                      />
                    </Grid>
                  </Grid>
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
          {saveStatus === 'saving' ? '儲存中...' : '儲存並套用'}
        </Button>
      </Box>

      <Alert severity="warning" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>注意：</strong>變更網路設定可能會中斷目前的連接。建議在維護時段進行設定變更。
        </Typography>
      </Alert>
    </Box>
  );
};

export default NetworkSettingTab;