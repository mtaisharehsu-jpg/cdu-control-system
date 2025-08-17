
import React, { useState, useEffect } from 'react';
import { useMachineConfig } from '../../contexts/MachineConfigContext';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Snackbar,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  ImportExport as ImportExportIcon
} from '@mui/icons-material';
import {
  getMachineConfigs,
  createMachineConfig,
  setCurrentMachine,
  deleteMachineConfig,
  formatApiError,
  type MachineConfigResponse,
  type MachineConfigRequest,
  type SensorConfig
} from '../../api/simpleApi';
import MachineConfigDialog from './MachineConfigDialog';
import MachineStatsCard from './MachineStatsCard';
import MachineImportExport from './MachineImportExport';

interface MachineModel {
  type: string;
  name: string;
  description: string;
  isPreDefined: boolean;
  isCurrent: boolean;
  sensorCount: number;
  sensorConfig: SensorConfig;
  createdTime?: string;
  updatedTime?: string;
}

const ModelList: React.FC = () => {
  const { setSelectedMachineType, refreshMachineConfigs } = useMachineConfig();
  
  // State management
  const [models, setModels] = useState<MachineModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMachine, setCurrentMachineType] = useState<string>('');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<MachineModel | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    machine_type: '',
    machine_name: '',
    description: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuModel, setMenuModel] = useState<MachineModel | null>(null);

  // Load machine configurations
  const loadMachineConfigs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getMachineConfigs();
      const machineModels: MachineModel[] = Object.entries(response.machine_configs).map(([type, config]) => ({
        type,
        name: config.machine_name,
        description: config.description,
        isPreDefined: ['default', 'cdu_compact', 'cdu_advanced'].includes(type),
        isCurrent: type === response.current_machine,
        sensorCount: calculateSensorCount(config.sensor_config),
        sensorConfig: config.sensor_config,
        createdTime: config.created_time,
        updatedTime: config.updated_time
      }));

      setModels(machineModels);
      setCurrentMachineType(response.current_machine);
    } catch (err) {
      setError(formatApiError(err));
      showSnackbar('載入機種配置失敗', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total sensor count
  const calculateSensorCount = (sensorConfig: any): number => {
    let total = 0;
    Object.values(sensorConfig).forEach((typeConfig: any) => {
      if (typeConfig.sensors) {
        total += Object.keys(typeConfig.sensors).length;
      }
    });
    return total;
  };

  // Show snackbar message
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle switch machine
  const handleSwitchMachine = async (machineType: string) => {
    if (machineType === currentMachine) return;

    setFormLoading(true);
    try {
      await setCurrentMachine(machineType);
      // Update global context
      setSelectedMachineType(machineType);
      await loadMachineConfigs(); // Reload to update current status
      // 刷新 Context 中的機種配置以同步狀態
      await refreshMachineConfigs();
      showSnackbar(`已切換到機種: ${machineType}`, 'success');
    } catch (err) {
      showSnackbar(`切換機種失敗: ${formatApiError(err)}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle create machine
  const handleCreateMachine = async () => {
    if (!formData.machine_type || !formData.machine_name) {
      showSnackbar('請填寫必要欄位', 'warning');
      return;
    }

    setFormLoading(true);
    try {
      const newConfig: MachineConfigRequest = {
        machine_type: formData.machine_type,
        machine_name: formData.machine_name,
        description: formData.description,
        sensor_config: getDefaultSensorConfig()
      };

      await createMachineConfig(newConfig);
      await loadMachineConfigs();
      // 刷新 Context 中的機種配置，確保其他組件能看到新機種
      await refreshMachineConfigs();
      setCreateDialogOpen(false);
      resetForm();
      showSnackbar('機種創建成功', 'success');
    } catch (err) {
      showSnackbar(`創建機種失敗: ${formatApiError(err)}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete machine
  const handleDeleteMachine = async () => {
    if (!selectedModel) return;

    setFormLoading(true);
    try {
      await deleteMachineConfig(selectedModel.type);
      await loadMachineConfigs();
      // 刷新 Context 中的機種配置，確保其他組件能看到變更
      await refreshMachineConfigs();
      setDeleteDialogOpen(false);
      setSelectedModel(null);
      showSnackbar('機種刪除成功', 'success');
    } catch (err) {
      showSnackbar(`刪除機種失敗: ${formatApiError(err)}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Get default sensor configuration
  const getDefaultSensorConfig = () => ({
    temperature: {
      name: '溫度訊息',
      sensors: {
        main_temp: {
          register: 10111,
          description: '主要溫度',
          precision: 0.1,
          unit: '℃',
          min_raw: 100,
          max_raw: 800,
          min_actual: 10.0,
          max_actual: 80.0,
          conversion_factor: 0.1
        }
      }
    },
    pressure: { name: '壓力訊息', sensors: {} },
    flow: { name: '流量訊息', sensors: {} },
    io: { name: '輸入輸出訊息', sensors: {} }
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      machine_type: '',
      machine_name: '',
      description: ''
    });
  };

  // Handle menu actions
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, model: MachineModel) => {
    setMenuAnchor(event.currentTarget);
    setMenuModel(model);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuModel(null);
  };

  // Load data on component mount
  useEffect(() => {
    loadMachineConfigs();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        載入機種配置失敗: {error}
        <Button onClick={loadMachineConfigs} sx={{ ml: 2 }}>
          重試
        </Button>
      </Alert>
    );
  }

  // Calculate statistics
  const predefinedMachines = models.filter(m => m.isPreDefined).length;
  const customMachines = models.filter(m => !m.isPreDefined).length;
  const currentMachineModel = models.find(m => m.isCurrent);
  const totalSensors = models.reduce((sum, m) => sum + m.sensorCount, 0);
  const activeSensors = Math.floor(totalSensors * 0.3); // Mock active sensors

  return (
    <Box>
      {/* Statistics Card */}
      <MachineStatsCard
        totalMachines={models.length}
        predefinedMachines={predefinedMachines}
        customMachines={customMachines}
        currentMachine={currentMachine}
        currentMachineName={currentMachineModel?.name || '未知'}
        totalSensors={totalSensors}
        activeSensors={activeSensors}
      />

      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              機種列表
            </Typography>
            <Typography variant="body2" color="textSecondary">
              管理CDU機種配置，當前使用: <Chip label={currentMachine} color="primary" size="small" />
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={formLoading}
          >
            新增機種
          </Button>
        </Box>

        {/* Machine Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>機種名稱</TableCell>
                <TableCell>類型</TableCell>
                <TableCell>描述</TableCell>
                <TableCell align="center">感測器數量</TableCell>
                <TableCell align="center">狀態</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.type} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body1" fontWeight={model.isCurrent ? 'bold' : 'normal'}>
                        {model.type}
                      </Typography>
                      {model.isCurrent && (
                        <CheckCircleIcon color="success" sx={{ ml: 1, fontSize: 20 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={model.isPreDefined ? '預定義' : '自定義'}
                      color={model.isPreDefined ? 'default' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {model.description}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={model.sensorCount} variant="outlined" size="small" />
                  </TableCell>
                  <TableCell align="center">
                    {model.isCurrent ? (
                      <Chip label="使用中" color="success" size="small" />
                    ) : (
                      <Chip label="待機" variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {!model.isCurrent && (
                        <Tooltip title="切換到此機種">
                          <IconButton
                            size="small"
                            onClick={() => handleSwitchMachine(model.type)}
                            disabled={formLoading}
                          >
                            <SettingsIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      <Tooltip title="更多操作">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, model)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {models.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="textSecondary">
              沒有找到機種配置
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            setSelectedModel(menuModel);
            setConfigDialogOpen(true);
            handleMenuClose();
          }}
        >
          <VisibilityIcon sx={{ mr: 1 }} />
          查看配置
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSelectedModel(menuModel);
            setEditDialogOpen(true);
            handleMenuClose();
          }}
          disabled={menuModel?.isPreDefined}
        >
          <EditIcon sx={{ mr: 1 }} />
          編輯
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSelectedModel(menuModel);
            setImportExportDialogOpen(true);
            handleMenuClose();
          }}
        >
          <ImportExportIcon sx={{ mr: 1 }} />
          導入/導出
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSelectedModel(menuModel);
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          disabled={menuModel?.isPreDefined || menuModel?.isCurrent}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          刪除
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增機種</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="機種類型"
              value={formData.machine_type}
              onChange={(e) => setFormData({ ...formData, machine_type: e.target.value })}
              margin="normal"
              required
              helperText="機種的唯一識別碼，例如: my_custom_cdu"
            />
            <TextField
              fullWidth
              label="機種名稱"
              value={formData.machine_name}
              onChange={(e) => setFormData({ ...formData, machine_name: e.target.value })}
              margin="normal"
              required
              helperText="機種的顯示名稱"
            />
            <TextField
              fullWidth
              label="描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              helperText="機種的詳細描述"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={formLoading}>
            取消
          </Button>
          <Button
            onClick={handleCreateMachine}
            variant="contained"
            disabled={formLoading}
            startIcon={formLoading ? <CircularProgress size={20} /> : null}
          >
            創建
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>編輯機種</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="機種類型"
              value={selectedModel?.type || ''}
              disabled
              margin="normal"
              helperText="機種類型無法修改"
            />
            <TextField
              fullWidth
              label="機種名稱"
              value={formData.machine_name}
              onChange={(e) => setFormData({ ...formData, machine_name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={formLoading}>
            取消
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement edit functionality
              setEditDialogOpen(false);
              showSnackbar('編輯功能開發中', 'info');
            }}
            variant="contained"
            disabled={formLoading}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除機種 "{selectedModel?.type}" 嗎？此操作無法撤銷。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={formLoading}>
            取消
          </Button>
          <Button
            onClick={handleDeleteMachine}
            color="error"
            variant="contained"
            disabled={formLoading}
            startIcon={formLoading ? <CircularProgress size={20} /> : null}
          >
            刪除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Machine Configuration Dialog */}
      {selectedModel && (
        <MachineConfigDialog
          open={configDialogOpen}
          onClose={() => {
            setConfigDialogOpen(false);
            setSelectedModel(null);
          }}
          machineType={selectedModel.type}
          machineName={selectedModel.name}
          sensorConfig={selectedModel.sensorConfig}
          readOnly={selectedModel.isPreDefined}
          onSave={(config) => {
            // TODO: Implement save functionality
            showSnackbar('配置保存功能開發中', 'info');
          }}
        />
      )}

      {/* Import/Export Dialog */}
      <MachineImportExport
        open={importExportDialogOpen}
        onClose={() => {
          setImportExportDialogOpen(false);
          setSelectedModel(null);
        }}
        onImport={async (config) => {
          try {
            await createMachineConfig(config);
            await loadMachineConfigs();
            showSnackbar(`機種 ${config.machine_type} 導入成功`, 'success');
          } catch (err) {
            showSnackbar(`導入失敗: ${formatApiError(err)}`, 'error');
          }
        }}
        exportData={selectedModel ? {
          machineType: selectedModel.type,
          machineName: selectedModel.name,
          description: selectedModel.description,
          sensorConfig: selectedModel.sensorConfig
        } : undefined}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ModelList;
