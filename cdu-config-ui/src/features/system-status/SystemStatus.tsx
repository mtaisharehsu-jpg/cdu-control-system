
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { getMachineConfigs, setCurrentMachine, formatApiError } from '../../api/simpleApi';
import { useMachineConfig } from '../../contexts/MachineConfigContext';

const SystemStatus = () => {
  const { selectedMachineType, setSelectedMachineType, machineConfigs } = useMachineConfig();
  
  const [availableMachines, setAvailableMachines] = useState<Array<{key: string, name: string}>>([]);
  const [currentMachine, setCurrentMachineState] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 載入機種列表
  useEffect(() => {
    const loadMachineConfigs = async () => {
      try {
        setLoading(true);
        
        // 使用 Context 中的動態機種配置
        console.log('🔧 Loading machine configs from context:', machineConfigs);
        
        // 從 Context 取得所有可用的機種（包括動態配置）
        const machines = Object.entries(machineConfigs).map(([key, config]) => ({
          key,
          name: config.machine_name || key
        }));
        
        setAvailableMachines(machines);
        
        // 設定當前選擇的機種
        if (selectedMachineType) {
          setCurrentMachineState(selectedMachineType);
          setSelectedModel(selectedMachineType);
        } else if (machines.length > 0) {
          // 優先選擇動態配置
          const defaultMachine = machines.find(m => m.key === 'dynamic_distributed_model') || machines[0];
          setCurrentMachineState(defaultMachine.key);
          setSelectedModel(defaultMachine.key);
          setSelectedMachineType(defaultMachine.key);
        }
        
        setError(null);
        console.log('✅ Machine configs loaded successfully:', machines);
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setLoading(false);
      }
    };

    // 只有當 machineConfigs 有數據時才載入
    if (Object.keys(machineConfigs).length > 0) {
      loadMachineConfigs();
    }
  }, [machineConfigs, selectedMachineType, setSelectedMachineType]);

  // 處理切換機種
  const handleSwitchMachine = async () => {
    if (!selectedModel || selectedModel === currentMachine) return;

    try {
      setSwitching(true);
      
      // 如果是動態配置，直接更新狀態，不需要調用API
      if (selectedModel === 'dynamic_distributed_model') {
        console.log('🔄 Switching to dynamic distributed model');
        setSelectedMachineType(selectedModel);
        setCurrentMachineState(selectedModel);
        
        // 保存到 localStorage
        localStorage.setItem('selectedMachineType', selectedModel);
      } else {
        // 靜態配置需要調用API
        await setCurrentMachine(selectedModel);
        setSelectedMachineType(selectedModel);
        setCurrentMachineState(selectedModel);
      }
      
      setError(null);
      console.log('✅ Machine switched successfully to:', selectedModel);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>當前系統狀態</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography>
          當前生效機種: <strong>{currentMachine}</strong>
          {availableMachines.find(m => m.key === currentMachine)?.name && 
            ` (${availableMachines.find(m => m.key === currentMachine)?.name})`
          }
        </Typography>
      </Alert>

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>切換系統配置</Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="model-select-label">選擇目標機種</InputLabel>
          <Select
            labelId="model-select-label"
            value={selectedModel}
            label="選擇目標機種"
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={switching}
          >
            {availableMachines.map(machine => (
              <MenuItem key={machine.key} value={machine.key}>
                {machine.name} ({machine.key})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleSwitchMachine}
          disabled={switching || !selectedModel || selectedModel === currentMachine}
        >
          {switching ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              切換中...
            </>
          ) : (
            '切換並生效'
          )}
        </Button>
      </Box>
    </Paper>
  );
};

export default SystemStatus;
