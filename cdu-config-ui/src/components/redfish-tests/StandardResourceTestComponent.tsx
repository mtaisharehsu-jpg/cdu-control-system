/**
 * Standard Redfish Resource Test Component
 * 
 * Tests standard Redfish Systems and Chassis resource endpoints
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
  Collapse
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
  getRedfishSystems,
  getRedfishCDUSystem,
  getRedfishSystemActions,
  getRedfishChassis,
  getRedfishCDUChassis,
  getRedfishThermal,
  getRedfishPower,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

const StandardResourceTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

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
        標準Redfish資源測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試DMTF Redfish標準Systems和Chassis資源端點，包括系統信息、機箱資源、電源和散熱管理。
      </Typography>
      
      {renderTestButton(
        'systemsCollection',
        'Systems集合',
        () => executeTest('systemsCollection', getRedfishSystems),
        'GET /redfish/v1/Systems - 獲取系統資源集合'
      )}

      {renderTestButton(
        'cduSystem',
        'CDU系統資源',
        () => executeTest('cduSystem', getRedfishCDUSystem),
        'GET /redfish/v1/Systems/CDU1 - 獲取CDU系統詳細信息'
      )}

      {renderTestButton(
        'systemActions',
        '系統操作端點',
        () => executeTest('systemActions', getRedfishSystemActions),
        'GET /redfish/v1/Systems/CDU1/Actions - 獲取可用系統操作'
      )}

      {renderTestButton(
        'chassisCollection',
        'Chassis集合',
        () => executeTest('chassisCollection', getRedfishChassis),
        'GET /redfish/v1/Chassis - 獲取機箱資源集合'
      )}

      {renderTestButton(
        'cduChassis',
        'CDU機箱資源',
        () => executeTest('cduChassis', getRedfishCDUChassis),
        'GET /redfish/v1/Chassis/CDU_Main - 獲取CDU機箱詳細信息'
      )}

      {renderTestButton(
        'thermalResource',
        '散熱資源',
        () => executeTest('thermalResource', getRedfishThermal),
        'GET /redfish/v1/Chassis/CDU_Main/Thermal - 獲取散熱管理信息'
      )}

      {renderTestButton(
        'powerResource',
        '電源資源',
        () => executeTest('powerResource', getRedfishPower),
        'GET /redfish/v1/Chassis/CDU_Main/Power - 獲取電源管理信息'
      )}

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面測試標準Redfish Systems和Chassis資源，這些是系統管理的核心端點。
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default StandardResourceTestComponent;