
import React, { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  ListItemButton,
  Collapse
} from '@mui/material';
import { 
  Devices as DevicesIcon, 
  Settings as SettingsIcon, 
  BugReport as BugReportIcon, 
  Dashboard as DashboardIcon,
  Api as ApiIcon,
  ExpandLess,
  ExpandMore,
  Hub as ServiceIcon,
  Storage as ResourceIcon,
  DeviceThermostat as CoolingIcon,
  Sensors as SensorsIcon,
  Computer as PLCIcon,
  Notifications as AlarmIcon,
  AccountTree as ManagementIcon,
  Event as EventIcon,
  SystemUpdate as UpdateIcon,
  Assignment as TaskIcon,
  Cloud as ClusterIcon,
  Timeline as BatchIcon,
  Info as SystemInfoIcon,
  Assessment as AnalyticsIcon,
  Speed as PerformanceIcon,
  BugReport as RegressionIcon,
  CloudQueue as EnvironmentIcon
} from '@mui/icons-material';

// Define the type for the props
interface SidebarProps {
  setCurrentPage: (page: 
    | 'model-management' 
    | 'system-status' 
    | 'api-test' 
    | 'test' 
    | 'cdu-main'
    // Redfish API Test sub-pages
    | 'redfish-service-discovery'
    | 'redfish-standard-resources'
    | 'redfish-cooling-resources'
    | 'redfish-standard-sensors'
    | 'redfish-cdu-sensors'
    | 'redfish-plc-management'
    | 'redfish-alarm-system'
    | 'redfish-management-services'
    | 'redfish-event-services'
    | 'redfish-update-services'
    | 'redfish-task-services'
    | 'redfish-system-info'
    | 'redfish-cluster-management'
    | 'redfish-data-visualization'
    | 'redfish-batch-testing'
    | 'redfish-advanced-batch-testing'
    | 'redfish-test-analytics'
    | 'redfish-performance-benchmark'
    | 'redfish-regression-testing'
    | 'redfish-test-environment'
  ) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ setCurrentPage }) => {
  const [redfishMenuOpen, setRedfishMenuOpen] = useState(false);

  // Define Redfish API Test sub-menu items
  const redfishSubMenuItems = [
    {
      key: 'redfish-service-discovery',
      icon: <ServiceIcon />,
      label: 'Redfish服務發現',
      page: 'redfish-service-discovery' as const
    },
    {
      key: 'redfish-standard-resources',
      icon: <ResourceIcon />,
      label: '標準Redfish資源',
      page: 'redfish-standard-resources' as const
    },
    {
      key: 'redfish-cooling-resources',
      icon: <CoolingIcon />,
      label: 'DMTF冷卻資源',
      page: 'redfish-cooling-resources' as const
    },
    {
      key: 'redfish-standard-sensors',
      icon: <SensorsIcon />,
      label: '標準感測器',
      page: 'redfish-standard-sensors' as const
    },
    {
      key: 'redfish-cdu-sensors',
      icon: <SensorsIcon />,
      label: 'CDU感測器管理',
      page: 'redfish-cdu-sensors' as const
    },
    {
      key: 'redfish-plc-management',
      icon: <PLCIcon />,
      label: 'PLC管理',
      page: 'redfish-plc-management' as const
    },
    {
      key: 'redfish-alarm-system',
      icon: <AlarmIcon />,
      label: '警報系統',
      page: 'redfish-alarm-system' as const
    },
    {
      key: 'redfish-management-services',
      icon: <ManagementIcon />,
      label: '管理服務',
      page: 'redfish-management-services' as const
    },
    {
      key: 'redfish-event-services',
      icon: <EventIcon />,
      label: '事件服務',
      page: 'redfish-event-services' as const
    },
    {
      key: 'redfish-update-services',
      icon: <UpdateIcon />,
      label: '更新服務',
      page: 'redfish-update-services' as const
    },
    {
      key: 'redfish-task-services',
      icon: <TaskIcon />,
      label: '任務服務',
      page: 'redfish-task-services' as const
    },
    {
      key: 'redfish-system-info',
      icon: <SystemInfoIcon />,
      label: '系統信息',
      page: 'redfish-system-info' as const
    },
    {
      key: 'redfish-cluster-management',
      icon: <ClusterIcon />,
      label: '集群管理',
      page: 'redfish-cluster-management' as const
    },
    // Data Visualization and Analysis
    {
      key: 'redfish-data-visualization',
      icon: <DashboardIcon />,
      label: '數據可視化',
      page: 'redfish-data-visualization' as const
    },
    // Standard Testing
    {
      key: 'redfish-batch-testing',
      icon: <BatchIcon />,
      label: '標準批量測試',
      page: 'redfish-batch-testing' as const
    },
    // Advanced Testing Features
    {
      key: 'redfish-advanced-batch-testing',
      icon: <BatchIcon />,
      label: '高級批量測試',
      page: 'redfish-advanced-batch-testing' as const
    },
    {
      key: 'redfish-test-analytics',
      icon: <AnalyticsIcon />,
      label: '測試分析報告',
      page: 'redfish-test-analytics' as const
    },
    {
      key: 'redfish-performance-benchmark',
      icon: <PerformanceIcon />,
      label: '性能基準測試',
      page: 'redfish-performance-benchmark' as const
    },
    {
      key: 'redfish-regression-testing',
      icon: <RegressionIcon />,
      label: '回歸測試',
      page: 'redfish-regression-testing' as const
    },
    {
      key: 'redfish-test-environment',
      icon: <EnvironmentIcon />,
      label: '測試環境管理',
      page: 'redfish-test-environment' as const
    }
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <List>
        <ListItem key="CDU Main" disablePadding>
          <ListItemButton onClick={() => setCurrentPage('cdu-main')}>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="CDU 主控制台" />
          </ListItemButton>
        </ListItem>
        <ListItem key="Model Management" disablePadding>
          <ListItemButton onClick={() => setCurrentPage('model-management')}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="機種定義管理" />
          </ListItemButton>
        </ListItem>
        <ListItem key="System Status" disablePadding>
          <ListItemButton onClick={() => setCurrentPage('system-status')}>
            <ListItemIcon>
              <DevicesIcon />
            </ListItemIcon>
            <ListItemText primary="當前系統狀態" />
          </ListItemButton>
        </ListItem>
        <ListItem key="API Test" disablePadding>
          <ListItemButton onClick={() => setCurrentPage('api-test')}>
            <ListItemIcon>
              <BugReportIcon />
            </ListItemIcon>
            <ListItemText primary="API測試工具" />
          </ListItemButton>
        </ListItem>
        
        {/* Redfish API Test with expandable sub-menu */}
        <ListItem key="Redfish API Test" disablePadding>
          <ListItemButton onClick={() => setRedfishMenuOpen(!redfishMenuOpen)}>
            <ListItemIcon>
              <ApiIcon />
            </ListItemIcon>
            <ListItemText primary="Redfish API測試" />
            {redfishMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={redfishMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {redfishSubMenuItems.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton 
                  sx={{ pl: 4 }}
                  onClick={() => setCurrentPage(item.page)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
        
        <ListItem key="Test Page" disablePadding>
          <ListItemButton onClick={() => setCurrentPage('test')}>
            <ListItemIcon>
              <BugReportIcon />
            </ListItemIcon>
            <ListItemText primary="測試頁面" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
