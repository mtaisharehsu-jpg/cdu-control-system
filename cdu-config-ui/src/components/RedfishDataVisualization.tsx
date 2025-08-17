/**
 * Redfish Data Visualization Component
 * 
 * Provides data visualization for Redfish API test results
 * Including sensor readings charts, alarm statistics, and system health metrics
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  TrendingUp as TrendIcon,
  Warning as WarningIcon,
  CheckCircle as HealthIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import type { 
  RedfishSensorReading, 
  AlarmStatistics, 
  RedfishFunctionBlockConfig 
} from '../api/cduApi';

interface RedfishDataVisualizationProps {
  sensorReadings?: RedfishSensorReading[];
  alarmStatistics?: AlarmStatistics;
  functionBlocksConfig?: RedfishFunctionBlockConfig;
  testResults?: Record<string, any>;
}

const RedfishDataVisualization: React.FC<RedfishDataVisualizationProps> = ({
  sensorReadings = [],
  alarmStatistics,
  functionBlocksConfig,
  testResults = {}
}) => {

  // 計算感測器統計
  const getSensorStatistics = () => {
    const stats = {
      temperature: { count: 0, min: Infinity, max: -Infinity, avg: 0 },
      pressure: { count: 0, min: Infinity, max: -Infinity, avg: 0 },
      flow: { count: 0, min: Infinity, max: -Infinity, avg: 0 },
      total: sensorReadings.length,
      healthy: sensorReadings.filter(s => s.health === 'OK').length,
      warning: sensorReadings.filter(s => s.health === 'Warning').length,
      critical: sensorReadings.filter(s => s.health === 'Critical').length
    };

    sensorReadings.forEach(sensor => {
      if (sensor.unit === '°C' && sensor.value > -1) {
        stats.temperature.count++;
        stats.temperature.min = Math.min(stats.temperature.min, sensor.value);
        stats.temperature.max = Math.max(stats.temperature.max, sensor.value);
        stats.temperature.avg += sensor.value;
      } else if (sensor.unit === 'Bar' && sensor.value > -1) {
        stats.pressure.count++;
        stats.pressure.min = Math.min(stats.pressure.min, sensor.value);
        stats.pressure.max = Math.max(stats.pressure.max, sensor.value);
        stats.pressure.avg += sensor.value;
      } else if (sensor.unit === 'L/min' && sensor.value > -1) {
        stats.flow.count++;
        stats.flow.min = Math.min(stats.flow.min, sensor.value);
        stats.flow.max = Math.max(stats.flow.max, sensor.value);
        stats.flow.avg += sensor.value;
      }
    });

    // 計算平均值
    if (stats.temperature.count > 0) {
      stats.temperature.avg = stats.temperature.avg / stats.temperature.count;
    }
    if (stats.pressure.count > 0) {
      stats.pressure.avg = stats.pressure.avg / stats.pressure.count;
    }
    if (stats.flow.count > 0) {
      stats.flow.avg = stats.flow.avg / stats.flow.count;
    }

    return stats;
  };

  // 計算系統健康度評分
  const getSystemHealthScore = () => {
    const stats = getSensorStatistics();
    let score = 100;

    // 根據感測器健康狀態扣分
    score -= (stats.warning * 10);
    score -= (stats.critical * 30);

    // 根據警報統計扣分
    if (alarmStatistics) {
      score -= (alarmStatistics.total_active * 5);
    }

    return Math.max(0, Math.min(100, score));
  };

  // 計算測試成功率
  const getTestSuccessRate = () => {
    const testNames = Object.keys(testResults);
    if (testNames.length === 0) return 0;
    
    const successCount = testNames.filter(name => testResults[name]?.success).length;
    return (successCount / testNames.length) * 100;
  };

  const sensorStats = getSensorStatistics();
  const systemHealthScore = getSystemHealthScore();
  const testSuccessRate = getTestSuccessRate();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        數據可視化儀表板
      </Typography>

      {/* 系統概覽指標 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <HealthIcon color="primary" />
                <Typography variant="h6">系統健康度</Typography>
              </Box>
              <Typography variant="h4" color={systemHealthScore > 80 ? 'success.main' : systemHealthScore > 60 ? 'warning.main' : 'error.main'}>
                {systemHealthScore.toFixed(0)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={systemHealthScore} 
                color={systemHealthScore > 80 ? 'success' : systemHealthScore > 60 ? 'warning' : 'error'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <SpeedIcon color="primary" />
                <Typography variant="h6">感測器總數</Typography>
              </Box>
              <Typography variant="h4">{sensorStats.total}</Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip label={`健康: ${sensorStats.healthy}`} color="success" size="small" />
                <Chip label={`警告: ${sensorStats.warning}`} color="warning" size="small" />
                <Chip label={`嚴重: ${sensorStats.critical}`} color="error" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <WarningIcon color="primary" />
                <Typography variant="h6">活躍警報</Typography>
              </Box>
              <Typography variant="h4" color={alarmStatistics?.total_active ? 'error.main' : 'success.main'}>
                {alarmStatistics?.total_active || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                已確認: {alarmStatistics?.total_acknowledged || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendIcon color="primary" />
                <Typography variant="h6">API測試成功率</Typography>
              </Box>
              <Typography variant="h4" color={testSuccessRate > 80 ? 'success.main' : testSuccessRate > 60 ? 'warning.main' : 'error.main'}>
                {testSuccessRate.toFixed(0)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={testSuccessRate} 
                color={testSuccessRate > 80 ? 'success' : testSuccessRate > 60 ? 'warning' : 'error'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 感測器數據統計 */}
      {sensorReadings.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  溫度感測器統計
                </Typography>
                {sensorStats.temperature.count > 0 ? (
                  <Box>
                    <Typography variant="body2">數量: {sensorStats.temperature.count}</Typography>
                    <Typography variant="body2">最小值: {sensorStats.temperature.min.toFixed(1)}°C</Typography>
                    <Typography variant="body2">最大值: {sensorStats.temperature.max.toFixed(1)}°C</Typography>
                    <Typography variant="body2">平均值: {sensorStats.temperature.avg.toFixed(1)}°C</Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">無溫度數據</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  壓力感測器統計
                </Typography>
                {sensorStats.pressure.count > 0 ? (
                  <Box>
                    <Typography variant="body2">數量: {sensorStats.pressure.count}</Typography>
                    <Typography variant="body2">最小值: {sensorStats.pressure.min.toFixed(2)} Bar</Typography>
                    <Typography variant="body2">最大值: {sensorStats.pressure.max.toFixed(2)} Bar</Typography>
                    <Typography variant="body2">平均值: {sensorStats.pressure.avg.toFixed(2)} Bar</Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">無壓力數據</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  流量感測器統計
                </Typography>
                {sensorStats.flow.count > 0 ? (
                  <Box>
                    <Typography variant="body2">數量: {sensorStats.flow.count}</Typography>
                    <Typography variant="body2">最小值: {sensorStats.flow.min.toFixed(1)} L/min</Typography>
                    <Typography variant="body2">最大值: {sensorStats.flow.max.toFixed(1)} L/min</Typography>
                    <Typography variant="body2">平均值: {sensorStats.flow.avg.toFixed(1)} L/min</Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">無流量數據</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 警報統計圖表 */}
      {alarmStatistics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              警報統計分析
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>按等級分類</Typography>
                {Object.entries(alarmStatistics.by_level).map(([level, count]) => (
                  <Box key={level} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">{level}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(count / Math.max(alarmStatistics.total_active, 1)) * 100} 
                        sx={{ width: 100 }}
                        color={level === 'Critical' ? 'error' : level === 'Major' ? 'warning' : 'info'}
                      />
                      <Typography variant="body2">{count}</Typography>
                    </Box>
                  </Box>
                ))}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>按類別分類</Typography>
                {Object.entries(alarmStatistics.by_category).map(([category, count]) => (
                  <Box key={category} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">{category}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(count / Math.max(alarmStatistics.total_active, 1)) * 100} 
                        sx={{ width: 100 }}
                      />
                      <Typography variant="body2">{count}</Typography>
                    </Box>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 功能區塊配置概覽 */}
      {functionBlocksConfig && functionBlocksConfig.function_blocks && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              功能區塊配置概覽
            </Typography>
            
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {functionBlocksConfig.description}
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>區塊ID</TableCell>
                    <TableCell>類型</TableCell>
                    <TableCell>感測器類別</TableCell>
                    <TableCell>單位</TableCell>
                    <TableCell>範圍</TableCell>
                    <TableCell>精度</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {functionBlocksConfig.function_blocks.slice(0, 20).map((block) => (
                    <TableRow key={block.block_id}>
                      <TableCell>{block.block_id}</TableCell>
                      <TableCell>{block.block_type}</TableCell>
                      <TableCell>
                        <Chip 
                          label={block.sensor_category} 
                          size="small"
                          color={
                            block.sensor_category === 'temperature' ? 'error' :
                            block.sensor_category === 'pressure' ? 'info' :
                            block.sensor_category === 'flow' ? 'success' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{block.unit}</TableCell>
                      <TableCell>{block.min_actual}-{block.max_actual}</TableCell>
                      <TableCell>{block.precision}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {functionBlocksConfig.function_blocks.length > 20 && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                顯示前20個功能區塊，總計 {functionBlocksConfig.function_blocks.length} 個
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* 實時感測器數據表格 */}
      {sensorReadings.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              實時感測器數據
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>感測器ID</TableCell>
                    <TableCell>類型</TableCell>
                    <TableCell>數值</TableCell>
                    <TableCell>單位</TableCell>
                    <TableCell>狀態</TableCell>
                    <TableCell>健康狀況</TableCell>
                    <TableCell>設備</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sensorReadings.filter(sensor => sensor.value > -1).map((sensor) => (
                    <TableRow key={sensor.block_id}>
                      <TableCell>{sensor.block_id}</TableCell>
                      <TableCell>{sensor.block_type}</TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold',
                          color: sensor.unit === '°C' ? 'error.main' : 
                                 sensor.unit === 'Bar' ? 'info.main' : 
                                 sensor.unit === 'L/min' ? 'success.main' : 'inherit'
                        }}
                      >
                        {sensor.value.toFixed(sensor.unit === 'Bar' ? 2 : 1)}
                      </TableCell>
                      <TableCell>{sensor.unit}</TableCell>
                      <TableCell>
                        <Chip 
                          label={sensor.status} 
                          size="small"
                          color={sensor.status === 'Enabled' ? 'success' : sensor.status === 'Connected' ? 'info' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={sensor.health} 
                          size="small"
                          color={sensor.health === 'OK' ? 'success' : sensor.health === 'Warning' ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{sensor.device || sensor.register ? `R${10000 + (sensor.register || 0)}` : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default RedfishDataVisualization;