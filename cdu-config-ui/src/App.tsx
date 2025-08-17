
import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar, Typography } from '@mui/material';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ModelList from './features/model-management/ModelList';
import SystemStatus from './features/system-status/SystemStatus';
import SimpleApiTest from './components/SimpleApiTest';
import TestPage from './components/TestPage';
import CDUTabContainer from './components/CDUTabContainer';
import { MachineConfigProvider } from './contexts/MachineConfigContext';

// Import Redfish test components (will be created)
import ServiceDiscoveryTestComponent from './components/redfish-tests/ServiceDiscoveryTestComponent';
import StandardResourceTestComponent from './components/redfish-tests/StandardResourceTestComponent';
import CoolingResourceTestComponent from './components/redfish-tests/CoolingResourceTestComponent';
import StandardSensorTestComponent from './components/redfish-tests/StandardSensorTestComponent';
import CDUSensorTestComponent from './components/redfish-tests/CDUSensorTestComponent';
import PLCManagementTestComponent from './components/redfish-tests/PLCManagementTestComponent';
import AlarmSystemTestComponent from './components/redfish-tests/AlarmSystemTestComponent';
import ManagementServicesTestComponent from './components/redfish-tests/ManagementServicesTestComponent';
import EventServicesTestComponent from './components/redfish-tests/EventServicesTestComponent';
import UpdateServicesTestComponent from './components/redfish-tests/UpdateServicesTestComponent';
import TaskServicesTestComponent from './components/redfish-tests/TaskServicesTestComponent';
import SystemInfoTestComponent from './components/redfish-tests/SystemInfoTestComponent';
import ClusterManagementTestComponent from './components/redfish-tests/ClusterManagementTestComponent';
import DataVisualizationTestComponent from './components/redfish-tests/DataVisualizationTestComponent';
import BatchTestingTestComponent from './components/redfish-tests/BatchTestingTestComponent';

// Import advanced testing components
import AdvancedBatchTestComponent from './components/redfish-tests/AdvancedBatchTestComponent';
import TestAnalyticsReportComponent from './components/redfish-tests/TestAnalyticsReportComponent';
import PerformanceBenchmarkComponent from './components/redfish-tests/PerformanceBenchmarkComponent';
import RegressionTestComponent from './components/redfish-tests/RegressionTestComponent';
import TestEnvironmentComponent from './components/redfish-tests/TestEnvironmentComponent';

// Define the type for our page names
type Page = 
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
  | 'redfish-test-environment';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('cdu-main');
  const [hasError, setHasError] = useState(false);

  const renderContent = () => {
    try {
      switch (currentPage) {
        case 'cdu-main':
          return <CDUTabContainer />;
        case 'model-management':
          return <ModelList />;
        case 'system-status':
          return <SystemStatus />;
        case 'api-test':
          return <SimpleApiTest />;
        case 'test':
          return <TestPage />;
          
        // Redfish API Test sub-pages
        case 'redfish-service-discovery':
          return <ServiceDiscoveryTestComponent />;
        case 'redfish-standard-resources':
          return <StandardResourceTestComponent />;
        case 'redfish-cooling-resources':
          return <CoolingResourceTestComponent />;
        case 'redfish-standard-sensors':
          return <StandardSensorTestComponent />;
        case 'redfish-cdu-sensors':
          return <CDUSensorTestComponent />;
        case 'redfish-plc-management':
          return <PLCManagementTestComponent />;
        case 'redfish-alarm-system':
          return <AlarmSystemTestComponent />;
        case 'redfish-management-services':
          return <ManagementServicesTestComponent />;
        case 'redfish-event-services':
          return <EventServicesTestComponent />;
        case 'redfish-update-services':
          return <UpdateServicesTestComponent />;
        case 'redfish-task-services':
          return <TaskServicesTestComponent />;
        case 'redfish-system-info':
          return <SystemInfoTestComponent />;
        case 'redfish-cluster-management':
          return <ClusterManagementTestComponent />;
        case 'redfish-data-visualization':
          return <DataVisualizationTestComponent />;
        case 'redfish-batch-testing':
          return <BatchTestingTestComponent />;
          
        // Advanced Testing Components
        case 'redfish-advanced-batch-testing':
          return <AdvancedBatchTestComponent />;
        case 'redfish-test-analytics':
          return <TestAnalyticsReportComponent testResults={{}} testSessions={[]} />;
        case 'redfish-performance-benchmark':
          return <PerformanceBenchmarkComponent />;
        case 'redfish-regression-testing':
          return <RegressionTestComponent />;
        case 'redfish-test-environment':
          return <TestEnvironmentComponent />;
          
        default:
          return <CDUTabContainer />;
      }
    } catch (error) {
      console.error('Error rendering content:', error);
      setHasError(true);
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            載入頁面時發生錯誤
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            請檢查控制台以獲取更多信息
          </Typography>
          <Box sx={{ mt: 2 }}>
            <button onClick={() => setCurrentPage('test')}>
              切換到測試頁面
            </button>
            <button onClick={() => setCurrentPage('redfish-service-discovery')}>
              切換到Redfish服務發現測試
            </button>
          </Box>
        </Box>
      );
    }
  };

  return (
    <MachineConfigProvider>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <Header />
        <Sidebar setCurrentPage={setCurrentPage} />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          {renderContent()}
        </Box>
      </Box>
    </MachineConfigProvider>
  );
}

export default App;
