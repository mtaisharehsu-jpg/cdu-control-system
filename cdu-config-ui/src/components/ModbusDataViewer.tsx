/**
 * Modbus RTU Data Viewer Component
 * 
 * 顯示 Modbus RTU 感測器數據讀取結果
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Button,
  Grid,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  Cable as CableIcon
} from '@mui/icons-material';
import { SensorConfig, SensorDefinition } from '../api/simpleApi';
import { modbusRtuService, ModbusSensorData } from '../services/modbusRtuService';

interface ModbusDataViewerProps {
  sensorConfig: SensorConfig;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ModbusDataViewer: React.FC<ModbusDataViewerProps> = ({
  sensorConfig,
  autoRefresh = true,
  refreshInterval = 2000
}) => {
  const [sensorData, setSensorData] = useState<ModbusSensorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string>('');

  // 收集所有 Modbus RTU 感測器
  const getModbusSensors = (): Record<string, SensorDefinition> => {
    const modbusSensors: Record<string, SensorDefinition> = {};
    
    Object.entries(sensorConfig).forEach(([typeKey, typeConfig]) => {
      Object.entries(typeConfig.sensors).forEach(([sensorKey, sensor]) => {
        if (sensor.config_source === 'modbus_rtu' && sensor.modbus_rtu) {
          modbusSensors[`${typeKey}.${sensorKey}`] = sensor;
        }
      });
    });
    
    return modbusSensors;
  };

  const refreshData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const modbusSensors = getModbusSensors();
      const results = await modbusRtuService.readMultipleSensors(modbusSensors);
      setSensorData(results);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : '數據讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  const refreshSingleSensor = async (sensorKey: string, definition: SensorDefinition) => {
    try {
      const result = await modbusRtuService.readSensorData(sensorKey, definition);
      if (result) {
        setSensorData(prev => {
          const filtered = prev.filter(item => item.sensorKey !== sensorKey);
          return [...filtered, result];
        });
      }
    } catch (err) {
      console.error(`Failed to refresh sensor ${sensorKey}:`, err);
    }
  };

  const testConnection = async (sensorData: ModbusSensorData) => {
    try {
      const result = await modbusRtuService.testConnection(sensorData.config);
      // 更新該感測器的連接狀態
      setSensorData(prev =>
        prev.map(item =>
          item.sensorKey === sensorData.sensorKey
            ? { ...item, result }
            : item
        )
      );
    } catch (err) {
      console.error(`Connection test failed for ${sensorData.sensorKey}:`, err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [sensorConfig]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (success: boolean, value?: number) => {
    if (!success) return 'error';
    if (value === undefined) return 'warning';
    return 'success';
  };

  const getStatusIcon = (success: boolean, value?: number) => {
    if (!success) return <ErrorIcon />;
    if (value === undefined) return <WarningIcon />;
    return <CheckCircleIcon />;
  };

  const formatValue = (data: ModbusSensorData) => {
    if (!data.result.success || data.result.value === undefined) {
      return '--';
    }
    
    const value = data.result.value;
    const precision = data.precision || 2;
    return `${value.toFixed(precision)}${data.unit ? ` ${data.unit}` : ''}`;
  };

  if (sensorData.length === 0 && !loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CableIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              沒有配置 Modbus RTU 感測器
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              請在機種配置中添加 Modbus RTU 感測器
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">
                <CableIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Modbus RTU 數據監控
              </Typography>
              <Chip 
                label={`${sensorData.length} 個感測器`} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {lastUpdate && (
                <Typography variant="caption" color="textSecondary">
                  最後更新: {lastUpdate}
                </Typography>
              )}
              <Button
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={refreshData}
                disabled={loading}
                size="small"
              >
                刷新全部
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>感測器</TableCell>
                  <TableCell>設備配置</TableCell>
                  <TableCell>狀態</TableCell>
                  <TableCell>當前值</TableCell>
                  <TableCell>原始值</TableCell>
                  <TableCell>更新時間</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sensorData.map((data) => (
                  <TableRow key={data.sensorKey} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {data.sensorName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" fontFamily="monospace">
                          {data.sensorKey}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="caption" display="block" fontWeight="bold">
                          {data.config.device_path}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {data.config.baud_rate} bps, {data.config.data_bits}{data.config.parity.charAt(0).toUpperCase()}{data.config.stop_bits}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Slave: {data.config.slave_id}, FC: {data.config.function_code}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Addr: 0x{data.config.register_address.toString(16).toUpperCase()}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(data.result.success, data.result.value)}
                        label={data.result.success ? '正常' : '錯誤'}
                        color={getStatusColor(data.result.success, data.result.value)}
                        size="small"
                      />
                      {data.result.error && (
                        <Tooltip title={data.result.error}>
                          <Typography variant="caption" color="error" display="block">
                            {data.result.error.length > 20 
                              ? `${data.result.error.substring(0, 20)}...` 
                              : data.result.error
                            }
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {formatValue(data)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {data.result.rawValue !== undefined 
                          ? `${data.result.rawValue} (${data.config.data_type})`
                          : '--'
                        }
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(data.result.timestamp).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="刷新數據">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const modbusSensors = getModbusSensors();
                              const definition = modbusSensors[data.sensorKey];
                              if (definition) {
                                refreshSingleSensor(data.sensorKey, definition);
                              }
                            }}
                          >
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="測試連接">
                          <IconButton
                            size="small"
                            onClick={() => testConnection(data)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 統計信息 */}
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {sensorData.length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    總感測器數
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="success.main">
                    {sensorData.filter(d => d.result.success).length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    正常連接
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="error.main">
                    {sensorData.filter(d => !d.result.success).length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    連接錯誤
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="info.main">
                    {new Set(sensorData.map(d => d.config.device_path)).size}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    設備數量
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ModbusDataViewer;