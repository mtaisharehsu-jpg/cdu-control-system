import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Memory as SystemIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// 韌體更新相關類型定義
interface FirmwareModule {
  id: string;
  name: string;
  currentVersion: string;
  availableVersion?: string;
  updateAvailable: boolean;
  status: 'normal' | 'updating' | 'completed' | 'error';
  progress?: number;
  description: string;
}

interface UpdateStep {
  label: string;
  description: string;
  completed: boolean;
  error?: boolean;
}

const FWUpdateTab: React.FC = () => {
  const [firmwareModules, setFirmwareModules] = useState<FirmwareModule[]>([
    {
      id: 'web_interface',
      name: 'Web I/F',
      currentVersion: '2.1.5',
      availableVersion: '2.1.6',
      updateAvailable: true,
      status: 'normal',
      description: 'Web界面控制模組'
    },
    {
      id: 'control_unit_left',
      name: 'Control Unit Left',
      currentVersion: '1.8.2',
      status: 'normal',
      updateAvailable: false,
      description: '左控制單元韌體'
    },
    {
      id: 'control_unit_right',
      name: 'Control Unit Right',
      currentVersion: '1.8.2',
      status: 'normal',
      updateAvailable: false,
      description: '右控制單元韌體'
    },
    {
      id: 'pump_left',
      name: 'Pump Left',
      currentVersion: '3.2.1',
      availableVersion: '3.2.3',
      updateAvailable: true,
      status: 'normal',
      description: '左泵浦控制韌體'
    },
    {
      id: 'pump_right',
      name: 'Pump Right',
      currentVersion: '3.2.1',
      availableVersion: '3.2.3',
      updateAvailable: true,
      status: 'normal',
      description: '右泵浦控制韌體'
    },
    {
      id: 'valve_controller',
      name: 'Valve Controller',
      currentVersion: '2.0.3',
      status: 'normal',
      updateAvailable: false,
      description: '閥門控制器韌體'
    },
    {
      id: 'sensor_module',
      name: 'Sensor Module',
      currentVersion: '1.5.7',
      availableVersion: '1.5.8',
      updateAvailable: true,
      status: 'normal',
      description: '感測器模組韌體'
    }
  ]);

  const [selectedModule, setSelectedModule] = useState<string>('');
  const [updateDialog, setUpdateDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [customFileDialog, setCustomFileDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const updateSteps: UpdateStep[] = [
    { label: '系統檢查', description: '檢查系統狀態和準備更新', completed: false },
    { label: '備份現有韌體', description: '備份當前韌體版本', completed: false },
    { label: '上傳新韌體', description: '上傳並驗證新韌體檔案', completed: false },
    { label: '安裝韌體', description: '安裝新韌體到目標模組', completed: false },
    { label: '驗證更新', description: '驗證韌體更新是否成功', completed: false },
    { label: '系統重啟', description: '重啟相關模組完成更新', completed: false }
  ];

  const [currentSteps, setCurrentSteps] = useState<UpdateStep[]>(updateSteps);

  // 開始韌體更新
  const startUpdate = async (moduleId: string) => {
    const module = firmwareModules.find(m => m.id === moduleId);
    if (!module) return;

    setSelectedModule(moduleId);
    setUpdateDialog(true);
    setActiveStep(0);
    setCurrentSteps(updateSteps.map(step => ({ ...step, completed: false, error: false })));

    // 更新模組狀態
    setFirmwareModules(prev => prev.map(m => 
      m.id === moduleId ? { ...m, status: 'updating', progress: 0 } : m
    ));

    try {
      // 模擬更新步驟
      for (let stepIndex = 0; stepIndex < updateSteps.length; stepIndex++) {
        setActiveStep(stepIndex);
        
        // 模擬步驟執行時間
        const stepDuration = 2000 + Math.random() * 3000; // 2-5秒
        const stepStart = Date.now();
        
        // 更新步驟進度
        const updateProgress = () => {
          const elapsed = Date.now() - stepStart;
          const progress = Math.min((elapsed / stepDuration) * 100, 100);
          
          setFirmwareModules(prev => prev.map(m => 
            m.id === moduleId ? { ...m, progress: (stepIndex * 100 + progress) / updateSteps.length } : m
          ));
          
          if (progress < 100) {
            setTimeout(updateProgress, 100);
          }
        };
        
        updateProgress();
        await new Promise(resolve => setTimeout(resolve, stepDuration));
        
        // 標記步驟完成
        setCurrentSteps(prev => prev.map((step, index) => 
          index === stepIndex ? { ...step, completed: true } : step
        ));
      }

      // 更新完成
      setFirmwareModules(prev => prev.map(m => 
        m.id === moduleId ? { 
          ...m, 
          status: 'completed',
          currentVersion: m.availableVersion || m.currentVersion,
          availableVersion: undefined,
          updateAvailable: false,
          progress: 100
        } : m
      ));

    } catch (error) {
      // 更新失敗
      setFirmwareModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, status: 'error' } : m
      ));
      
      setCurrentSteps(prev => prev.map((step, index) => 
        index === activeStep ? { ...step, error: true } : step
      ));
    }
  };

  // 處理檔案上傳
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 安裝自訂韌體
  const installCustomFirmware = () => {
    if (!selectedFile || !selectedModule) return;
    
    setCustomFileDialog(false);
    startUpdate(selectedModule);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'default';
      case 'updating':
        return 'info';
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <InfoIcon />;
      case 'updating':
        return <SystemIcon color="info" />;
      case 'completed':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal':
        return '待更新';
      case 'updating':
        return '更新中';
      case 'completed':
        return '已完成';
      case 'error':
        return '更新失敗';
      default:
        return '未知';
    }
  };

  const availableUpdates = firmwareModules.filter(m => m.updateAvailable);
  const isUpdating = firmwareModules.some(m => m.status === 'updating');

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        韌體更新
      </Typography>

      {/* 更新狀態概覽 */}
      {availableUpdates.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          發現 {availableUpdates.length} 個模組有可用的韌體更新。建議在維護時段進行更新。
        </Alert>
      )}

      {isUpdating && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon />
            <Typography>韌體更新進行中，請勿中斷電源或網路連接。</Typography>
          </Box>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 可用更新列表 */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                韌體模組狀態
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>模組名稱</TableCell>
                      <TableCell>當前版本</TableCell>
                      <TableCell>可用版本</TableCell>
                      <TableCell>狀態</TableCell>
                      <TableCell>進度</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {firmwareModules.map((module) => (
                      <TableRow key={module.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            {getStatusIcon(module.status)}
                            <Box ml={1}>
                              <Typography variant="body2" fontWeight="bold">
                                {module.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {module.description}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {module.currentVersion}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {module.availableVersion ? (
                            <Typography variant="body2" color="primary" fontWeight="bold">
                              {module.availableVersion}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              最新版本
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={getStatusColor(module.status) as any}
                            label={getStatusText(module.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {module.status === 'updating' && module.progress !== undefined ? (
                            <Box sx={{ width: '100%' }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={module.progress} 
                                sx={{ mb: 1 }}
                              />
                              <Typography variant="caption">
                                {module.progress.toFixed(0)}%
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => startUpdate(module.id)}
                            disabled={!module.updateAvailable || module.status === 'updating' || isUpdating}
                          >
                            {module.updateAvailable ? '更新' : '最新'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 更新選項 */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                批次更新
              </Typography>
              
              <Button
                fullWidth
                variant="contained"
                color="warning"
                startIcon={<SystemIcon />}
                disabled={availableUpdates.length === 0 || isUpdating}
                onClick={() => {
                  if (confirm(`確定要更新所有 ${availableUpdates.length} 個可用更新嗎？這可能需要較長時間。`)) {
                    availableUpdates.forEach((module, index) => {
                      setTimeout(() => startUpdate(module.id), index * 1000);
                    });
                  }
                }}
                sx={{ mb: 2 }}
              >
                更新所有可用更新
              </Button>
              
              <Typography variant="body2" color="textSecondary">
                批次更新將依序更新所有可用的韌體。整個過程可能需要 10-30 分鐘。
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                自訂韌體安裝
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>選擇模組</InputLabel>
                <Select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  disabled={isUpdating}
                >
                  {firmwareModules.map(module => (
                    <MenuItem key={module.id} value={module.id}>
                      {module.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setCustomFileDialog(true)}
                disabled={!selectedModule || isUpdating}
              >
                上傳韌體檔案
              </Button>
              
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                支援 .bin、.hex 格式的韌體檔案
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 更新進度對話框 */}
      <Dialog
        open={updateDialog}
        onClose={() => !isUpdating && setUpdateDialog(false)}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={isUpdating}
      >
        <DialogTitle>
          韌體更新進度 - {firmwareModules.find(m => m.id === selectedModule)?.name}
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {currentSteps.map((step, index) => (
              <Step key={index} completed={step.completed}>
                <StepLabel error={step.error}>
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="textSecondary">
                    {step.description}
                  </Typography>
                  {index === activeStep && !step.completed && (
                    <LinearProgress sx={{ mt: 1 }} />
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions>
          {!isUpdating && (
            <Button onClick={() => setUpdateDialog(false)}>
              關閉
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 自訂韌體上傳對話框 */}
      <Dialog
        open={customFileDialog}
        onClose={() => setCustomFileDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          上傳自訂韌體
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            選擇模組：{firmwareModules.find(m => m.id === selectedModule)?.name}
          </Typography>
          
          <input
            type="file"
            accept=".bin,.hex"
            onChange={handleFileUpload}
            style={{ margin: '16px 0' }}
          />
          
          {selectedFile && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                選擇的檔案：{selectedFile.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                檔案大小：{(selectedFile.size / 1024).toFixed(1)} KB
              </Typography>
            </Box>
          )}
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>警告：</strong>安裝不正確的韌體可能會導致設備無法正常運行。
              請確保韌體檔案來源可靠且與所選模組相容。
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomFileDialog(false)}>
            取消
          </Button>
          <Button 
            onClick={installCustomFirmware}
            variant="contained"
            disabled={!selectedFile}
          >
            開始安裝
          </Button>
        </DialogActions>
      </Dialog>

      {/* 注意事項 */}
      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>韌體更新注意事項：</strong>
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><WarningIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="更新過程中請勿斷電或中斷網路連接" />
          </ListItem>
          <ListItem>
            <ListItemIcon><WarningIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="建議在系統維護時段進行韌體更新" />
          </ListItem>
          <ListItem>
            <ListItemIcon><WarningIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="更新前請確保系統處於安全停止狀態" />
          </ListItem>
          <ListItem>
            <ListItemIcon><WarningIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="如更新失敗，系統將自動回復到備份韌體" />
          </ListItem>
        </List>
      </Alert>
    </Box>
  );
};

export default FWUpdateTab;