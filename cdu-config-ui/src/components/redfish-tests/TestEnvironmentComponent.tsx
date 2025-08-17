/**
 * Test Environment Configuration Component
 * 
 * Advanced test environment management with multi-environment support,
 * configuration profiles, and seamless environment switching
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  ListItemSecondaryAction,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  Settings as EnvironmentIcon,
  PlayArrow as TestIcon,
  CloudQueue as CloudIcon,
  Computer as LocalIcon,
  Storage as DevIcon,
  Security as ProductionIcon,
  NetworkCheck as ConnectivityIcon,
  Speed as PerformanceIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  ContentCopy as CopyIcon,
  ImportExport as ImportIcon
} from '@mui/icons-material';

interface TestEnvironment {
  id: string;
  name: string;
  description: string;
  type: 'development' | 'staging' | 'production' | 'local' | 'cloud';
  config: {
    baseUrl: string;
    port: number;
    protocol: 'http' | 'https';
    timeout: number;
    retries: number;
    authentication?: {
      type: 'none' | 'basic' | 'bearer' | 'apikey';
      username?: string;
      password?: string;
      token?: string;
      apiKey?: string;
    };
    headers?: Record<string, string>;
    proxy?: {
      enabled: boolean;
      host?: string;
      port?: number;
    };
  };
  healthCheck: {
    endpoint: string;
    expectedStatus: number;
    lastCheck?: string;
    status: 'unknown' | 'healthy' | 'unhealthy' | 'checking';
    responseTime?: number;
  };
  features: {
    ssl: boolean;
    loadBalancing: boolean;
    rateLimit: boolean;
    caching: boolean;
    monitoring: boolean;
  };
  metadata: {
    created: string;
    lastModified: string;
    createdBy: string;
    version: string;
    tags: string[];
  };
}

interface EnvironmentProfile {
  id: string;
  name: string;
  description: string;
  environments: string[];
  testConfiguration: {
    parallel: boolean;
    maxConcurrent: number;
    failFast: boolean;
    retryOnFailure: boolean;
  };
  created: string;
}

const DEFAULT_ENVIRONMENT: Omit<TestEnvironment, 'id'> = {
  name: '',
  description: '',
  type: 'development',
  config: {
    baseUrl: 'localhost',
    port: 8001,
    protocol: 'http',
    timeout: 10000,
    retries: 3,
    authentication: {
      type: 'none'
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    proxy: {
      enabled: false
    }
  },
  healthCheck: {
    endpoint: '/health',
    expectedStatus: 200,
    status: 'unknown'
  },
  features: {
    ssl: false,
    loadBalancing: false,
    rateLimit: false,
    caching: false,
    monitoring: false
  },
  metadata: {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    createdBy: 'system',
    version: '1.0.0',
    tags: []
  }
};

const PRESET_ENVIRONMENTS: Partial<TestEnvironment>[] = [
  {
    name: 'Local Development',
    description: '本地開發環境',
    type: 'local',
    config: {
      baseUrl: 'localhost',
      port: 8001,
      protocol: 'http',
      timeout: 5000,
      retries: 1
    }
  },
  {
    name: 'Staging Server',
    description: '預發布環境',
    type: 'staging',
    config: {
      baseUrl: 'staging.example.com',
      port: 443,
      protocol: 'https',
      timeout: 10000,
      retries: 3
    },
    features: {
      ssl: true,
      monitoring: true,
      caching: true,
      loadBalancing: false,
      rateLimit: false
    }
  },
  {
    name: 'Production',
    description: '生產環境',
    type: 'production',
    config: {
      baseUrl: 'api.example.com',
      port: 443,
      protocol: 'https',
      timeout: 15000,
      retries: 5
    },
    features: {
      ssl: true,
      monitoring: true,
      caching: true,
      loadBalancing: true,
      rateLimit: true
    }
  }
];

const TestEnvironmentComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [environments, setEnvironments] = useState<TestEnvironment[]>([]);
  const [profiles, setProfiles] = useState<EnvironmentProfile[]>([]);
  const [activeEnvironment, setActiveEnvironment] = useState<TestEnvironment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Partial<TestEnvironment>>(DEFAULT_ENVIRONMENT);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<EnvironmentProfile>>({});
  const [testingConnectivity, setTestingConnectivity] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  // Initialize with default environments
  useEffect(() => {
    const defaultEnvironments: TestEnvironment[] = PRESET_ENVIRONMENTS.map((preset, index) => ({
      id: `env_${index + 1}`,
      ...DEFAULT_ENVIRONMENT,
      ...preset,
      metadata: {
        ...DEFAULT_ENVIRONMENT.metadata,
        created: new Date().toISOString()
      }
    } as TestEnvironment));

    setEnvironments(defaultEnvironments);
    setActiveEnvironment(defaultEnvironments[0]);
  }, []);

  // Test environment connectivity
  const testConnectivity = useCallback(async (environment: TestEnvironment) => {
    setTestingConnectivity(environment.id);
    
    try {
      const url = `${environment.config.protocol}://${environment.config.baseUrl}:${environment.config.port}${environment.healthCheck.endpoint}`;
      
      const startTime = performance.now();
      
      // Simulate API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), environment.config.timeout);
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: environment.config.headers,
          method: 'GET'
        });
        
        clearTimeout(timeoutId);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        const isHealthy = response.status === environment.healthCheck.expectedStatus;
        
        setEnvironments(prev => prev.map(env => 
          env.id === environment.id 
            ? {
                ...env,
                healthCheck: {
                  ...env.healthCheck,
                  status: isHealthy ? 'healthy' : 'unhealthy',
                  lastCheck: new Date().toISOString(),
                  responseTime: responseTime
                }
              }
            : env
        ));
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        setEnvironments(prev => prev.map(env => 
          env.id === environment.id 
            ? {
                ...env,
                healthCheck: {
                  ...env.healthCheck,
                  status: 'unhealthy',
                  lastCheck: new Date().toISOString()
                }
              }
            : env
        ));
      }
      
    } catch (error) {
      console.error('Connectivity test failed:', error);
    } finally {
      setTestingConnectivity(null);
    }
  }, []);

  // Switch active environment
  const switchEnvironment = useCallback((environment: TestEnvironment) => {
    setActiveEnvironment(environment);
    // Here you would also update the global API configuration
    console.log('Switched to environment:', environment.name);
  }, []);

  // Save environment
  const saveEnvironment = useCallback(() => {
    if (!editingEnvironment.name) {
      alert('環境名稱是必需的');
      return;
    }

    const now = new Date().toISOString();
    const envToSave: TestEnvironment = {
      id: editingEnvironment.id || `env_${Date.now()}`,
      ...DEFAULT_ENVIRONMENT,
      ...editingEnvironment,
      metadata: {
        ...DEFAULT_ENVIRONMENT.metadata,
        ...editingEnvironment.metadata,
        lastModified: now,
        created: editingEnvironment.metadata?.created || now
      }
    } as TestEnvironment;

    setEnvironments(prev => {
      const existingIndex = prev.findIndex(env => env.id === envToSave.id);
      if (existingIndex >= 0) {
        const newEnvs = [...prev];
        newEnvs[existingIndex] = envToSave;
        return newEnvs;
      } else {
        return [...prev, envToSave];
      }
    });

    setEditDialogOpen(false);
    setEditingEnvironment(DEFAULT_ENVIRONMENT);
  }, [editingEnvironment]);

  // Delete environment
  const deleteEnvironment = useCallback((envId: string) => {
    if (confirm('確定要删除此環境嗎？')) {
      setEnvironments(prev => prev.filter(env => env.id !== envId));
      if (activeEnvironment?.id === envId) {
        setActiveEnvironment(environments.find(env => env.id !== envId) || null);
      }
    }
  }, [environments, activeEnvironment]);

  // Environment icon based on type
  const getEnvironmentIcon = (type: string) => {
    switch (type) {
      case 'local': return <LocalIcon />;
      case 'development': return <DevIcon />;
      case 'staging': return <CloudIcon />;
      case 'production': return <ProductionIcon />;
      default: return <EnvironmentIcon />;
    }
  };

  // Environment configuration dialog
  const EnvironmentConfigDialog = () => (
    <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EnvironmentIcon />
          <Typography variant="h6">
            {editingEnvironment.id ? '編輯環境' : '新增環境'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              基本信息
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="環境名稱"
              value={editingEnvironment.name || ''}
              onChange={(e) => setEditingEnvironment(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>環境類型</InputLabel>
              <Select
                value={editingEnvironment.type || 'development'}
                onChange={(e) => setEditingEnvironment(prev => ({ ...prev, type: e.target.value as any }))}
              >
                <MenuItem value="local">本地環境</MenuItem>
                <MenuItem value="development">開發環境</MenuItem>
                <MenuItem value="staging">預發布環境</MenuItem>
                <MenuItem value="production">生產環境</MenuItem>
                <MenuItem value="cloud">雲端環境</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="描述"
              multiline
              rows={2}
              value={editingEnvironment.description || ''}
              onChange={(e) => setEditingEnvironment(prev => ({ ...prev, description: e.target.value }))}
            />
          </Grid>

          {/* Connection Configuration */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              連接配置
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="主機地址"
              value={editingEnvironment.config?.baseUrl || ''}
              onChange={(e) => setEditingEnvironment(prev => ({
                ...prev,
                config: { ...prev.config, baseUrl: e.target.value }
              }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="端口"
              value={editingEnvironment.config?.port || 8001}
              onChange={(e) => setEditingEnvironment(prev => ({
                ...prev,
                config: { ...prev.config, port: parseInt(e.target.value) }
              }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>協議</InputLabel>
              <Select
                value={editingEnvironment.config?.protocol || 'http'}
                onChange={(e) => setEditingEnvironment(prev => ({
                  ...prev,
                  config: { ...prev.config, protocol: e.target.value as 'http' | 'https' }
                }))}
              >
                <MenuItem value="http">HTTP</MenuItem>
                <MenuItem value="https">HTTPS</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="超時時間 (毫秒)"
              value={editingEnvironment.config?.timeout || 10000}
              onChange={(e) => setEditingEnvironment(prev => ({
                ...prev,
                config: { ...prev.config, timeout: parseInt(e.target.value) }
              }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="重試次數"
              value={editingEnvironment.config?.retries || 3}
              onChange={(e) => setEditingEnvironment(prev => ({
                ...prev,
                config: { ...prev.config, retries: parseInt(e.target.value) }
              }))}
            />
          </Grid>

          {/* Authentication */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              認證設置
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>認證類型</InputLabel>
              <Select
                value={editingEnvironment.config?.authentication?.type || 'none'}
                onChange={(e) => setEditingEnvironment(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    authentication: {
                      ...prev.config?.authentication,
                      type: e.target.value as any
                    }
                  }
                }))}
              >
                <MenuItem value="none">無認證</MenuItem>
                <MenuItem value="basic">基本認證</MenuItem>
                <MenuItem value="bearer">Bearer Token</MenuItem>
                <MenuItem value="apikey">API Key</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {editingEnvironment.config?.authentication?.type === 'basic' && (
            <>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="用戶名"
                  value={editingEnvironment.config?.authentication?.username || ''}
                  onChange={(e) => setEditingEnvironment(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      authentication: {
                        ...prev.config?.authentication,
                        username: e.target.value
                      }
                    }
                  }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="密碼"
                  type={showPasswords ? 'text' : 'password'}
                  value={editingEnvironment.config?.authentication?.password || ''}
                  onChange={(e) => setEditingEnvironment(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      authentication: {
                        ...prev.config?.authentication,
                        password: e.target.value
                      }
                    }
                  }))}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => setShowPasswords(!showPasswords)}>
                        {showPasswords ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    )
                  }}
                />
              </Grid>
            </>
          )}

          {editingEnvironment.config?.authentication?.type === 'bearer' && (
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Bearer Token"
                type={showPasswords ? 'text' : 'password'}
                value={editingEnvironment.config?.authentication?.token || ''}
                onChange={(e) => setEditingEnvironment(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    authentication: {
                      ...prev.config?.authentication,
                      token: e.target.value
                    }
                  }
                }))}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowPasswords(!showPasswords)}>
                      {showPasswords ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
          )}

          {editingEnvironment.config?.authentication?.type === 'apikey' && (
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="API Key"
                type={showPasswords ? 'text' : 'password'}
                value={editingEnvironment.config?.authentication?.apiKey || ''}
                onChange={(e) => setEditingEnvironment(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    authentication: {
                      ...prev.config?.authentication,
                      apiKey: e.target.value
                    }
                  }
                }))}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowPasswords(!showPasswords)}>
                      {showPasswords ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
          )}

          {/* Health Check */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              健康檢查
            </Typography>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="健康檢查端點"
              value={editingEnvironment.healthCheck?.endpoint || '/health'}
              onChange={(e) => setEditingEnvironment(prev => ({
                ...prev,
                healthCheck: { ...prev.healthCheck, endpoint: e.target.value }
              }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="期望狀態碼"
              value={editingEnvironment.healthCheck?.expectedStatus || 200}
              onChange={(e) => setEditingEnvironment(prev => ({
                ...prev,
                healthCheck: { ...prev.healthCheck, expectedStatus: parseInt(e.target.value) }
              }))}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
        <Button variant="contained" onClick={saveEnvironment} startIcon={<SaveIcon />}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Environment management panel
  const EnvironmentManagementPanel = () => (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" gutterBottom>
          測試環境管理
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setEditingEnvironment(DEFAULT_ENVIRONMENT);
            setEditDialogOpen(true);
          }}
          startIcon={<AddIcon />}
        >
          新增環境
        </Button>
      </Box>

      {/* Active Environment */}
      {activeEnvironment && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              onClick={() => testConnectivity(activeEnvironment)}
              startIcon={testingConnectivity === activeEnvironment.id ? <CircularProgress size={16} /> : <ConnectivityIcon />}
              disabled={testingConnectivity === activeEnvironment.id}
            >
              測試連接
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>當前環境:</strong> {activeEnvironment.name} 
            ({activeEnvironment.config.protocol}://{activeEnvironment.config.baseUrl}:{activeEnvironment.config.port})
            {activeEnvironment.healthCheck.status !== 'unknown' && (
              <Chip
                size="small"
                label={activeEnvironment.healthCheck.status}
                color={activeEnvironment.healthCheck.status === 'healthy' ? 'success' : 'error'}
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        </Alert>
      )}

      {/* Environment List */}
      <Grid container spacing={2}>
        {environments.map((env) => (
          <Grid item xs={12} md={6} lg={4} key={env.id}>
            <Card 
              sx={{ 
                border: env.id === activeEnvironment?.id ? 2 : 1,
                borderColor: env.id === activeEnvironment?.id ? 'primary.main' : 'divider'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {getEnvironmentIcon(env.type)}
                  <Typography variant="h6" noWrap>
                    {env.name}
                  </Typography>
                  <Box sx={{ ml: 'auto' }}>
                    <Chip
                      size="small"
                      label={env.type}
                      color={env.type === 'production' ? 'error' : env.type === 'staging' ? 'warning' : 'default'}
                    />
                  </Box>
                </Box>

                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {env.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    {env.config.protocol}://{env.config.baseUrl}:{env.config.port}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Chip
                      size="small"
                      icon={
                        env.healthCheck.status === 'healthy' ? <SuccessIcon /> :
                        env.healthCheck.status === 'unhealthy' ? <ErrorIcon /> :
                        testingConnectivity === env.id ? <CircularProgress size={14} /> :
                        <WarningIcon />
                      }
                      label={
                        testingConnectivity === env.id ? '檢查中' :
                        env.healthCheck.status === 'healthy' ? '健康' :
                        env.healthCheck.status === 'unhealthy' ? '異常' :
                        '未知'
                      }
                      color={
                        env.healthCheck.status === 'healthy' ? 'success' :
                        env.healthCheck.status === 'unhealthy' ? 'error' :
                        'default'
                      }
                    />
                    {env.healthCheck.responseTime && (
                      <Typography variant="caption" color="textSecondary">
                        {env.healthCheck.responseTime.toFixed(0)}ms
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box display="flex" gap={1}>
                  <Button
                    variant={env.id === activeEnvironment?.id ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => switchEnvironment(env)}
                    disabled={env.id === activeEnvironment?.id}
                  >
                    {env.id === activeEnvironment?.id ? '當前環境' : '切換'}
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditingEnvironment(env);
                      setEditDialogOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => deleteEnvironment(env.id)}
                    disabled={env.id === activeEnvironment?.id}
                  >
                    <DeleteIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => testConnectivity(env)}
                    disabled={testingConnectivity === env.id}
                  >
                    {testingConnectivity === env.id ? <CircularProgress size={16} /> : <TestIcon />}
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Environment comparison panel
  const EnvironmentComparisonPanel = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        環境對比
      </Typography>
      
      {environments.length > 1 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>屬性</TableCell>
                {environments.slice(0, 4).map(env => (
                  <TableCell key={env.id} align="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      {getEnvironmentIcon(env.type)}
                      <Typography variant="body2" fontWeight="medium">
                        {env.name}
                      </Typography>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell component="th">類型</TableCell>
                {environments.slice(0, 4).map(env => (
                  <TableCell key={env.id} align="center">
                    <Chip size="small" label={env.type} />
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell component="th">地址</TableCell>
                {environments.slice(0, 4).map(env => (
                  <TableCell key={env.id} align="center">
                    <Typography variant="body2">
                      {env.config.baseUrl}:{env.config.port}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell component="th">協議</TableCell>
                {environments.slice(0, 4).map(env => (
                  <TableCell key={env.id} align="center">
                    <Chip 
                      size="small" 
                      label={env.config.protocol.toUpperCase()}
                      color={env.config.protocol === 'https' ? 'success' : 'default'}
                    />
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell component="th">超時時間</TableCell>
                {environments.slice(0, 4).map(env => (
                  <TableCell key={env.id} align="center">
                    <Typography variant="body2">
                      {env.config.timeout / 1000}s
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell component="th">健康狀態</TableCell>
                {environments.slice(0, 4).map(env => (
                  <TableCell key={env.id} align="center">
                    <Chip
                      size="small"
                      label={env.healthCheck.status}
                      color={
                        env.healthCheck.status === 'healthy' ? 'success' :
                        env.healthCheck.status === 'unhealthy' ? 'error' :
                        'default'
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell component="th">SSL</TableCell>
                {environments.slice(0, 4).map(env => (
                  <TableCell key={env.id} align="center">
                    {env.features.ssl ? <SuccessIcon color="success" /> : <ErrorIcon color="error" />}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">
          需要至少2個環境才能進行對比
        </Alert>
      )}
    </Box>
  );

  const tabLabels = [
    { label: '環境管理', icon: <EnvironmentIcon /> },
    { label: '環境對比', icon: <PerformanceIcon /> }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        測試環境配置管理
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        多環境配置管理系統，支持開發、測試、預發布和生產環境的統一管理和無縫切換
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          {tabLabels.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              id={`environment-tab-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      {activeTab === 0 && <EnvironmentManagementPanel />}
      {activeTab === 1 && <EnvironmentComparisonPanel />}

      <EnvironmentConfigDialog />

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>環境管理:</strong> 支持多環境配置、健康檢查、認證設置和無縫切換
            <br />
            <strong>安全特性:</strong> 密碼隱藏、SSL支持、代理配置和認證管理
            <br />
            <strong>建議配置:</strong> 開發環境使用HTTP，生產環境啟用HTTPS和認證
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default TestEnvironmentComponent;