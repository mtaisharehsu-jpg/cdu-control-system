import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as StatusIcon,
  NotificationsActive as AlertIcon,
  NetworkCheck as NetworkIcon,
  Settings as SystemIcon,
  PlayCircle as ControlIcon,
  Info as FWStatusIcon,
  SystemUpdate as FWUpdateIcon
} from '@mui/icons-material';

// 導入所有標籤頁組件
import StatusTab from './tabs/StatusTab';
import AlertSettingTab from './tabs/AlertSettingTab';
import NetworkSettingTab from './tabs/NetworkSettingTab';
import SystemSettingTab from './tabs/SystemSettingTab';
import ControlTab from './tabs/ControlTab';
import FWStatusTab from './tabs/FWStatusTab';
import FWUpdateTab from './tabs/FWUpdateTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cdu-tabpanel-${index}`}
      aria-labelledby={`cdu-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `cdu-tab-${index}`,
    'aria-controls': `cdu-tabpanel-${index}`,
  };
}

const CDUTabContainer: React.FC = () => {
  const [value, setValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // 模擬通知數量
  const [notifications] = useState({
    alerts: 2,      // 警報設定有2個待處理項目
    firmware: 4     // 韌體更新有4個可用更新
  });

  const tabs = [
    {
      label: 'Status',
      chineseLabel: '狀態',
      icon: <StatusIcon />,
      component: <StatusTab />
    },
    {
      label: 'Alert Setting',
      chineseLabel: '警報設定',
      icon: <AlertIcon />,
      component: <AlertSettingTab />,
      badge: notifications.alerts > 0 ? notifications.alerts : undefined
    },
    {
      label: 'Network Setting',
      chineseLabel: '網路設定',
      icon: <NetworkIcon />,
      component: <NetworkSettingTab />
    },
    {
      label: 'System Setting',
      chineseLabel: '系統設定',
      icon: <SystemIcon />,
      component: <SystemSettingTab />
    },
    {
      label: 'Control',
      chineseLabel: '控制',
      icon: <ControlIcon />,
      component: <ControlTab />
    },
    {
      label: 'FW Status',
      chineseLabel: '韌體狀態',
      icon: <FWStatusIcon />,
      component: <FWStatusTab />
    },
    {
      label: 'FW Update',
      chineseLabel: '韌體更新',
      icon: <FWUpdateIcon />,
      component: <FWUpdateTab />,
      badge: notifications.firmware > 0 ? notifications.firmware : undefined
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* 標題區域 */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          CDU 控制系統 - 200KW 冷卻劑分配單元
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Coolant Distribution Unit Control System v2.2
        </Typography>
      </Paper>

      {/* 標籤頁導航 */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={value}
            onChange={handleChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
            aria-label="CDU control system tabs"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={
                  tab.badge ? (
                    <Badge badgeContent={tab.badge} color="error">
                      {tab.icon}
                    </Badge>
                  ) : (
                    tab.icon
                  )
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {tab.label}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {tab.chineseLabel}
                    </Typography>
                  </Box>
                }
                {...a11yProps(index)}
                sx={{
                  minHeight: 80,
                  '&.Mui-selected': {
                    color: 'primary.main',
                    backgroundColor: 'action.selected'
                  }
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* 標籤頁內容 */}
        {tabs.map((tab, index) => (
          <TabPanel key={index} value={value} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </Paper>
    </Box>
  );
};

export default CDUTabContainer;