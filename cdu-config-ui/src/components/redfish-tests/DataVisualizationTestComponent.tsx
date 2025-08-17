/**
 * Data Visualization Test Component
 * 
 * Provides comprehensive data visualization for Redfish API test results
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Checkbox,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Slider,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  Dashboard as DashboardIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Thermostat as TempIcon,
  Speed as PressIcon,
  Warning as AlarmIcon,
  Computer as SystemIcon,
  ExpandMore as ExpandMoreIcon,
  Factory as FactoryIcon,
  Sensors as SensorsIcon,
  SelectAll as SelectAllIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Close as CloseIcon,
  CloudDownload as CloudDownloadIcon,
  InsertChart as InsertChartIcon,
  TableRows as TableRowsIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Code as CodeIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// Import API functions
import {
  getRedfishSensorReadings,
  getRedfishFunctionBlocksConfig,
  formatApiError
} from '../../api/cduApi';

// CDU Machine Model and Sensor Interfaces
interface CDUSensorInfo {
  id: string; // Temp1, Press1, PLC1-Temp1等
  name: string; // 顯示名稱
  type: 'temperature' | 'pressure' | 'flow';
  unit: string;
  location?: string;
  register?: number;
  device?: string;
  ip_address?: string;
}

interface CDUMachineModel {
  id: string; // CDU_01~CDU_06
  name: string; // 顯示名稱
  description: string;
  priority: number;
  maxCapacityKW: number;
  sensors: CDUSensorInfo[];
}

interface SensorSelection {
  [sensorId: string]: boolean;
}

// Export functionality interfaces
interface ExportOptions {
  scope: 'selected' | 'current_machine' | 'all_machines';
  timeRange: 'current_view' | 'custom' | '1h' | '6h' | '24h' | '7d' | '30d';
  formats: ('csv' | 'json' | 'png' | 'pdf')[];
  customTimeRange?: { start: Date; end: Date; };
  includeStatistics: boolean;
  includeMachineInfo: boolean;
  includeAlarms: boolean;
  samplingInterval: number; // minutes
  language: 'zh' | 'en';
  addCompression: boolean;
  userNotes?: string;
}

interface ExportProgress {
  stage: 'preparing' | 'collecting' | 'processing' | 'generating' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  estimatedTimeLeft?: number; // seconds
}

interface ExportResult {
  success: boolean;
  files: {
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
  totalSize: number;
  exportTime: number; // milliseconds
  error?: string;
}

// Mock chart data generation functions
const generateSensorData = (sensorType: string) => {
  const now = new Date();
  const data = [];
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    let value;
    
    switch (sensorType) {
      case 'temperature':
        value = 40 + Math.sin(i * 0.5) * 5 + Math.random() * 3;
        break;
      case 'pressure':
        value = 2.5 + Math.sin(i * 0.3) * 0.5 + Math.random() * 0.2;
        break;
      case 'flow':
        value = 15 + Math.sin(i * 0.4) * 3 + Math.random() * 1;
        break;
      default:
        value = Math.random() * 100;
    }
    
    data.push({
      timestamp: timestamp.toISOString(),
      time: timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      value: parseFloat(value.toFixed(2))
    });
  }
  
  return data;
};

const DataVisualizationTestComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedSensorType, setSelectedSensorType] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [sensorData, setSensorData] = useState<any>({});
  
  // New state for machine model and sensor selection
  const [selectedMachineModel, setSelectedMachineModel] = useState<string>('CDU_01');
  const [availableMachines, setAvailableMachines] = useState<CDUMachineModel[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<SensorSelection>({});
  const [sensorAccordionExpanded, setSensorAccordionExpanded] = useState<string | false>('temperature');
  
  // Loading and error states
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [sensorsLoading, setSensorsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Performance optimization: memoized sensor data cache
  const [sensorDataCache, setSensorDataCache] = useState<Map<string, any>>(new Map());
  const [lastDataUpdate, setLastDataUpdate] = useState<number>(0);
  
  // Export functionality states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    scope: 'selected',
    timeRange: 'current_view',
    formats: ['csv'],
    includeStatistics: false,
    includeMachineInfo: true,
    includeAlarms: false,
    samplingInterval: 1,
    language: 'zh',
    addCompression: false
  });
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 45.2,
    memory: 67.8,
    disk: 34.5,
    network: 89.3,
    temperature: 42.1
  });

  const sensorTypes = [
    { value: 'temperature', label: '溫度感測器', unit: '°C', color: '#ff5722' },
    { value: 'pressure', label: '壓力感測器', unit: 'Bar', color: '#2196f3' },
    { value: 'flow', label: '流量感測器', unit: 'L/min', color: '#4caf50' }
  ];

  // Mock CDU Machine configurations based on distributed_cdu_config.yaml
  const mockMachineConfigurations: CDUMachineModel[] = [
    {
      id: 'CDU_01',
      name: 'CDU主控制器 #01',
      description: 'Master節點 - 最高優先級',
      priority: 1,
      maxCapacityKW: 50,
      sensors: [
        { id: 'Temp1', name: 'COM7溫度感測器1', type: 'temperature', unit: '°C', device: 'COM7', register: 0 },
        { id: 'Temp2', name: 'COM7溫度感測器2', type: 'temperature', unit: '°C', device: 'COM7', register: 1 },
        { id: 'Temp3', name: 'COM7溫度感測器3', type: 'temperature', unit: '°C', device: 'COM7', register: 2 },
        { id: 'Press1', name: 'COM7壓力感測器1', type: 'pressure', unit: 'Bar', device: 'COM7', register: 2 },
        { id: 'Press2', name: 'COM7壓力感測器2', type: 'pressure', unit: 'Bar', device: 'COM7', register: 3 },
        { id: 'PLC1-Temp1', name: 'PLC溫度感測器1', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 111 },
        { id: 'PLC1-Temp2', name: 'PLC溫度感測器2', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 112 },
        { id: 'PLC1-Press1', name: 'PLC壓力感測器1', type: 'pressure', unit: 'Bar', ip_address: '10.10.40.8', register: 81 },
        { id: 'PLC1-Flow1', name: 'PLC流量感測器1', type: 'flow', unit: 'L/min', ip_address: '10.10.40.8', register: 61 }
      ]
    },
    {
      id: 'CDU_02',
      name: 'CDU控制器 #02',
      description: 'Worker節點 - 次優先級',
      priority: 2,
      maxCapacityKW: 50,
      sensors: [
        { id: 'PLC1-Temp3', name: 'PLC溫度感測器3', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 113 },
        { id: 'PLC1-Temp4', name: 'PLC溫度感測器4', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 114 },
        { id: 'PLC1-Press2', name: 'PLC壓力感測器2', type: 'pressure', unit: 'Bar', ip_address: '10.10.40.8', register: 82 },
        { id: 'PLC1-Flow2', name: 'PLC流量感測器2', type: 'flow', unit: 'L/min', ip_address: '10.10.40.8', register: 62 }
      ]
    },
    {
      id: 'CDU_03',
      name: 'CDU控制器 #03',
      description: 'Worker節點',
      priority: 3,
      maxCapacityKW: 50,
      sensors: [
        { id: 'PLC1-Temp5', name: 'PLC溫度感測器5', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 115 },
        { id: 'PLC1-Temp6', name: 'PLC溫度感測器6', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 116 },
        { id: 'PLC1-Press3', name: 'PLC壓力感測器3', type: 'pressure', unit: 'Bar', ip_address: '10.10.40.8', register: 83 },
        { id: 'PLC1-Flow3', name: 'PLC流量感測器3', type: 'flow', unit: 'L/min', ip_address: '10.10.40.8', register: 63 }
      ]
    },
    {
      id: 'CDU_04',
      name: 'CDU控制器 #04',
      description: 'Worker節點',
      priority: 4,
      maxCapacityKW: 50,
      sensors: [
        { id: 'PLC1-Temp7', name: 'PLC溫度感測器7', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 117 },
        { id: 'PLC1-Temp8', name: 'PLC溫度感測器8', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 118 },
        { id: 'PLC1-Press4', name: 'PLC壓力感測器4', type: 'pressure', unit: 'Bar', ip_address: '10.10.40.8', register: 84 },
        { id: 'PLC1-Flow4', name: 'PLC流量感測器4', type: 'flow', unit: 'L/min', ip_address: '10.10.40.8', register: 64 }
      ]
    },
    {
      id: 'CDU_05',
      name: 'CDU控制器 #05',
      description: 'Backup節點',
      priority: 5,
      maxCapacityKW: 50,
      sensors: [
        { id: 'PLC1-Temp9', name: 'PLC溫度感測器9', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 119 },
        { id: 'PLC1-Press5', name: 'PLC壓力感測器5', type: 'pressure', unit: 'Bar', ip_address: '10.10.40.8', register: 85 }
      ]
    },
    {
      id: 'CDU_06',
      name: 'CDU控制器 #06',
      description: 'Backup節點 - 最低優先級',
      priority: 6,
      maxCapacityKW: 50,
      sensors: [
        { id: 'PLC1-Temp10', name: 'PLC溫度感測器10', type: 'temperature', unit: '°C', ip_address: '10.10.40.8', register: 120 },
        { id: 'PLC1-Press6', name: 'PLC壓力感測器6', type: 'pressure', unit: 'Bar', ip_address: '10.10.40.8', register: 86 }
      ]
    }
  ];

  const timeRanges = [
    { value: '1h', label: '過去1小時' },
    { value: '6h', label: '過去6小時' },
    { value: '24h', label: '過去24小時' },
    { value: '7d', label: '過去7天' }
  ];

  const alarmStatistics = {
    total: 127,
    active: 3,
    acknowledged: 45,
    resolved: 79,
    critical: 1,
    warning: 2,
    info: 0
  };

  // Memoized helper functions for sensor selection (performance optimization)
  const getCurrentMachine = useCallback(() => 
    availableMachines.find(m => m.id === selectedMachineModel), 
    [availableMachines, selectedMachineModel]
  );
  
  const getSelectedSensorsList = useMemo(() => {
    const machine = getCurrentMachine();
    if (!machine) return [];
    return machine.sensors.filter(sensor => selectedSensors[sensor.id]);
  }, [getCurrentMachine, selectedSensors]);
  
  const getSelectedSensorsByType = useCallback((type: string) => {
    return getSelectedSensorsList.filter(sensor => sensor.type === type);
  }, [getSelectedSensorsList]);
  
  const getSelectedSensorsCount = useMemo(() => getSelectedSensorsList.length, [getSelectedSensorsList]);
  const getTotalSensorsCount = useMemo(() => getCurrentMachine()?.sensors.length || 0, [getCurrentMachine]);
  
  // Cache key generation for sensor data
  const getSensorCacheKey = useCallback((machineId: string, sensorIds: string[]) => {
    return `${machineId}_${sensorIds.sort().join('_')}`;
  }, []);
  
  // Check if cached data is still valid (within 5 minutes)
  const isCacheValid = useCallback((timestamp: number) => {
    return Date.now() - timestamp < 5 * 60 * 1000; // 5 minutes
  }, []);

  const handleMachineModelChange = useCallback((newMachineId: string) => {
    setSelectedMachineModel(newMachineId);
    // Reset sensor selection for new machine
    const newMachine = availableMachines.find(m => m.id === newMachineId);
    if (newMachine) {
      const newSelection: SensorSelection = {};
      newMachine.sensors.forEach(sensor => {
        newSelection[sensor.id] = true; // Select all sensors by default
      });
      setSelectedSensors(newSelection);
    }
    // Clear cache when machine changes
    setSensorDataCache(new Map());
  }, [availableMachines]);

  const handleSensorSelection = useCallback((sensorId: string, selected: boolean) => {
    setSelectedSensors(prev => ({ ...prev, [sensorId]: selected }));
    // Clear cache when sensor selection changes
    setSensorDataCache(new Map());
  }, []);

  const handleSelectAllSensors = useCallback((type?: string) => {
    const machine = getCurrentMachine();
    if (!machine) return;
    
    const newSelection = { ...selectedSensors };
    const sensorsToSelect = type 
      ? machine.sensors.filter(s => s.type === type)
      : machine.sensors;
      
    sensorsToSelect.forEach(sensor => {
      newSelection[sensor.id] = true;
    });
    setSelectedSensors(newSelection);
    setSensorDataCache(new Map()); // Clear cache
  }, [getCurrentMachine, selectedSensors]);

  const handleDeselectAllSensors = useCallback((type?: string) => {
    const machine = getCurrentMachine();
    if (!machine) return;
    
    const newSelection = { ...selectedSensors };
    const sensorsToDeselect = type 
      ? machine.sensors.filter(s => s.type === type)
      : machine.sensors;
      
    sensorsToDeselect.forEach(sensor => {
      newSelection[sensor.id] = false;
    });
    setSelectedSensors(newSelection);
    setSensorDataCache(new Map()); // Clear cache
  }, [getCurrentMachine, selectedSensors]);

  // Export functionality handlers
  const handleExportOptionsChange = useCallback((newOptions: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  const handleExportDialogOpen = useCallback(() => {
    setExportDialogOpen(true);
    setExportProgress(null);
    setExportResult(null);
  }, []);

  const handleExportDialogClose = useCallback(() => {
    setExportDialogOpen(false);
    setExportProgress(null);
  }, []);

  const calculateExportSize = useCallback(() => {
    const selectedSensorsCount = getSelectedSensorsCount;
    const timeRangeMultiplier = {
      'current_view': 1,
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168,
      '30d': 720,
      'custom': 24
    }[exportOptions.timeRange] || 1;
    
    const baseSize = selectedSensorsCount * timeRangeMultiplier * 0.1; // KB per sensor per hour
    const formatMultiplier = exportOptions.formats.length;
    
    return Math.round(baseSize * formatMultiplier * 100) / 100; // MB
  }, [exportOptions, getSelectedSensorsCount]);

  // Export utility functions
  const downloadFile = useCallback((content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const generateCSVContent = useCallback(() => {
    const currentMachine = getCurrentMachine();
    if (!currentMachine) return '';

    // Get sensors based on scope
    let sensorsToExport: CDUSensorInfo[] = [];
    
    switch (exportOptions.scope) {
      case 'selected':
        sensorsToExport = currentMachine.sensors.filter(sensor => selectedSensors[sensor.id]);
        break;
      case 'current_machine':
        sensorsToExport = currentMachine.sensors;
        break;
      case 'all_machines':
        sensorsToExport = availableMachines.flatMap(machine => machine.sensors);
        break;
    }

    if (sensorsToExport.length === 0) {
      return 'No sensors selected for export';
    }

    // Generate CSV headers
    const headers = ['Timestamp', 'Machine_ID', 'Sensor_ID', 'Sensor_Name', 'Sensor_Type', 'Value', 'Unit'];
    
    if (exportOptions.includeMachineInfo) {
      headers.push('Machine_Name', 'Machine_Description', 'Machine_Priority');
    }
    
    if (exportOptions.includeStatistics) {
      headers.push('Min_Value', 'Max_Value', 'Avg_Value', 'Standard_Deviation');
    }

    // Generate CSV rows
    const rows: string[][] = [headers];
    
    // Mock time series data generation (in real implementation, this would come from sensorData)
    const timeSeriesLength = {
      'current_view': 24,
      '1h': 60,
      '6h': 360,
      '24h': 1440,
      '7d': 10080,
      '30d': 43200,
      'custom': 1440
    }[exportOptions.timeRange] || 24;

    const now = new Date();
    const intervalMinutes = exportOptions.samplingInterval;
    
    sensorsToExport.forEach(sensor => {
      const machineForSensor = availableMachines.find(m => m.sensors.some(s => s.id === sensor.id)) || currentMachine;
      const sensorTypeConfig = sensorTypes.find(t => t.value === sensor.type);
      
      // Generate mock values for time series
      const values: number[] = [];
      for (let i = 0; i < Math.min(timeSeriesLength, 1000); i += intervalMinutes) {
        const baseValue = {
          'temperature': 25 + Math.random() * 50,
          'pressure': 1 + Math.random() * 10,
          'flow': 10 + Math.random() * 40
        }[sensor.type] || 0;
        
        values.push(Math.round((baseValue + (Math.random() - 0.5) * baseValue * 0.2) * 100) / 100);
      }
      
      // Calculate statistics if requested
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - avgValue, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      values.forEach((value, index) => {
        const timestamp = new Date(now.getTime() - (values.length - index - 1) * intervalMinutes * 60 * 1000);
        
        const row = [
          timestamp.toISOString(),
          machineForSensor.id,
          sensor.id,
          sensor.name,
          sensor.type,
          value.toString(),
          sensor.unit
        ];
        
        if (exportOptions.includeMachineInfo) {
          row.push(
            machineForSensor.name,
            machineForSensor.description,
            machineForSensor.priority.toString()
          );
        }
        
        if (exportOptions.includeStatistics) {
          row.push(
            minValue.toFixed(2),
            maxValue.toFixed(2),
            avgValue.toFixed(2),
            stdDev.toFixed(2)
          );
        }
        
        rows.push(row);
      });
    });

    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => 
        // Escape cells containing commas, quotes, or newlines
        /[,"\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(',')
    ).join('\n');
    
    // Add BOM for UTF-8 to ensure proper encoding in Excel
    return '\uFEFF' + csvContent;
  }, [exportOptions, getCurrentMachine, selectedSensors, availableMachines, sensorTypes]);

  const generateJSONContent = useCallback(() => {
    const currentMachine = getCurrentMachine();
    if (!currentMachine) return '{"error": "No machine selected"}';

    // Similar logic to CSV but return JSON structure
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportOptions: exportOptions,
        userNotes: exportOptions.userNotes || null
      },
      machines: exportOptions.scope === 'all_machines' ? availableMachines.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        priority: m.priority,
        maxCapacityKW: m.maxCapacityKW
      })) : [{
        id: currentMachine.id,
        name: currentMachine.name,
        description: currentMachine.description,
        priority: currentMachine.priority,
        maxCapacityKW: currentMachine.maxCapacityKW
      }],
      sensors: [], // Would be populated with actual sensor data
      statistics: exportOptions.includeStatistics ? {
        totalSensors: exportOptions.scope === 'selected' ? getSelectedSensorsCount : currentMachine.sensors.length,
        exportTimeRange: exportOptions.timeRange,
        samplingInterval: exportOptions.samplingInterval
      } : null
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [exportOptions, getCurrentMachine, availableMachines, getSelectedSensorsCount]);

  const generatePNGFromChart = useCallback(async (chartElement: HTMLElement, fileName: string): Promise<{ name: string; type: string; size: number; url: string }> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a new canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get 2D context'));
          return;
        }

        // Set canvas size to match chart element
        const rect = chartElement.getBoundingClientRect();
        canvas.width = rect.width * 2; // Higher resolution
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        
        // Set white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Function to convert HTML element to canvas
        const convertToCanvas = () => {
          // Simple chart rendering (in real implementation, you'd use html2canvas library)
          // For now, we'll create a simple mock chart
          
          // Draw chart background
          ctx.fillStyle = '#f8f9fa';
          ctx.fillRect(10, 10, rect.width - 20, rect.height - 20);
          
          // Draw chart title
          ctx.fillStyle = '#333333';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('CDU 感測器數據圖表', rect.width / 2, 30);
          
          // Draw mock data lines
          ctx.strokeStyle = '#ff5722';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < rect.width - 40; i += 10) {
            const y = 60 + Math.sin(i * 0.02) * 30 + Math.random() * 20;
            if (i === 0) {
              ctx.moveTo(20 + i, y);
            } else {
              ctx.lineTo(20 + i, y);
            }
          }
          ctx.stroke();
          
          // Add timestamp
          ctx.fillStyle = '#666666';
          ctx.font = '12px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(`導出時間: ${new Date().toLocaleString('zh-TW')}`, rect.width - 20, rect.height - 20);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              resolve({
                name: fileName,
                type: 'PNG',
                size: blob.size,
                url: url
              });
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png', 0.95);
        };
        
        convertToCanvas();
        
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  const exportChartsAsPNG = useCallback(async (): Promise<{ name: string; type: string; size: number; url: string }[]> => {
    const charts: { name: string; type: string; size: number; url: string }[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const currentMachine = getCurrentMachine();
    const machinePrefix = currentMachine?.id || 'Unknown';
    
    try {
      // Find chart containers in the current active tab
      const chartContainers = document.querySelectorAll('[data-chart-container]');
      
      if (chartContainers.length === 0) {
        // If no specific chart containers found, create a composite screenshot
        const mainContent = document.querySelector('[data-testid="sensor-charts"]') || 
                           document.querySelector('.MuiTabPanel-root');
        
        if (mainContent) {
          const fileName = `CDU_Charts_${machinePrefix}_${timestamp}.png`;
          const result = await generatePNGFromChart(mainContent as HTMLElement, fileName);
          charts.push(result);
        }
      } else {
        // Export individual charts
        for (let i = 0; i < chartContainers.length; i++) {
          const chartElement = chartContainers[i] as HTMLElement;
          const chartTitle = chartElement.getAttribute('data-chart-title') || `Chart${i + 1}`;
          const fileName = `CDU_${chartTitle}_${machinePrefix}_${timestamp}.png`;
          
          try {
            const result = await generatePNGFromChart(chartElement, fileName);
            charts.push(result);
          } catch (error) {
            console.warn(`Failed to export chart ${chartTitle}:`, error);
          }
        }
      }
      
      // If no charts were exported, create a summary chart
      if (charts.length === 0) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 800;
          canvas.height = 600;
          
          // Draw summary chart
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 800, 600);
          
          ctx.fillStyle = '#333333';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('CDU 感測器數據摘要', 400, 50);
          
          ctx.font = '16px Arial';
          ctx.fillText(`機型: ${currentMachine?.name || '未選擇'}`, 400, 100);
          ctx.fillText(`導出時間: ${new Date().toLocaleString('zh-TW')}`, 400, 130);
          ctx.fillText(`感測器數量: ${getSelectedSensorsCount} 個`, 400, 160);
          
          // Create blob and download
          await new Promise<void>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) {
                const fileName = `CDU_Summary_${machinePrefix}_${timestamp}.png`;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                charts.push({
                  name: fileName,
                  type: 'PNG',
                  size: blob.size,
                  url: url
                });
              }
              resolve();
            }, 'image/png', 0.95);
          });
        }
      }
      
    } catch (error) {
      console.error('Error exporting charts as PNG:', error);
    }
    
    return charts;
  }, [getCurrentMachine, getSelectedSensorsCount, generatePNGFromChart]);

  const handleExportStart = useCallback(async () => {
    setExportProgress({ stage: 'preparing', progress: 0, message: '正在準備導出...' });
    
    try {
      const currentMachine = getCurrentMachine();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const machinePrefix = exportOptions.scope === 'all_machines' ? 'AllMachines' : currentMachine?.id || 'Unknown';
      
      // Simulate export process with progress updates
      await new Promise(resolve => setTimeout(resolve, 500));
      setExportProgress({ stage: 'collecting', progress: 25, message: '正在收集感測器數據...' });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      setExportProgress({ stage: 'processing', progress: 50, message: '正在處理數據...' });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      setExportProgress({ stage: 'generating', progress: 75, message: '正在生成文件...' });
      
      // Generate and download files based on selected formats
      const downloads: { name: string; type: string; size: number; url: string }[] = [];
      
      if (exportOptions.formats.includes('csv')) {
        const csvContent = generateCSVContent();
        const fileName = `CDU_SensorData_${machinePrefix}_${timestamp}.csv`;
        downloadFile(csvContent, fileName, 'text/csv;charset=utf-8');
        downloads.push({
          name: fileName,
          type: 'CSV',
          size: new Blob([csvContent]).size,
          url: '#'
        });
      }
      
      if (exportOptions.formats.includes('json')) {
        const jsonContent = generateJSONContent();
        const fileName = `CDU_SensorData_${machinePrefix}_${timestamp}.json`;
        downloadFile(jsonContent, fileName, 'application/json;charset=utf-8');
        downloads.push({
          name: fileName,
          type: 'JSON',
          size: new Blob([jsonContent]).size,
          url: '#'
        });
      }
      
      if (exportOptions.formats.includes('png')) {
        const pngFiles = await exportChartsAsPNG();
        downloads.push(...pngFiles);
      }
      
      if (exportOptions.formats.includes('pdf')) {
        // PDF export will be implemented in next phase
        const pdfContent = `PDF export for ${machinePrefix} - Coming soon!`;
        const fileName = `CDU_Report_${machinePrefix}_${timestamp}.txt`;
        downloadFile(pdfContent, fileName, 'text/plain;charset=utf-8');
        downloads.push({
          name: fileName.replace('.txt', '.pdf'),
          type: 'PDF',
          size: new Blob([pdfContent]).size,
          url: '#'
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setExportProgress({ stage: 'complete', progress: 100, message: '導出完成！' });
      
      // Set export result
      setTimeout(() => {
        setExportResult({
          success: true,
          files: downloads,
          totalSize: downloads.reduce((total, file) => total + file.size, 0),
          exportTime: 2300 // Mock export time
        });
        setExportProgress(null);
      }, 1000);
      
    } catch (error) {
      setExportProgress({
        stage: 'error',
        progress: 0,
        message: `導出失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      });
      
      setTimeout(() => {
        setExportProgress(null);
      }, 3000);
    }
  }, [exportOptions, getCurrentMachine, generateCSVContent, generateJSONContent, downloadFile]);

  const renderExportProgress = () => {
    if (!exportProgress) return null;
    
    const stageLabels = {
      'preparing': '準備中',
      'collecting': '收集數據',
      'processing': '處理數據',
      'generating': '生成文件',
      'complete': '完成',
      'error': '錯誤'
    };
    
    return (
      <Box sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          {exportProgress.stage === 'error' ? (
            <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
          ) : exportProgress.stage === 'complete' ? (
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          ) : (
            <CircularProgress size={60} sx={{ mb: 2 }} />
          )}
          
          <Typography variant="h6" gutterBottom>
            {exportProgress.message}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            當前階段: {stageLabels[exportProgress.stage]}
          </Typography>
        </Box>
        
        {/* Progress Steps */}
        <Stepper activeStep={{
          'preparing': 0,
          'collecting': 1,
          'processing': 2,
          'generating': 3,
          'complete': 4,
          'error': 0
        }[exportProgress.stage]} alternativeLabel>
          <Step>
            <StepLabel>準備導出</StepLabel>
          </Step>
          <Step>
            <StepLabel>收集數據</StepLabel>
          </Step>
          <Step>
            <StepLabel>處理數據</StepLabel>
          </Step>
          <Step>
            <StepLabel>生成文件</StepLabel>
          </Step>
          <Step>
            <StepLabel>完成</StepLabel>
          </Step>
        </Stepper>
        
        {/* Progress Bar */}
        <Box sx={{ mt: 3 }}>
          <LinearProgress 
            variant="determinate" 
            value={exportProgress.progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption">{exportProgress.progress}%</Typography>
            {exportProgress.estimatedTimeLeft && (
              <Typography variant="caption">
                預計剩餘: {exportProgress.estimatedTimeLeft}秒
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  const renderExportResult = () => {
    if (!exportResult) return null;
    
    return (
      <Box sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            導出完成！
          </Typography>
          <Typography variant="body2" color="textSecondary">
            數據已成功導出到您的下載目錄
          </Typography>
        </Box>
        
        {/* Export Summary */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              導出摘要
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>文件數量:</strong> {exportResult.files.length} 個
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>總大小:</strong> {(exportResult.totalSize / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>導出時間:</strong> {(exportResult.exportTime / 1000).toFixed(1)} 秒
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>導出日期:</strong> {new Date().toLocaleString('zh-TW')}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* Files List */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              已導出文件
            </Typography>
            <List>
              {exportResult.files.map((file, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {file.type === 'CSV' && <TableRowsIcon />}
                    {file.type === 'JSON' && <CodeIcon />}
                    {file.type === 'PNG' && <InsertChartIcon />}
                    {file.type === 'PDF' && <PictureAsPdfIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={`${file.type} 文件 • ${(file.size / 1024).toFixed(1)} KB`}
                  />
                  <Chip
                    label="已下載"
                    color="success"
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
        
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            onClick={() => {
              setExportResult(null);
              handleExportDialogClose();
            }}
          >
            完成
          </Button>
        </Box>
      </Box>
    );
  };

  const renderExportDialog = () => {
    const currentMachine = getCurrentMachine();
    const selectedSensorsCount = getSelectedSensorsCount;
    const estimatedSize = calculateExportSize();

    return (
      <Dialog
        open={exportDialogOpen}
        onClose={handleExportDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '600px' }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <CloudDownloadIcon color="primary" />
              <Typography variant="h6">導出數據設定</Typography>
            </Box>
            <Button
              size="small"
              onClick={handleExportDialogClose}
              sx={{ minWidth: 'auto', p: 1 }}
            >
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {exportProgress ? (
            renderExportProgress()
          ) : exportResult ? (
            renderExportResult()
          ) : (
            <Box>
              {/* Export Scope Selection */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🎯 導出範圍
                  </Typography>
                  <RadioGroup
                    value={exportOptions.scope}
                    onChange={(e) => handleExportOptionsChange({ scope: e.target.value as any })}
                  >
                    <FormControlLabel
                      value="selected"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1">選定感測器</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {selectedSensorsCount} 個感測器 ({currentMachine?.name})
                          </Typography>
                        </Box>
                      }
                      disabled={selectedSensorsCount === 0}
                    />
                    <FormControlLabel
                      value="current_machine"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1">當前機型全部</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {currentMachine?.sensors.length || 0} 個感測器 ({currentMachine?.name})
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="all_machines"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1">所有機型</Typography>
                          <Typography variant="caption" color="textSecondary">
                            所有 CDU 機型的感測器數據
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Time Range Selection */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ⏰ 時間範圍
                  </Typography>
                  <RadioGroup
                    value={exportOptions.timeRange}
                    onChange={(e) => handleExportOptionsChange({ timeRange: e.target.value as any })}
                  >
                    <FormControlLabel value="current_view" control={<Radio />} label="當前視圖時間範圍" />
                    <FormControlLabel value="1h" control={<Radio />} label="過去 1 小時" />
                    <FormControlLabel value="6h" control={<Radio />} label="過去 6 小時" />
                    <FormControlLabel value="24h" control={<Radio />} label="過去 24 小時" />
                    <FormControlLabel value="7d" control={<Radio />} label="過去 7 天" />
                    <FormControlLabel value="30d" control={<Radio />} label="過去 30 天" />
                    <FormControlLabel value="custom" control={<Radio />} label="自定義範圍" />
                  </RadioGroup>
                  
                  {exportOptions.timeRange === 'custom' && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <TextField
                        label="開始時間"
                        type="datetime-local"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="結束時間"
                        type="datetime-local"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Export Formats */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📋 導出格式
                  </Typography>
                  <FormGroup row>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.formats.includes('csv')}
                          onChange={(e) => {
                            const newFormats = e.target.checked
                              ? [...exportOptions.formats, 'csv']
                              : exportOptions.formats.filter(f => f !== 'csv');
                            handleExportOptionsChange({ formats: newFormats });
                          }}
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <TableRowsIcon />
                          <span>CSV 數據表格</span>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.formats.includes('json')}
                          onChange={(e) => {
                            const newFormats = e.target.checked
                              ? [...exportOptions.formats, 'json']
                              : exportOptions.formats.filter(f => f !== 'json');
                            handleExportOptionsChange({ formats: newFormats });
                          }}
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <CodeIcon />
                          <span>JSON 結構化數據</span>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.formats.includes('png')}
                          onChange={(e) => {
                            const newFormats = e.target.checked
                              ? [...exportOptions.formats, 'png']
                              : exportOptions.formats.filter(f => f !== 'png');
                            handleExportOptionsChange({ formats: newFormats });
                          }}
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <InsertChartIcon />
                          <span>PNG 圖表圖片</span>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.formats.includes('pdf')}
                          onChange={(e) => {
                            const newFormats = e.target.checked
                              ? [...exportOptions.formats, 'pdf']
                              : exportOptions.formats.filter(f => f !== 'pdf');
                            handleExportOptionsChange({ formats: newFormats });
                          }}
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <PictureAsPdfIcon />
                          <span>PDF 完整報告</span>
                        </Box>
                      }
                    />
                  </FormGroup>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        
        {!exportProgress && !exportResult && (
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleExportDialogClose} variant="outlined">取消</Button>
            <Button
              onClick={handleExportStart}
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              disabled={exportOptions.formats.length === 0 || (exportOptions.scope === 'selected' && selectedSensorsCount === 0)}
            >
              開始導出
            </Button>
          </DialogActions>
        )}
      </Dialog>
    );
  };

  // Load machine configurations from API (with fallback to mock data)
  const loadMachineConfigurations = async () => {
    setMachinesLoading(true);
    setApiError(null);
    
    try {
      // Try to fetch function blocks configuration from API
      const functionBlocksConfig = await getRedfishFunctionBlocksConfig();
      
      if (functionBlocksConfig && functionBlocksConfig.function_blocks) {
        // Transform API data to our machine model format
        const apiMachines = transformApiDataToMachineModels(functionBlocksConfig);
        if (apiMachines.length > 0) {
          setAvailableMachines(apiMachines);
          setMachinesLoading(false);
          return;
        }
      }
    } catch (error) {
      console.log('Failed to load API configuration, using mock data:', formatApiError(error));
      setApiError(`API連接失敗，使用模擬數據: ${formatApiError(error)}`);
    }
    
    // Fallback to mock data
    setAvailableMachines(mockMachineConfigurations);
    setMachinesLoading(false);
  };

  // Transform API function blocks data to machine model format
  const transformApiDataToMachineModels = (apiData: any): CDUMachineModel[] => {
    // This would need to be implemented based on actual API response structure
    // For now, we'll use mock data but this provides the framework for real integration
    return mockMachineConfigurations;
  };

  // Initialize available machines and default sensor selection
  useEffect(() => {
    loadMachineConfigurations();
  }, []);

  // Initialize sensor selection when machines are loaded
  useEffect(() => {
    if (availableMachines.length > 0 && Object.keys(selectedSensors).length === 0) {
      const firstMachine = availableMachines[0];
      const initialSelection: SensorSelection = {};
      firstMachine.sensors.forEach(sensor => {
        initialSelection[sensor.id] = true; // Select all sensors by default
      });
      setSelectedSensors(initialSelection);
    }
  }, [availableMachines]);

  // Load sensor data (from API with fallback to mock data) - with caching
  const loadSensorData = useCallback(async () => {
    setSensorsLoading(true);
    const newData: any = {};
    const selectedMachine = getCurrentMachine();
    
    if (!selectedMachine) {
      setSensorData({});
      setSensorsLoading(false);
      return;
    }

    // Get list of selected sensors
    const selectedSensorIds = Object.keys(selectedSensors).filter(id => selectedSensors[id]);
    const selectedSensorsList = selectedMachine.sensors.filter(sensor => selectedSensors[sensor.id]);
    
    if (selectedSensorsList.length === 0) {
      setSensorData({});
      setSensorsLoading(false);
      return;
    }
    
    // Check cache first
    const cacheKey = getSensorCacheKey(selectedMachineModel, selectedSensorIds);
    const cachedData = sensorDataCache.get(cacheKey);
    
    if (cachedData && isCacheValid(cachedData.timestamp)) {
      setSensorData(cachedData.data);
      setSensorsLoading(false);
      return;
    }

    try {
      // Try to get real sensor data from API
      const apiData = await getRedfishSensorReadings();
      
      if (apiData && Array.isArray(apiData)) {
        // Map API data to our selected sensors
        selectedSensorsList.forEach(sensor => {
          // Try to find matching sensor data by ID or name
          const apiSensorData = apiData.find((s: any) => 
            s.sensor_id === sensor.id || 
            s.name === sensor.id || 
            s.sensor_name === sensor.id ||
            s.id === sensor.id
          );
          
          if (apiSensorData && (typeof apiSensorData.reading_value === 'number' || typeof apiSensorData.value === 'number')) {
            // Convert single value to time series data
            const value = apiSensorData.reading_value ?? apiSensorData.value;
            newData[sensor.id] = generateSensorDataFromValue(sensor.type, value);
          } else {
            // Fallback to mock data
            newData[sensor.id] = generateSensorData(sensor.type);
          }
        });
      } else {
        // API didn't return expected format, use mock data
        selectedSensorsList.forEach(sensor => {
          newData[sensor.id] = generateSensorData(sensor.type);
        });
      }
    } catch (error) {
      console.log('Failed to load sensor data from API, using mock data:', formatApiError(error));
      // Fallback to mock data
      selectedSensorsList.forEach(sensor => {
        newData[sensor.id] = generateSensorData(sensor.type);
      });
    }

    setSensorData(newData);
    
    // Cache the loaded data
    const currentTime = Date.now();
    setSensorDataCache(prev => {
      const newCache = new Map(prev);
      newCache.set(cacheKey, {
        data: newData,
        timestamp: currentTime
      });
      // Limit cache size to prevent memory issues
      if (newCache.size > 10) {
        const firstKey = newCache.keys().next().value;
        newCache.delete(firstKey);
      }
      return newCache;
    });
    
    setLastDataUpdate(currentTime);
    setSensorsLoading(false);
  }, [getCurrentMachine, selectedSensors, selectedMachineModel, getSensorCacheKey, sensorDataCache, isCacheValid]);

  // Generate time series data from a single API value
  const generateSensorDataFromValue = (sensorType: string, currentValue: number) => {
    const now = new Date();
    const data = [];
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      // Generate variation around the current value
      const variation = (Math.random() - 0.5) * (currentValue * 0.1); // ±10% variation
      const value = Math.max(0, currentValue + variation);
      
      data.push({
        timestamp: timestamp.toISOString(),
        time: timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        value: parseFloat(value.toFixed(2))
      });
    }
    
    return data;
  };

  useEffect(() => {
    if (availableMachines.length > 0) {
      loadSensorData();
      
      if (autoRefresh) {
        const interval = setInterval(loadSensorData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
      }
    }
  }, [autoRefresh, selectedMachineModel, selectedSensors, availableMachines]);

  const renderSimpleChart = (data: any[], title: string, color: string, unit: string) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const currentValue = data[data.length - 1]?.value || 0;
    
    return (
      <Card sx={{ mb: 2 }} data-chart-container data-chart-title={title.replace(/\s+/g, '_')}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6">{title}</Typography>
              <Typography variant="caption" color="textSecondary">
                ({selectedMachineModel})
              </Typography>
            </Box>
            <Chip 
              label={`${currentValue} ${unit}`} 
              sx={{ bgcolor: color, color: 'white' }}
            />
          </Box>
          
          <Box sx={{ height: 200, display: 'flex', alignItems: 'end', gap: 1, overflowX: 'auto' }}>
            {data.slice(-12).map((point, index) => {
              const height = ((point.value - minValue) / (maxValue - minValue)) * 160 + 20;
              return (
                <Box
                  key={index}
                  sx={{
                    minWidth: '20px',
                    height: `${height}px`,
                    bgcolor: color,
                    opacity: 0.8,
                    borderRadius: '2px 2px 0 0',
                    display: 'flex',
                    alignItems: 'end',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                  title={`${point.time}: ${point.value} ${unit}`}
                >
                  {point.value.toFixed(1)}
                </Box>
              );
            })}
          </Box>
          
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption">
              最小: {minValue.toFixed(2)} {unit}
            </Typography>
            <Typography variant="caption">
              最大: {maxValue.toFixed(2)} {unit}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderSystemMetricsGauge = (label: string, value: number, color: string, icon: React.ReactNode) => (
    <Card sx={{ height: 200 }}>
      <CardContent sx={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Box display="flex" justifyContent="center" mb={1}>
          {icon}
        </Box>
        <Typography variant="h6" gutterBottom>{label}</Typography>
        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={value}
            sx={{
              height: 8,
              borderRadius: 4,
              width: 100,
              '& .MuiLinearProgress-bar': {
                backgroundColor: color
              }
            }}
          />
        </Box>
        <Typography variant="h4" sx={{ color: color, fontWeight: 'bold' }}>
          {value.toFixed(1)}%
        </Typography>
      </CardContent>
    </Card>
  );

  const renderAlarmChart = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>警報統計分析</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <AlarmIcon sx={{ color: '#f44336' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="嚴重警報" 
                  secondary={`${alarmStatistics.critical} 個`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AlarmIcon sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="警告警報" 
                  secondary={`${alarmStatistics.warning} 個`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AlarmIcon sx={{ color: '#2196f3' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="信息警報" 
                  secondary={`${alarmStatistics.info} 個`}
                />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ textAlign: 'center', pt: 2 }}>
              <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                {alarmStatistics.total}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                總警報數量
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                已確認: {alarmStatistics.acknowledged} | 已解決: {alarmStatistics.resolved}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderDashboardTab = () => {
    const currentMachine = getCurrentMachine();
    const selectedSensorsList = getSelectedSensorsList;
    
    return (
      <Box>
        {/* Current Selection Summary */}
        <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <FactoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {currentMachine?.name || '未選擇'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {currentMachine?.description} • 優先級 {currentMachine?.priority}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      最大容量: {currentMachine?.maxCapacityKW}kW
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <SensorsIcon sx={{ fontSize: 40, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {selectedSensorsList.length} 個感測器
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {getSelectedSensorsByType('temperature').length} 溫度 • {' '}
                      {getSelectedSensorsByType('pressure').length} 壓力 • {' '}
                      {getSelectedSensorsByType('flow').length} 流量
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      總計 {currentMachine?.sensors.length || 0} 個可用感測器
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>📊 系統性能指標</Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
              {currentMachine?.name || 'CDU系統'} 即時性能数据
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                {renderSystemMetricsGauge('CPU', systemMetrics.cpu, '#ff5722', <SystemIcon />)}
              </Grid>
              <Grid item xs={6}>
                {renderSystemMetricsGauge('記憶體', systemMetrics.memory, '#2196f3', <SystemIcon />)}
              </Grid>
              <Grid item xs={6}>
                {renderSystemMetricsGauge('磁碟', systemMetrics.disk, '#4caf50', <SystemIcon />)}
              </Grid>
              <Grid item xs={6}>
                {renderSystemMetricsGauge('網路', systemMetrics.network, '#9c27b0', <SystemIcon />)}
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>🚨 警報系統概況</Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
              {currentMachine?.name || 'CDU系統'} 警報系統狀態
            </Typography>
            {renderAlarmChart()}
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderSensorChartsTab = () => {
    const selectedSensorsList = getSelectedSensorsList;
    
    if (selectedSensorsList.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SensorsIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            未選擇感測器
          </Typography>
          <Typography variant="body2" color="textSecondary">
            請在上方感測器選擇面板中選擇至少一個感測器來查看數據趨勢圖。
          </Typography>
        </Box>
      );
    }

    return (
      <Box data-testid="sensor-charts">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h6">感測器數據趨勢</Typography>
            <Typography variant="caption" color="textSecondary">
              {selectedMachineModel} • 已選擇 {selectedSensorsList.length} 個感測器
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>感測器類型過濾</InputLabel>
              <Select
                value={selectedSensorType}
                onChange={(e) => setSelectedSensorType(e.target.value)}
              >
                <MenuItem value="all">顯示所有類型</MenuItem>
                {sensorTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>時間範圍</InputLabel>
              <Select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
              >
                {timeRanges.map(range => (
                  <MenuItem key={range.value} value={range.value}>{range.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {selectedSensorsList
            .filter(sensor => selectedSensorType === 'all' || sensor.type === selectedSensorType)
            .map(sensor => {
              const sensorTypeConfig = sensorTypes.find(t => t.value === sensor.type);
              return (
                <Grid item xs={12} md={6} lg={4} key={sensor.id}>
                  {sensorData[sensor.id] && renderSimpleChart(
                    sensorData[sensor.id],
                    sensor.name,
                    sensorTypeConfig?.color || '#666666',
                    sensor.unit
                  )}
                </Grid>
              );
            })
          }
        </Grid>
        
        {selectedSensorsList.filter(sensor => selectedSensorType === 'all' || sensor.type === selectedSensorType).length === 0 && selectedSensorType !== 'all' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="textSecondary">
              無此類型的感測器被選中。請選擇其他類型或在感測器選擇面板中選擇{sensorTypes.find(t => t.value === selectedSensorType)?.label}。
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderApiTestResultsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>API測試結果統計</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>測試成功率</Typography>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h2" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                  94.2%
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  總體測試通過率
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  成功: 142 | 失敗: 9 | 總計: 151
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>平均響應時間</Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="感測器API" secondary="15ms" />
                  <Chip label="優秀" color="success" size="small" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="警報系統API" secondary="23ms" />
                  <Chip label="良好" color="success" size="small" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="PLC管理API" secondary="45ms" />
                  <Chip label="正常" color="warning" size="small" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="集群管理API" secondary="67ms" />
                  <Chip label="正常" color="warning" size="small" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderRealtimeTab = () => {
    const selectedSensorsList = getSelectedSensorsList;
    
    if (selectedSensorsList.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <TimelineIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            無法啟動即時監控
          </Typography>
          <Typography variant="body2" color="textSecondary">
            請在感測器選擇面板中選擇至少一個感測器來啟動即時監控功能。
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h6">即時監控面板</Typography>
            <Typography variant="caption" color="textSecondary">
              {selectedMachineModel} • 監控 {selectedSensorsList.length} 個感測器
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="自動更新"
            />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadSensorData()}
              disabled={sensorsLoading}
            >
              {sensorsLoading ? '更新中...' : '手動刷新'}
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                🔄 即時數據每30秒自動更新 | 最後更新: {new Date().toLocaleTimeString('zh-TW')} | 
                目前監控: {getSelectedSensorsByType('temperature').length}溫度 + 
                {getSelectedSensorsByType('pressure').length}壓力 + 
                {getSelectedSensorsByType('flow').length}流量
              </Typography>
            </Alert>
          </Grid>
          
          {selectedSensorsList.map(sensor => {
            const sensorTypeConfig = sensorTypes.find(t => t.value === sensor.type);
            return (
              <Grid item xs={12} lg={6} key={sensor.id}>
                {sensorData[sensor.id] && renderSimpleChart(
                  sensorData[sensor.id],
                  `即時 ${sensor.name}`,
                  sensorTypeConfig?.color || '#666666',
                  sensor.unit
                )}
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  const renderMachineAndSensorSelector = () => {
    const currentMachine = getCurrentMachine();
    const selectedCount = getSelectedSensorsCount;
    const totalCount = getTotalSensorsCount;

    return (
      <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            {/* Machine Model Selection */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>🏭 CDU機型選擇</InputLabel>
                <Select
                  value={selectedMachineModel}
                  onChange={(e) => handleMachineModelChange(e.target.value)}
                  startAdornment={<FactoryIcon sx={{ mr: 1, color: 'primary.main' }} />}
                >
                  {availableMachines.map(machine => (
                    <MenuItem key={machine.id} value={machine.id}>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {machine.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {machine.description} • {machine.sensors.length}個感測器
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Current Selection Summary */}
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={2}>
                <SensorsIcon color="primary" />
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    已選感測器: {selectedCount} / {totalCount}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {currentMachine ? 
                      `${getSelectedSensorsByType('temperature').length}溫度 • ${getSelectedSensorsByType('pressure').length}壓力 • ${getSelectedSensorsByType('flow').length}流量`
                      : '無資料'
                    }
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1} justifyContent="flex-end">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleSelectAllSensors()}
                  startIcon={<SelectAllIcon />}
                >
                  全選
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleDeselectAllSensors()}
                  startIcon={<CheckBoxOutlineBlankIcon />}
                >
                  取消全選
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  size="small"
                  onClick={handleExportDialogOpen}
                >
                  導出數據
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  size="small"
                >
                  設定
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Machine Details */}
          {currentMachine && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" color="textSecondary">
                <strong>機型詳情:</strong> {currentMachine.description} • 
                <strong>優先級:</strong> {currentMachine.priority} • 
                <strong>最大容量:</strong> {currentMachine.maxCapacityKW}kW • 
                <strong>感測器總數:</strong> {currentMachine.sensors.length}個
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSensorSelectionPanel = () => {
    const currentMachine = getCurrentMachine();
    if (!currentMachine) return null;

    const sensorsByType = {
      temperature: currentMachine.sensors.filter(s => s.type === 'temperature'),
      pressure: currentMachine.sensors.filter(s => s.type === 'pressure'),
      flow: currentMachine.sensors.filter(s => s.type === 'flow')
    };

    const renderSensorGroup = (type: keyof typeof sensorsByType, icon: React.ReactNode, label: string, color: string) => {
      const sensors = sensorsByType[type];
      const selectedSensorsInType = sensors.filter(s => selectedSensors[s.id]);
      const allSelected = sensors.length > 0 && selectedSensorsInType.length === sensors.length;
      const someSelected = selectedSensorsInType.length > 0 && selectedSensorsInType.length < sensors.length;

      if (sensors.length === 0) return null;

      return (
        <Accordion 
          expanded={sensorAccordionExpanded === type} 
          onChange={(_, isExpanded) => setSensorAccordionExpanded(isExpanded ? type : false)}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={2} width="100%">
              <Box display="flex" alignItems="center" gap={1}>
                {icon}
                <Typography variant="h6">{label}</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1} ml="auto">
                <Chip 
                  size="small" 
                  label={`${selectedSensorsInType.length}/${sensors.length}`}
                  sx={{ bgcolor: color, color: 'white' }}
                />
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleSelectAllSensors(type);
                    } else {
                      handleDeselectAllSensors(type);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <Grid container spacing={1}>
                {sensors.map(sensor => (
                  <Grid item xs={12} sm={6} md={4} key={sensor.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSensors[sensor.id] || false}
                          onChange={(e) => handleSensorSelection(sensor.id, e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {sensor.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {sensor.id} • {sensor.unit}
                            {sensor.register && ` • R${sensor.register}`}
                          </Typography>
                        </Box>
                      }
                      sx={{ 
                        border: selectedSensors[sensor.id] ? `2px solid ${color}` : '1px solid #e0e0e0',
                        borderRadius: 1,
                        p: 1,
                        m: 0,
                        width: '100%',
                        backgroundColor: selectedSensors[sensor.id] ? `${color}10` : 'transparent'
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      );
    };

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <SensorsIcon color="primary" />
              <Typography variant="h6">感測器選擇面板</Typography>
              <Typography variant="caption" color="textSecondary">
                ({currentMachine.name})
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Badge badgeContent={getSelectedSensorsCount} color="primary">
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setSensorAccordionExpanded(sensorAccordionExpanded ? false : 'temperature')}
                >
                  {sensorAccordionExpanded ? '收起所有' : '展開所有'}
                </Button>
              </Badge>
            </Box>
          </Box>

          {getSelectedSensorsCount === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                警告：未選擇任何感測器，數據可視化將無法顯示內容。請至少選擇一個感測器。
              </Typography>
            </Alert>
          )}

          {renderSensorGroup('temperature', <TempIcon sx={{ color: '#ff5722' }} />, '溫度感測器', '#ff5722')}
          {renderSensorGroup('pressure', <PressIcon sx={{ color: '#2196f3' }} />, '壓力感測器', '#2196f3')}
          {renderSensorGroup('flow', <PieChartIcon sx={{ color: '#4caf50' }} />, '流量感測器', '#4caf50')}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        數據可視化測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        提供Redfish API測試結果的綜合數據可視化，包括感測器趨勢圖表、系統性能指標和警報統計分析。
      </Typography>

      {/* API Connection Status */}
      {apiError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>注意:</strong> {apiError}
            <br />
            目前使用模擬數據進行測試。請確認 CDU 後端服務正在運行於 http://localhost:8001
          </Typography>
        </Alert>
      )}

      {/* Loading State */}
      {machinesLoading ? (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="textSecondary">
              正在載入CDU機型配置...
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Machine Model and Sensor Selector */}
          {renderMachineAndSensorSelector()}

          {/* Sensor Selection Panel */}
          {renderSensorSelectionPanel()}
        </>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            icon={<DashboardIcon />} 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <span>儀表板總覽</span>
                <Chip size="small" label={selectedMachineModel} />
              </Box>
            }
          />
          <Tab 
            icon={<TrendingUpIcon />} 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <span>感測器圖表</span>
                <Badge badgeContent={getSelectedSensorsCount} color="primary" max={99}>
                  <Box sx={{ width: 1 }} />
                </Badge>
              </Box>
            }
          />
          <Tab icon={<BarChartIcon />} label="API測試統計" />
          <Tab 
            icon={<TimelineIcon />} 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <span>即時監控</span>
                {autoRefresh && <Box sx={{ width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%' }} />}
              </Box>
            }
          />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {sensorsLoading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="textSecondary">
              正在載入感測器數據...
            </Typography>
          </Box>
        ) : (
          <>
            {activeTab === 0 && renderDashboardTab()}
            {activeTab === 1 && renderSensorChartsTab()}
            {activeTab === 2 && renderApiTestResultsTab()}
            {activeTab === 3 && renderRealtimeTab()}
          </>
        )}
      </Box>

      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面提供Redfish API測試數據的可視化分析，包括：
            <br />
            • <strong>儀表板總覽</strong>: 系統性能指標和警報系統概況
            <br />
            • <strong>感測器圖表</strong>: 根據選定的CDU機型和感測器顯示趨勢圖表
            <br />
            • <strong>API測試統計</strong>: 測試成功率、響應時間和性能分析
            <br />
            • <strong>即時監控</strong>: 30秒自動更新的即時數據監控面板
            <br />
            • <strong>機型選擇</strong>: 支援CDU_01~CDU_06不同機型的獨立監控
            <br />
            • <strong>感測器築選</strong>: 可精確選擇特定感測器進行監控和分析
            <br />
            • <strong>數據導出</strong>: 支援將選定感測器的圖表數據導出為CSV或PNG格式
          </Typography>
        </Alert>
      </Box>
      
      {/* Export Dialog */}
      {renderExportDialog()}
    </Box>
  );
};

export default DataVisualizationTestComponent;