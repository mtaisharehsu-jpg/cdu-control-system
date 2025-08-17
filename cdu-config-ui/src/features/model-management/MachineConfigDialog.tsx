/**
 * Machine Configuration Dialog Component
 * 
 * This component provides a detailed view and editing interface for machine sensor configurations.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
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
  Chip,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  MenuItem,
  Select,
  InputLabel,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Cable as CableIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { type SensorConfig, type SensorDefinition, type ModbusRtuConfig, type DistributedBlockConfig, distributedFunctionBlocks, getDynamicFunctionBlocksConfig } from '../../api/simpleApi';
import { modbusRtuService } from '../../services/modbusRtuService';

interface MachineConfigDialogProps {
  open: boolean;
  onClose: () => void;
  machineType: string;
  machineName: string;
  sensorConfig: SensorConfig;
  onSave?: (config: SensorConfig) => void;
  readOnly?: boolean;
}

interface EditingSensor {
  typeKey: string;
  sensorKey: string;
  definition: SensorDefinition;
}

const MachineConfigDialog: React.FC<MachineConfigDialogProps> = ({
  open,
  onClose,
  machineType,
  machineName,
  sensorConfig,
  onSave,
  readOnly = false
}) => {
  const [config, setConfig] = useState<SensorConfig>(sensorConfig);
  const [editingSensor, setEditingSensor] = useState<EditingSensor | null>(null);
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['temperature']);
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [dynamicFunctionBlocks, setDynamicFunctionBlocks] = useState<DistributedBlockConfig[]>(distributedFunctionBlocks);

  useEffect(() => {
    setConfig(sensorConfig);
  }, [sensorConfig]);

  // 載入動態功能區塊配置
  useEffect(() => {
    const loadDynamicFunctionBlocks = async () => {
      try {
        console.log('🔧 Loading dynamic function blocks for config dialog...');
        const dynamicConfig = await getDynamicFunctionBlocksConfig();
        
        if (dynamicConfig && dynamicConfig.function_blocks) {
          // 轉換後端功能區塊格式為前端DistributedBlockConfig格式
          const blocks: DistributedBlockConfig[] = dynamicConfig.function_blocks.map((block: any) => ({
            block_id: block.block_id,
            block_type: block.block_type,
            device: block.device,
            modbus_address: block.modbus_address,
            register: block.register,
            ip_address: block.ip_address,
            port: block.port,
            unit_id: block.unit_id
          }));
          
          setDynamicFunctionBlocks(blocks);
          console.log('✅ Dynamic function blocks loaded:', blocks);
        }
      } catch (error) {
        console.error('❌ Failed to load dynamic function blocks:', error);
        // 使用預設的靜態配置
        setDynamicFunctionBlocks(distributedFunctionBlocks);
      }
    };

    if (open) {
      loadDynamicFunctionBlocks();
    }
  }, [open]);

  useEffect(() => {
    // 檢測可用的串行端口設備
    const detectAvailableDevices = () => {
      const devices: string[] = [];
      
      // Windows COM 端口
      for (let i = 1; i <= 20; i++) {
        devices.push(`COM${i}`);
      }
      
      // Linux TTY 設備
      const linuxDevices = [
        '/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyUSB2', '/dev/ttyUSB3',
        '/dev/ttyS0', '/dev/ttyS1', '/dev/ttyS2', '/dev/ttyS3',
        '/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyACM2', '/dev/ttyACM3',
        '/dev/ttyTHS1', '/dev/ttyTHS2' // Jetson Nano 特有
      ];
      
      devices.push(...linuxDevices);
      setAvailableDevices(devices);
    };
    
    if (open) {
      detectAvailableDevices();
    }
  }, [open]);

  const handlePanelChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanels(prev => 
      isExpanded 
        ? [...prev, panel]
        : prev.filter(p => p !== panel)
    );
  };

  const handleSensorEdit = (typeKey: string, sensorKey: string, definition: SensorDefinition) => {
    setEditingSensor({ typeKey, sensorKey, definition: { ...definition } });
  };

  const handleSensorSave = () => {
    if (!editingSensor) return;

    const newConfig = { ...config };
    newConfig[editingSensor.typeKey as keyof SensorConfig].sensors[editingSensor.sensorKey] = editingSensor.definition;
    setConfig(newConfig);
    setEditingSensor(null);
  };

  const handleSensorCancel = () => {
    setEditingSensor(null);
  };

  const handleSensorDelete = (typeKey: string, sensorKey: string) => {
    const newConfig = { ...config };
    delete newConfig[typeKey as keyof SensorConfig].sensors[sensorKey];
    setConfig(newConfig);
  };

  const handleAddSensor = (typeKey: string) => {
    const newSensorKey = `new_sensor_${Date.now()}`;
    const newSensor: SensorDefinition = {
      config_source: 'register',
      register: 10000,
      description: '新感測器',
      precision: 0.1,
      unit: '',
      min_raw: 0,
      max_raw: 1000,
      min_actual: 0,
      max_actual: 100,
      conversion_factor: 0.1
    };

    const newConfig = { ...config };
    newConfig[typeKey as keyof SensorConfig].sensors[newSensorKey] = newSensor;
    setConfig(newConfig);
    setEditingSensor({ typeKey, sensorKey: newSensorKey, definition: { ...newSensor } });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(config);
    }
    onClose();
  };

  const getSensorTypeIcon = (typeKey: string) => {
    const icons: Record<string, string> = {
      temperature: '🌡️',
      pressure: '📊',
      flow: '💧',
      io: '🔌'
    };
    return icons[typeKey] || '📋';
  };

  const getSensorTypeColor = (typeKey: string): 'primary' | 'secondary' | 'success' | 'warning' => {
    const colors: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
      temperature: 'primary',
      pressure: 'secondary',
      flow: 'success',
      io: 'warning'
    };
    return colors[typeKey] || 'primary';
  };

  const renderSensorTable = (typeKey: string, sensors: Record<string, SensorDefinition>) => {
    const sensorEntries = Object.entries(sensors);

    if (sensorEntries.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="textSecondary">
            此類型暫無感測器配置
          </Typography>
          {!readOnly && (
            <Button
              startIcon={<AddIcon />}
              onClick={() => handleAddSensor(typeKey)}
              sx={{ mt: 1 }}
            >
              新增感測器
            </Button>
          )}
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>感測器名稱</TableCell>
              <TableCell>配置來源</TableCell>
              <TableCell>地址/配置</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>單位</TableCell>
              <TableCell>精度</TableCell>
              <TableCell>範圍</TableCell>
              {!readOnly && <TableCell align="right">操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {sensorEntries.map(([sensorKey, sensor]) => (
              <React.Fragment key={sensorKey}>
                <TableRow hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {sensorKey}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={
                        sensor.config_source === 'register' ? '暫存器' : 
                        sensor.config_source === 'modbus_rtu' ? 'Modbus RTU' : 
                        '分散式功能區塊'
                      } 
                      size="small" 
                      color={
                        sensor.config_source === 'register' ? 'primary' : 
                        sensor.config_source === 'modbus_rtu' ? 'success' : 
                        'warning'
                      }
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>
                    {sensor.config_source === 'register' ? (
                      <Chip label={sensor.register} size="small" variant="outlined" />
                    ) : sensor.config_source === 'modbus_rtu' && sensor.modbus_rtu ? (
                      <Box>
                        <Typography variant="caption" display="block" fontWeight="bold">
                          {sensor.modbus_rtu.device_path} ({sensor.modbus_rtu.baud_rate})
                        </Typography>
                        <Typography variant="caption" display="block">
                          Slave: {sensor.modbus_rtu.slave_id}, FC: {sensor.modbus_rtu.function_code}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Addr: 0x{sensor.modbus_rtu.register_address.toString(16).toUpperCase()}
                        </Typography>
                      </Box>
                    ) : sensor.config_source === 'distributed_block' && sensor.distributed_block ? (
                      <Box>
                        <Typography variant="caption" display="block" fontWeight="bold">
                          {sensor.distributed_block.block_id} ({sensor.distributed_block.block_type})
                        </Typography>
                        {sensor.distributed_block.device && (
                          <Typography variant="caption" display="block">
                            Device: {sensor.distributed_block.device}
                          </Typography>
                        )}
                        {sensor.distributed_block.ip_address && (
                          <Typography variant="caption" display="block">
                            IP: {sensor.distributed_block.ip_address}:{sensor.distributed_block.port}
                          </Typography>
                        )}
                        {sensor.distributed_block.register !== undefined && (
                          <Typography variant="caption" display="block">
                            Reg: {sensor.distributed_block.register}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="error">未配置</Typography>
                    )}
                  </TableCell>
                  <TableCell>{sensor.description}</TableCell>
                  <TableCell>{sensor.unit || '-'}</TableCell>
                  <TableCell>{sensor.precision || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {sensor.min_actual !== undefined && sensor.max_actual !== undefined
                        ? `${sensor.min_actual} ~ ${sensor.max_actual}`
                        : sensor.range || '-'
                      }
                    </Typography>
                  </TableCell>
                  {!readOnly && (
                    <TableCell align="right">
                      <Tooltip title="編輯">
                        <IconButton
                          size="small"
                          onClick={() => handleSensorEdit(typeKey, sensorKey, sensor)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="刪除">
                        <IconButton
                          size="small"
                          onClick={() => handleSensorDelete(typeKey, sensorKey)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {sensor.config_source === 'modbus_rtu' && sensor.modbus_rtu && (
                        <Tooltip title="測試連接">
                          <IconButton
                            size="small"
                            onClick={() => testModbusConnection(sensorKey, sensor.modbus_rtu!)}
                            disabled={testingConnection === sensorKey}
                            color="info"
                          >
                            {testingConnection === sensorKey ? (
                              <CircularProgress size={16} />
                            ) : (
                              <CableIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}
                </TableRow>
                {connectionResults[sensorKey] && (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 7 : 8}>
                      <Alert 
                        severity={connectionResults[sensorKey].success ? 'success' : 'error'}
                        sx={{ mt: 1 }}
                      >
                        {connectionResults[sensorKey].message}
                      </Alert>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        {!readOnly && (
          <Box sx={{ p: 1, textAlign: 'center' }}>
            <Button
              startIcon={<AddIcon />}
              onClick={() => handleAddSensor(typeKey)}
              size="small"
            >
              新增感測器
            </Button>
          </Box>
        )}
      </TableContainer>
    );
  };

  const handleConfigSourceChange = (source: 'register' | 'modbus_rtu' | 'distributed_block') => {
    if (!editingSensor) return;
    
    const newDefinition = { ...editingSensor.definition };
    newDefinition.config_source = source;
    
    if (source === 'modbus_rtu' && !newDefinition.modbus_rtu) {
      newDefinition.modbus_rtu = {
        device_path: 'COM1',
        baud_rate: 9600,
        data_bits: 8,
        stop_bits: 1,
        parity: 'none',
        timeout: 1000,
        slave_id: 1,
        function_code: 3,
        register_address: 0x1000,
        data_type: 'uint16',
        byte_order: 'big',
        word_order: 'big'
      };
    }
    
    if (source === 'distributed_block' && !newDefinition.distributed_block) {
      // 使用第一個可用的分散式功能區塊作為預設值
      const firstBlock = dynamicFunctionBlocks[0];
      if (firstBlock) {
        newDefinition.distributed_block = { ...firstBlock };
      }
    }
    
    setEditingSensor({ ...editingSensor, definition: newDefinition });
  };

  const testModbusConnection = async (sensorKey: string, config: ModbusRtuConfig) => {
    setTestingConnection(sensorKey);
    try {
      const result = await modbusRtuService.testConnection(config);
      setConnectionResults(prev => ({
        ...prev,
        [sensorKey]: {
          success: result.success,
          message: result.success 
            ? `連接成功！讀取值: ${result.value}` 
            : result.error || '連接失敗'
        }
      }));
    } catch (error) {
      setConnectionResults(prev => ({
        ...prev,
        [sensorKey]: {
          success: false,
          message: error instanceof Error ? error.message : '測試失敗'
        }
      }));
    } finally {
      setTestingConnection(null);
    }
  };

  const handleModbusRtuChange = (field: keyof ModbusRtuConfig, value: any) => {
    if (!editingSensor || !editingSensor.definition.modbus_rtu) return;
    
    const newModbusRtu = { ...editingSensor.definition.modbus_rtu };
    newModbusRtu[field] = value;
    
    setEditingSensor({
      ...editingSensor,
      definition: {
        ...editingSensor.definition,
        modbus_rtu: newModbusRtu
      }
    });
  };

  const handleDistributedBlockChange = (blockId: string) => {
    if (!editingSensor) return;
    
    const selectedBlock = dynamicFunctionBlocks.find(block => block.block_id === blockId);
    if (selectedBlock) {
      // 完整複製選中功能區塊的所有配置
      const newDistributedBlock: DistributedBlockConfig = {
        block_id: selectedBlock.block_id,
        block_type: selectedBlock.block_type,
        ...(selectedBlock.device && { device: selectedBlock.device }),
        ...(selectedBlock.modbus_address !== undefined && { modbus_address: selectedBlock.modbus_address }),
        ...(selectedBlock.register !== undefined && { register: selectedBlock.register }),
        ...(selectedBlock.ip_address && { ip_address: selectedBlock.ip_address }),
        ...(selectedBlock.port !== undefined && { port: selectedBlock.port }),
        ...(selectedBlock.unit_id !== undefined && { unit_id: selectedBlock.unit_id })
      };

      setEditingSensor({
        ...editingSensor,
        definition: {
          ...editingSensor.definition,
          distributed_block: newDistributedBlock
        }
      });
      
      console.log('功能區塊配置已載入:', newDistributedBlock);
    }
  };

  const renderEditDialog = () => {
    if (!editingSensor) return null;

    return (
      <Dialog open={true} onClose={handleSensorCancel} maxWidth="md" fullWidth>
        <DialogTitle>編輯感測器</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="感測器名稱"
              value={editingSensor.sensorKey}
              disabled
              margin="normal"
              helperText="感測器名稱無法修改"
            />
            
            <TextField
              fullWidth
              label="描述"
              value={editingSensor.definition.description}
              onChange={(e) => setEditingSensor({
                ...editingSensor,
                definition: { ...editingSensor.definition, description: e.target.value }
              })}
              margin="normal"
              required
            />

            <FormControl component="fieldset" margin="normal">
              <FormLabel component="legend">配置來源</FormLabel>
              <RadioGroup
                row
                value={editingSensor.definition.config_source}
                onChange={(e) => handleConfigSourceChange(e.target.value as 'register' | 'modbus_rtu' | 'distributed_block')}
              >
                <FormControlLabel value="register" control={<Radio />} label="暫存器地址" />
                <FormControlLabel value="modbus_rtu" control={<Radio />} label="Modbus RTU" />
                <FormControlLabel value="distributed_block" control={<Radio />} label="分散式功能區塊" />
              </RadioGroup>
            </FormControl>

            {editingSensor.definition.config_source === 'register' && (
              <TextField
                fullWidth
                label="暫存器地址"
                type="number"
                value={editingSensor.definition.register || ''}
                onChange={(e) => setEditingSensor({
                  ...editingSensor,
                  definition: { ...editingSensor.definition, register: parseInt(e.target.value) }
                })}
                margin="normal"
                required
              />
            )}

            {editingSensor.definition.config_source === 'modbus_rtu' && editingSensor.definition.modbus_rtu && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Modbus RTU 配置</Typography>
                <Grid container spacing={2}>
                  {/* 設備配置區域 */}
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>設備配置</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>設備路徑</InputLabel>
                      <Select
                        value={editingSensor.definition.modbus_rtu.device_path}
                        label="設備路徑"
                        onChange={(e) => handleModbusRtuChange('device_path', e.target.value)}
                      >
                        {availableDevices.map((device) => (
                          <MenuItem key={device} value={device}>
                            {device}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>鮑率</InputLabel>
                      <Select
                        value={editingSensor.definition.modbus_rtu.baud_rate}
                        label="鮑率"
                        onChange={(e) => handleModbusRtuChange('baud_rate', e.target.value)}
                      >
                        <MenuItem value={1200}>1200</MenuItem>
                        <MenuItem value={2400}>2400</MenuItem>
                        <MenuItem value={4800}>4800</MenuItem>
                        <MenuItem value={9600}>9600</MenuItem>
                        <MenuItem value={19200}>19200</MenuItem>
                        <MenuItem value={38400}>38400</MenuItem>
                        <MenuItem value={57600}>57600</MenuItem>
                        <MenuItem value={115200}>115200</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth>
                      <InputLabel>資料位元</InputLabel>
                      <Select
                        value={editingSensor.definition.modbus_rtu.data_bits}
                        label="資料位元"
                        onChange={(e) => handleModbusRtuChange('data_bits', e.target.value)}
                      >
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={6}>6</MenuItem>
                        <MenuItem value={7}>7</MenuItem>
                        <MenuItem value={8}>8</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth>
                      <InputLabel>停止位元</InputLabel>
                      <Select
                        value={editingSensor.definition.modbus_rtu.stop_bits}
                        label="停止位元"
                        onChange={(e) => handleModbusRtuChange('stop_bits', e.target.value)}
                      >
                        <MenuItem value={1}>1</MenuItem>
                        <MenuItem value={2}>2</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth>
                      <InputLabel>奇偶校驗</InputLabel>
                      <Select
                        value={editingSensor.definition.modbus_rtu.parity}
                        label="奇偶校驗"
                        onChange={(e) => handleModbusRtuChange('parity', e.target.value)}
                      >
                        <MenuItem value="none">None</MenuItem>
                        <MenuItem value="odd">Odd</MenuItem>
                        <MenuItem value="even">Even</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="超時 (ms)"
                      type="number"
                      value={editingSensor.definition.modbus_rtu.timeout}
                      onChange={(e) => handleModbusRtuChange('timeout', parseInt(e.target.value))}
                      inputProps={{ min: 100, max: 10000 }}
                    />
                  </Grid>
                  
                  {/* Modbus 協議配置區域 */}
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>Modbus 協議配置</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="從站 ID"
                      type="number"
                      value={editingSensor.definition.modbus_rtu.slave_id}
                      onChange={(e) => handleModbusRtuChange('slave_id', parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 247 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>功能碼</InputLabel>
                      <Select
                        value={editingSensor.definition.modbus_rtu.function_code}
                        label="功能碼"
                        onChange={(e) => handleModbusRtuChange('function_code', e.target.value)}
                      >
                        <MenuItem value={1}>01 - 讀取線圈狀態</MenuItem>
                        <MenuItem value={2}>02 - 讀取離散輸入</MenuItem>
                        <MenuItem value={3}>03 - 讀取保持暫存器</MenuItem>
                        <MenuItem value={4}>04 - 讀取輸入暫存器</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="暫存器地址 (Hex)"
                      value={`0x${editingSensor.definition.modbus_rtu.register_address.toString(16).toUpperCase()}`}
                      onChange={(e) => {
                        let value = e.target.value.replace(/^0x/i, '');
                        const hexValue = parseInt(value, 16);
                        if (!isNaN(hexValue)) {
                          handleModbusRtuChange('register_address', hexValue);
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>資料類型</InputLabel>
                      <Select
                        value={editingSensor.definition.modbus_rtu.data_type}
                        label="資料類型"
                        onChange={(e) => handleModbusRtuChange('data_type', e.target.value)}
                      >
                        <MenuItem value="uint16">UInt16</MenuItem>
                        <MenuItem value="int16">Int16</MenuItem>
                        <MenuItem value="int32">Int32</MenuItem>
                        <MenuItem value="float32">Float32</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>位元組序</InputLabel>
                      <Select
                        value={editingSensor.definition.modbus_rtu.byte_order}
                        label="位元組序"
                        onChange={(e) => handleModbusRtuChange('byte_order', e.target.value)}
                      >
                        <MenuItem value="big">Big Endian</MenuItem>
                        <MenuItem value="little">Little Endian</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>字序</InputLabel>
                      <Select
                        value={editingSensor.definition.modbus_rtu.word_order}
                        label="字序"
                        onChange={(e) => handleModbusRtuChange('word_order', e.target.value)}
                      >
                        <MenuItem value="big">Big Endian</MenuItem>
                        <MenuItem value="little">Little Endian</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}

            {editingSensor.definition.config_source === 'distributed_block' && editingSensor.definition.distributed_block && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>分散式功能區塊配置</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>選擇功能區塊</InputLabel>
                      <Select
                        value={editingSensor.definition.distributed_block.block_id}
                        label="選擇功能區塊"
                        onChange={(e) => handleDistributedBlockChange(e.target.value as string)}
                      >
                        {dynamicFunctionBlocks.map((block) => (
                          <MenuItem key={block.block_id} value={block.block_id}>
                            {block.block_id} - {block.block_type} 
                            {block.device && ` (${block.device})`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>功能區塊詳情</Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" display="block">
                            <strong>區塊 ID:</strong> {editingSensor.definition.distributed_block.block_id}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" display="block">
                            <strong>區塊類型:</strong> {editingSensor.definition.distributed_block.block_type}
                          </Typography>
                        </Grid>
                        
                        {editingSensor.definition.distributed_block.device && (
                          <Grid item xs={6}>
                            <Typography variant="caption" display="block">
                              <strong>設備:</strong> {editingSensor.definition.distributed_block.device}
                            </Typography>
                          </Grid>
                        )}
                        
                        {editingSensor.definition.distributed_block.modbus_address !== undefined && (
                          <Grid item xs={6}>
                            <Typography variant="caption" display="block">
                              <strong>Modbus 地址:</strong> {editingSensor.definition.distributed_block.modbus_address}
                            </Typography>
                          </Grid>
                        )}
                        
                        {editingSensor.definition.distributed_block.ip_address && (
                          <Grid item xs={6}>
                            <Typography variant="caption" display="block">
                              <strong>IP 地址:</strong> {editingSensor.definition.distributed_block.ip_address}
                            </Typography>
                          </Grid>
                        )}
                        
                        {editingSensor.definition.distributed_block.port && (
                          <Grid item xs={6}>
                            <Typography variant="caption" display="block">
                              <strong>端口:</strong> {editingSensor.definition.distributed_block.port}
                            </Typography>
                          </Grid>
                        )}
                        
                        {editingSensor.definition.distributed_block.register !== undefined && (
                          <Grid item xs={6}>
                            <Typography variant="caption" display="block">
                              <strong>暫存器:</strong> {editingSensor.definition.distributed_block.register}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="單位"
                  value={editingSensor.definition.unit || ''}
                  onChange={(e) => setEditingSensor({
                    ...editingSensor,
                    definition: { ...editingSensor.definition, unit: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="精度"
                  type="number"
                  step="0.1"
                  value={editingSensor.definition.precision || ''}
                  onChange={(e) => setEditingSensor({
                    ...editingSensor,
                    definition: { ...editingSensor.definition, precision: parseFloat(e.target.value) }
                  })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="轉換係數"
                  type="number"
                  step="0.1"
                  value={editingSensor.definition.conversion_factor || ''}
                  onChange={(e) => setEditingSensor({
                    ...editingSensor,
                    definition: { ...editingSensor.definition, conversion_factor: parseFloat(e.target.value) }
                  })}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="最小實際值"
                  type="number"
                  value={editingSensor.definition.min_actual || ''}
                  onChange={(e) => setEditingSensor({
                    ...editingSensor,
                    definition: { ...editingSensor.definition, min_actual: parseFloat(e.target.value) }
                  })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="最大實際值"
                  type="number"
                  value={editingSensor.definition.max_actual || ''}
                  onChange={(e) => setEditingSensor({
                    ...editingSensor,
                    definition: { ...editingSensor.definition, max_actual: parseFloat(e.target.value) }
                  })}
                />
              </Grid>
            </Grid>

            {/* 顯示連接測試結果 */}
            {connectionResults[editingSensor.sensorKey] && (
              <Alert 
                severity={connectionResults[editingSensor.sensorKey].success ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                {connectionResults[editingSensor.sensorKey].message}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {editingSensor?.definition.config_source === 'modbus_rtu' && editingSensor.definition.modbus_rtu && (
            <Button 
              onClick={() => testModbusConnection(editingSensor.sensorKey, editingSensor.definition.modbus_rtu!)}
              startIcon={testingConnection === editingSensor.sensorKey ? <CircularProgress size={16} /> : <PlayArrowIcon />}
              disabled={testingConnection === editingSensor.sensorKey}
              color="info"
            >
              測試連接
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={handleSensorCancel} startIcon={<CancelIcon />}>
            取消
          </Button>
          <Button onClick={handleSensorSave} variant="contained" startIcon={<SaveIcon />}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">
                機種配置: {machineName}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {machineType}
              </Typography>
            </Box>
            {readOnly && (
              <Chip label="唯讀模式" color="warning" size="small" />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {Object.entries(config).map(([typeKey, typeConfig]) => (
              <Accordion
                key={typeKey}
                expanded={expandedPanels.includes(typeKey)}
                onChange={handlePanelChange(typeKey)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6">
                      {getSensorTypeIcon(typeKey)} {typeConfig.name}
                    </Typography>
                    <Chip
                      label={`${Object.keys(typeConfig.sensors).length} 個感測器`}
                      color={getSensorTypeColor(typeKey)}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {renderSensorTable(typeKey, typeConfig.sensors)}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>
            {readOnly ? '關閉' : '取消'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} variant="contained">
              保存配置
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {renderEditDialog()}
    </>
  );
};

export default MachineConfigDialog;
