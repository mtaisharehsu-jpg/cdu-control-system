/**
 * Machine Statistics Card Component
 * 
 * This component displays statistics and overview information about machine configurations.
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

interface MachineStatsCardProps {
  totalMachines: number;
  predefinedMachines: number;
  customMachines: number;
  currentMachine: string;
  currentMachineName: string;
  totalSensors: number;
  activeSensors: number;
}

const MachineStatsCard: React.FC<MachineStatsCardProps> = ({
  totalMachines,
  predefinedMachines,
  customMachines,
  currentMachine,
  currentMachineName,
  totalSensors,
  activeSensors
}) => {
  const sensorUtilization = totalSensors > 0 ? (activeSensors / totalSensors) * 100 : 0;

  const getUtilizationColor = (percentage: number): 'primary' | 'warning' | 'error' => {
    if (percentage >= 70) return 'primary';
    if (percentage >= 40) return 'warning';
    return 'error';
  };

  const getUtilizationLabel = (percentage: number): string => {
    if (percentage >= 70) return '良好';
    if (percentage >= 40) return '一般';
    return '需要注意';
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SettingsIcon sx={{ mr: 1 }} />
          機種管理概覽
        </Typography>

        <Grid container spacing={3}>
          {/* Current Machine Info */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                當前使用機種
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {currentMachineName}
                </Typography>
              </Box>
              <Chip 
                label={currentMachine} 
                size="small" 
                variant="outlined"
                sx={{ fontFamily: 'monospace' }}
              />
            </Box>
          </Grid>

          {/* Machine Count Stats */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                機種統計
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {totalMachines}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    總機種數
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary">
                    {predefinedMachines}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    預定義
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {customMachines}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    自定義
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Sensor Utilization */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MemoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="subtitle1">
                感測器使用情況
              </Typography>
            </Box>
            
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 120 }}>
                    使用率: {sensorUtilization.toFixed(1)}%
                  </Typography>
                  <Box sx={{ flexGrow: 1, mx: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={sensorUtilization}
                      color={getUtilizationColor(sensorUtilization)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Chip
                    label={getUtilizationLabel(sensorUtilization)}
                    size="small"
                    color={getUtilizationColor(sensorUtilization)}
                  />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {activeSensors} / {totalSensors} 個感測器正常運行
                </Typography>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="success.main">
                      {activeSensors}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      正常
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="error.main">
                      {totalSensors - activeSensors}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      異常
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          {/* Performance Indicators */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SpeedIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="subtitle1">
                系統指標
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                  <Typography variant="h6" color="success.main">
                    {predefinedMachines > 0 ? '✓' : '✗'}
                  </Typography>
                  <Typography variant="caption">
                    預定義機種
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                  <Typography variant="h6" color="info.main">
                    {customMachines > 0 ? '✓' : '✗'}
                  </Typography>
                  <Typography variant="caption">
                    自定義機種
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                  <Typography variant="h6" color="warning.main">
                    {sensorUtilization > 50 ? '✓' : '✗'}
                  </Typography>
                  <Typography variant="caption">
                    感測器覆蓋
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'secondary.50', borderRadius: 1 }}>
                  <Typography variant="h6" color="secondary.main">
                    {totalMachines >= 3 ? '✓' : '✗'}
                  </Typography>
                  <Typography variant="caption">
                    機種多樣性
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default MachineStatsCard;
