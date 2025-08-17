/**
 * Machine Import/Export Component
 * 
 * This component provides functionality to import and export machine configurations.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { type MachineConfigRequest, type SensorConfig } from '../../api/simpleApi';

interface MachineImportExportProps {
  open: boolean;
  onClose: () => void;
  onImport?: (config: MachineConfigRequest) => void;
  exportData?: {
    machineType: string;
    machineName: string;
    description: string;
    sensorConfig: SensorConfig;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const MachineImportExport: React.FC<MachineImportExportProps> = ({
  open,
  onClose,
  onImport,
  exportData
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setImportError(null);
  };

  const handleImport = () => {
    try {
      const config = JSON.parse(importText) as MachineConfigRequest;
      
      // Validate required fields
      if (!config.machine_type || !config.machine_name || !config.sensor_config) {
        throw new Error('配置格式不正確：缺少必要欄位');
      }

      // Validate sensor config structure
      const requiredTypes = ['temperature', 'pressure', 'flow', 'io'];
      for (const type of requiredTypes) {
        if (!config.sensor_config[type as keyof SensorConfig]) {
          throw new Error(`配置格式不正確：缺少 ${type} 感測器配置`);
        }
      }

      if (onImport) {
        onImport(config);
      }
      
      setImportText('');
      setImportError(null);
      onClose();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '配置格式不正確');
    }
  };

  const handleExport = () => {
    if (!exportData) return;

    const configJson = JSON.stringify(exportData, null, 2);
    
    // Create and download file
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportData.machineType}_config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    if (!exportData) return;

    try {
      const configJson = JSON.stringify(exportData, null, 2);
      await navigator.clipboard.writeText(configJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getExportJson = () => {
    if (!exportData) return '';
    return JSON.stringify(exportData, null, 2);
  };

  const getSampleConfig = () => {
    return JSON.stringify({
      machine_type: "sample_machine",
      machine_name: "範例機種",
      description: "這是一個範例機種配置",
      sensor_config: {
        temperature: {
          name: "溫度訊息",
          sensors: {
            sample_temp: {
              register: 10111,
              description: "範例溫度感測器",
              precision: 0.1,
              unit: "℃",
              min_raw: 100,
              max_raw: 800,
              min_actual: 10.0,
              max_actual: 80.0,
              conversion_factor: 0.1
            }
          }
        },
        pressure: {
          name: "壓力訊息",
          sensors: {}
        },
        flow: {
          name: "流量訊息",
          sensors: {}
        },
        io: {
          name: "輸入輸出訊息",
          sensors: {}
        }
      }
    }, null, 2);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>機種配置 導入/導出</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="導入配置" icon={<UploadIcon />} />
            <Tab label="導出配置" icon={<DownloadIcon />} disabled={!exportData} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            導入機種配置
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            請貼上有效的JSON格式機種配置，或參考下方範例格式。
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={12}
            label="配置JSON"
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError(null);
            }}
            placeholder="請貼上機種配置JSON..."
            sx={{ mb: 2 }}
          />

          {importError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {importError}
            </Alert>
          )}

          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              範例配置格式:
            </Typography>
            <Box
              component="pre"
              sx={{
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: 200,
                bgcolor: 'white',
                p: 1,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.300'
              }}
            >
              {getSampleConfig()}
            </Box>
            <Button
              size="small"
              onClick={() => setImportText(getSampleConfig())}
              sx={{ mt: 1 }}
            >
              使用範例配置
            </Button>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            導出機種配置
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            當前機種配置的JSON格式，可以複製或下載為文件。
          </Typography>

          {exportData && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  機種: {exportData.machineName} ({exportData.machineType})
                </Typography>
                <Box>
                  <Tooltip title={copied ? "已複製!" : "複製到剪貼板"}>
                    <IconButton onClick={handleCopyToClipboard} color={copied ? "success" : "default"}>
                      {copied ? <CheckIcon /> : <CopyIcon />}
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                    sx={{ ml: 1 }}
                  >
                    下載文件
                  </Button>
                </Box>
              </Box>

              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Box
                  component="pre"
                  sx={{
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 400,
                    bgcolor: 'white',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {getExportJson()}
                </Box>
              </Paper>
            </>
          )}
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          取消
        </Button>
        {tabValue === 0 && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!importText.trim()}
            startIcon={<UploadIcon />}
          >
            導入
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MachineImportExport;
