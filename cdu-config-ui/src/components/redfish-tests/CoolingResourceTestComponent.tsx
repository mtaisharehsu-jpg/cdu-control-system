/**
 * DMTF 2024.4 Cooling Resource Test Component
 * 
 * Tests DMTF 2024.4 standard cooling resource endpoints
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

// Import API functions
import {
  getRedfishThermalSubsystem,
  getRedfishThermalMetrics,
  getRedfishCoolingUnits,
  getRedfishCDUCoolingUnit,
  getRedfishCoolingLoops,
  getRedfishPrimaryCoolingLoop,
  getRedfishPumps,
  getRedfishPump,
  getRedfishCoolantConnectors,
  getRedfishCoolantConnector,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

const CoolingResourceTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [selectedPumpId, setSelectedPumpId] = useState('Pump1');
  const [selectedConnectorId, setSelectedConnectorId] = useState('Inlet1');
  
  const pumpIds = ['Pump1', 'Pump2', 'Pump3', 'Pump4'];
  const connectorIds = ['Inlet1', 'Inlet2', 'Outlet1', 'Outlet2'];

  const setTestLoading = (testName: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [testName]: isLoading }));
  };

  const setTestResult = (testName: string, result: TestResult) => {
    setResults(prev => ({ 
      ...prev, 
      [testName]: { 
        ...result, 
        timestamp: new Date().toISOString() 
      }
    }));
  };

  const executeTest = async (testName: string, testFn: () => Promise<any>) => {
    setTestLoading(testName, true);
    const startTime = Date.now();
    
    try {
      const data = await testFn();
      const duration = Date.now() - startTime;
      setTestResult(testName, { success: true, data, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      setTestResult(testName, { 
        success: false, 
        error: formatApiError(error), 
        duration 
      });
    } finally {
      setTestLoading(testName, false);
    }
  };

  const toggleResultExpansion = (testName: string) => {
    setExpandedResults(prev => ({ ...prev, [testName]: !prev[testName] }));
  };

  const renderTestButton = (
    testName: string, 
    label: string, 
    testFn: () => void,
    description?: string
  ) => {
    const isLoading = loading[testName];
    const result = results[testName];
    const isExpanded = expandedResults[testName];

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box>
              <Typography variant="h6">{label}</Typography>
              {description && (
                <Typography variant="body2" color="textSecondary">
                  {description}
                </Typography>
              )}
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {result && (
                <Chip
                  icon={result.success ? <SuccessIcon /> : <ErrorIcon />}
                  label={result.success ? 'Success' : 'Failed'}
                  color={result.success ? 'success' : 'error'}
                  size="small"
                />
              )}
              <Button
                variant="contained"
                onClick={testFn}
                disabled={isLoading}
                startIcon={<RunIcon />}
                color={result?.success ? 'success' : result?.error ? 'error' : 'primary'}
              >
                {isLoading ? 'Testing...' : 'Test'}
              </Button>
            </Box>
          </Box>

          {result && (
            <Box mt={2}>
              <Alert 
                severity={result.success ? 'success' : 'error'}
                action={
                  result.data && (
                    <IconButton
                      size="small"
                      onClick={() => toggleResultExpansion(testName)}
                    >
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  )
                }
              >
                <Box>
                  <Typography variant="body2">
                    {result.success 
                      ? `✅ Test completed successfully` 
                      : `❌ Test failed: ${result.error}`
                    }
                  </Typography>
                  {result.duration && (
                    <Typography variant="caption" color="textSecondary">
                      Duration: {result.duration}ms | {result.timestamp}
                    </Typography>
                  )}
                </Box>
              </Alert>

              {result.data && (
                <Collapse in={isExpanded}>
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',
                      backgroundColor: '#f5f5f5',
                      padding: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 400,
                      mt: 1
                    }}
                  >
                    {JSON.stringify(result.data, null, 2)}
                  </Box>
                </Collapse>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        DMTF 2024.4冷卻資源測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試最新DMTF Redfish 2024.4標準的冷卻資源端點，包括冷卻單元、冷卻回路、泵和冷卻劑連接器。
      </Typography>
      
      {renderTestButton(
        'thermalSubsystem',
        '散熱子系統',
        () => executeTest('thermalSubsystem', getRedfishThermalSubsystem),
        'GET /redfish/v1/Chassis/CDU_Main/ThermalSubsystem - 獲取散熱子系統信息'
      )}

      {renderTestButton(
        'thermalMetrics',
        '散熱指標',
        () => executeTest('thermalMetrics', getRedfishThermalMetrics),
        'GET /redfish/v1/Chassis/CDU_Main/ThermalSubsystem/ThermalMetrics - 獲取散熱性能指標'
      )}

      {renderTestButton(
        'coolingUnits',
        '冷卻單元集合',
        () => executeTest('coolingUnits', getRedfishCoolingUnits),
        'GET /redfish/v1/ThermalEquipment/CoolingUnits - 獲取冷卻單元集合'
      )}

      {renderTestButton(
        'cduCoolingUnit',
        'CDU冷卻單元',
        () => executeTest('cduCoolingUnit', getRedfishCDUCoolingUnit),
        'GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1 - 獲取CDU冷卻單元詳細信息'
      )}

      {renderTestButton(
        'coolingLoops',
        '冷卻回路集合',
        () => executeTest('coolingLoops', getRedfishCoolingLoops),
        'GET /redfish/v1/ThermalEquipment/CoolingLoops - 獲取冷卻回路集合'
      )}

      {renderTestButton(
        'primaryCoolingLoop',
        '主冷卻回路',
        () => executeTest('primaryCoolingLoop', getRedfishPrimaryCoolingLoop),
        'GET /redfish/v1/ThermalEquipment/CoolingLoops/Primary - 獲取主冷卻回路詳細信息'
      )}

      {renderTestButton(
        'pumpsCollection',
        '泵設備集合',
        () => executeTest('pumpsCollection', getRedfishPumps),
        'GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1/Pumps - 獲取泵設備集合'
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            特定泵設備測試
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>選擇泵ID</InputLabel>
            <Select
              value={selectedPumpId}
              onChange={(e) => setSelectedPumpId(e.target.value)}
            >
              {pumpIds.map(id => (
                <MenuItem key={id} value={id}>{id}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => executeTest(`pump_${selectedPumpId}`, 
              () => getRedfishPump(selectedPumpId))}
            startIcon={<RunIcon />}
          >
            測試 GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1/Pumps/{selectedPumpId}
          </Button>
        </CardContent>
      </Card>

      {renderTestButton(
        'coolantConnectors',
        '冷卻劑連接器集合',
        () => executeTest('coolantConnectors', getRedfishCoolantConnectors),
        'GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1/CoolantConnectors - 獲取冷卻劑連接器集合'
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            特定冷卻劑連接器測試
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>選擇連接器ID</InputLabel>
            <Select
              value={selectedConnectorId}
              onChange={(e) => setSelectedConnectorId(e.target.value)}
            >
              {connectorIds.map(id => (
                <MenuItem key={id} value={id}>{id}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => executeTest(`coolantConnector_${selectedConnectorId}`, 
              () => getRedfishCoolantConnector(selectedConnectorId))}
            startIcon={<RunIcon />}
          >
            測試 GET /redfish/v1/ThermalEquipment/CoolingUnits/CDU1/CoolantConnectors/{selectedConnectorId}
          </Button>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面測試DMTF 2024.4標準的冷卻設備資源，包括最新的液體冷卻管理端點。
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default CoolingResourceTestComponent;