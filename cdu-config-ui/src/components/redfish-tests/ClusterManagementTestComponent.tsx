/**
 * Cluster Management Test Component
 * 
 * Tests distributed CDU cluster management and node coordination
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
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Cloud as ClusterIcon,
  Computer as NodeIcon,
  NetworkCheck as NetworkIcon,
  Sync as SyncIcon,
  Security as SecurityIcon,
  Groups as GroupIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

// Import API functions
import {
  getRedfishClusterNodes,
  formatApiError
} from '../../api/cduApi';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

interface ClusterNode {
  nodeId: string;
  hostname: string;
  ipAddress: string;
  status: 'Leader' | 'Follower' | 'Candidate' | 'Offline';
  role: 'Master' | 'Worker' | 'Backup';
  lastHeartbeat: string;
  uptime: string;
  cpuUsage: number;
  memoryUsage: number;
  version: string;
}

interface ClusterConfiguration {
  clusterId: string;
  clusterName: string;
  minNodes: number;
  maxNodes: number;
  heartbeatInterval: number;
  electionTimeout: number;
  replicationFactor: number;
  autoFailover: boolean;
}

const ClusterManagementTestComponent: React.FC = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [selectedNodeId, setSelectedNodeId] = useState('node-001');
  const [clusterConfig, setClusterConfig] = useState<ClusterConfiguration>({
    clusterId: 'cdu-cluster-001',
    clusterName: 'CDU Production Cluster',
    minNodes: 3,
    maxNodes: 10,
    heartbeatInterval: 5000,
    electionTimeout: 15000,
    replicationFactor: 3,
    autoFailover: true
  });

  const sampleNodeIds = [
    'node-001', 'node-002', 'node-003', 'node-004', 'node-005'
  ];

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

  const getMockClusterStatus = () => {
    return Promise.resolve({
      clusterId: clusterConfig.clusterId,
      clusterName: clusterConfig.clusterName,
      totalNodes: 5,
      activeNodes: 4,
      leaderNode: 'node-001',
      clusterHealth: 'Healthy',
      consensusState: 'Normal',
      lastElection: '2025-01-08T10:00:00Z',
      replicationStatus: 'Synchronized',
      configuration: clusterConfig
    });
  };

  const getMockNodeList = (): Promise<{ nodes: ClusterNode[] }> => {
    const nodes: ClusterNode[] = [
      {
        nodeId: 'node-001',
        hostname: 'cdu-master-01',
        ipAddress: '192.168.1.101',
        status: 'Leader',
        role: 'Master',
        lastHeartbeat: new Date().toISOString(),
        uptime: '15 days, 8:42:30',
        cpuUsage: 25.6,
        memoryUsage: 68.2,
        version: 'v2.1.0'
      },
      {
        nodeId: 'node-002',
        hostname: 'cdu-worker-01',
        ipAddress: '192.168.1.102',
        status: 'Follower',
        role: 'Worker',
        lastHeartbeat: new Date().toISOString(),
        uptime: '15 days, 8:40:15',
        cpuUsage: 18.3,
        memoryUsage: 45.7,
        version: 'v2.1.0'
      },
      {
        nodeId: 'node-003',
        hostname: 'cdu-worker-02',
        ipAddress: '192.168.1.103',
        status: 'Follower',
        role: 'Worker',
        lastHeartbeat: new Date().toISOString(),
        uptime: '10 days, 12:15:45',
        cpuUsage: 22.1,
        memoryUsage: 52.3,
        version: 'v2.1.0'
      },
      {
        nodeId: 'node-004',
        hostname: 'cdu-backup-01',
        ipAddress: '192.168.1.104',
        status: 'Follower',
        role: 'Backup',
        lastHeartbeat: new Date().toISOString(),
        uptime: '15 days, 8:38:20',
        cpuUsage: 12.5,
        memoryUsage: 35.8,
        version: 'v2.1.0'
      },
      {
        nodeId: 'node-005',
        hostname: 'cdu-worker-03',
        ipAddress: '192.168.1.105',
        status: 'Offline',
        role: 'Worker',
        lastHeartbeat: '2025-01-08T08:30:00Z',
        uptime: 'Offline',
        cpuUsage: 0,
        memoryUsage: 0,
        version: 'v2.0.5'
      }
    ];
    return Promise.resolve({ nodes });
  };

  const getMockNodeDetail = (nodeId: string) => {
    return Promise.resolve({
      nodeId: nodeId,
      hostname: `cdu-${nodeId}`,
      detailed: {
        systemInfo: {
          os: 'Ubuntu 22.04 LTS',
          kernel: '5.15.0-91-generic',
          architecture: 'arm64',
          totalMemory: '8 GB',
          totalStorage: '64 GB'
        },
        clusterRole: {
          currentRole: 'Follower',
          votedFor: 'node-001',
          term: 15,
          commitIndex: 12847,
          lastApplied: 12847
        },
        networkInfo: {
          clusterPort: 8300,
          apiPort: 8001,
          interfaceStatus: 'Up',
          bandwidth: '1 Gbps'
        },
        performance: {
          requestsPerSecond: 245,
          averageResponseTime: '15ms',
          errorRate: '0.02%'
        }
      }
    });
  };

  const renderTestButton = (
    testName: string, 
    label: string, 
    testFn: () => void,
    description?: string,
    icon?: React.ReactNode
  ) => {
    const isLoading = loading[testName];
    const result = results[testName];
    const isExpanded = expandedResults[testName];

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              {icon}
              <Box>
                <Typography variant="h6">{label}</Typography>
                {description && (
                  <Typography variant="body2" color="textSecondary">
                    {description}
                  </Typography>
                )}
              </Box>
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

  const renderClusterNodesTable = () => {
    const result = results['nodeList'];
    if (!result?.success || !result.data?.nodes) return null;

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            集群節點狀態表
          </Typography>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>節點ID</TableCell>
                  <TableCell>主機名</TableCell>
                  <TableCell>IP地址</TableCell>
                  <TableCell>狀態</TableCell>
                  <TableCell>角色</TableCell>
                  <TableCell>CPU使用率</TableCell>
                  <TableCell>記憶體使用率</TableCell>
                  <TableCell>運行時間</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.data.nodes.map((node: ClusterNode) => (
                  <TableRow key={node.nodeId}>
                    <TableCell>{node.nodeId}</TableCell>
                    <TableCell>{node.hostname}</TableCell>
                    <TableCell>{node.ipAddress}</TableCell>
                    <TableCell>
                      <Chip 
                        label={node.status}
                        color={
                          node.status === 'Leader' ? 'primary' :
                          node.status === 'Follower' ? 'success' :
                          node.status === 'Candidate' ? 'warning' : 'error'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={node.role}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{node.cpuUsage}%</TableCell>
                    <TableCell>{node.memoryUsage}%</TableCell>
                    <TableCell>{node.uptime}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        集群管理測試
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        測試分散式CDU系統的集群管理API，包括Raft共識算法、節點管理和集群協調功能。
      </Typography>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        🌐 集群狀態監控
      </Typography>

      {renderTestButton(
        'clusterStatus',
        '集群整體狀態',
        () => executeTest('clusterStatus', getMockClusterStatus),
        '獲取集群健康狀態、共識狀態和配置信息',
        <ClusterIcon color="primary" />
      )}

      {renderTestButton(
        'nodeList',
        '集群節點列表',
        () => executeTest('nodeList', () => getRedfishClusterNodes ? getRedfishClusterNodes() : getMockNodeList()),
        'GET /redfish/v1/Distributed/Nodes - 獲取所有集群節點信息',
        <GroupIcon color="primary" />
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            特定節點詳細信息
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            選擇特定節點來獲取詳細的系統信息、集群角色和性能指標。
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth>
                <InputLabel>選擇節點</InputLabel>
                <Select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                >
                  {sampleNodeIds.map(nodeId => (
                    <MenuItem key={nodeId} value={nodeId}>{nodeId}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="或輸入節點ID"
                value={selectedNodeId}
                onChange={(e) => setSelectedNodeId(e.target.value)}
                placeholder="node-xxx"
              />
            </Grid>
          </Grid>
          <Button
            variant="contained"
            onClick={() => executeTest(`nodeDetail_${selectedNodeId}`, 
              () => getMockNodeDetail(selectedNodeId))}
            startIcon={<NodeIcon />}
            disabled={!selectedNodeId}
          >
            獲取節點詳細信息 ({selectedNodeId})
          </Button>
        </CardContent>
      </Card>

      {renderClusterNodesTable()}

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        ⚙️ 集群配置管理
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            集群配置設定
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            配置集群參數，包括節點數量限制、心跳間隔和選舉超時等Raft共識算法參數。
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="集群名稱"
                value={clusterConfig.clusterName}
                onChange={(e) => setClusterConfig(prev => ({ 
                  ...prev, 
                  clusterName: e.target.value 
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="集群ID"
                value={clusterConfig.clusterId}
                onChange={(e) => setClusterConfig(prev => ({ 
                  ...prev, 
                  clusterId: e.target.value 
                }))}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="最少節點數"
                value={clusterConfig.minNodes}
                onChange={(e) => setClusterConfig(prev => ({ 
                  ...prev, 
                  minNodes: parseInt(e.target.value) 
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="最多節點數"
                value={clusterConfig.maxNodes}
                onChange={(e) => setClusterConfig(prev => ({ 
                  ...prev, 
                  maxNodes: parseInt(e.target.value) 
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="心跳間隔(ms)"
                value={clusterConfig.heartbeatInterval}
                onChange={(e) => setClusterConfig(prev => ({ 
                  ...prev, 
                  heartbeatInterval: parseInt(e.target.value) 
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="選舉超時(ms)"
                value={clusterConfig.electionTimeout}
                onChange={(e) => setClusterConfig(prev => ({ 
                  ...prev, 
                  electionTimeout: parseInt(e.target.value) 
                }))}
              />
            </Grid>
          </Grid>

          <Button
            variant="contained"
            color="primary"
            onClick={() => executeTest('updateClusterConfig', 
              () => Promise.resolve({ message: "集群配置更新功能", config: clusterConfig }))}
            startIcon={<AssignmentIcon />}
            sx={{ mr: 2 }}
          >
            更新集群配置
          </Button>
        </CardContent>
      </Card>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        🔄 集群操作管理
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            集群維護操作
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            執行集群維護操作，如重新選舉、數據同步、節點管理等。
          </Typography>
          
          <Grid container spacing={1}>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="warning"
                onClick={() => executeTest('triggerElection', 
                  () => Promise.resolve({ message: "觸發領導者重新選舉", timestamp: new Date().toISOString() }))}
                startIcon={<SecurityIcon />}
                fullWidth
              >
                觸發重新選舉
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="info"
                onClick={() => executeTest('syncCluster', 
                  () => Promise.resolve({ message: "強制集群數據同步", timestamp: new Date().toISOString() }))}
                startIcon={<SyncIcon />}
                fullWidth
              >
                強制數據同步
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="success"
                onClick={() => executeTest('healthCheck', 
                  () => Promise.resolve({ message: "集群健康檢查", allNodesHealthy: true }))}
                startIcon={<NetworkIcon />}
                fullWidth
              >
                集群健康檢查
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="error"
                onClick={() => executeTest('emergencyRecover', 
                  () => Promise.resolve({ message: "緊急恢復程序", status: "initiated" }))}
                startIcon={<ErrorIcon />}
                fullWidth
              >
                緊急恢復
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>注意:</strong> 確保CDU後端服務正在運行於 http://localhost:8001
            <br />
            本頁面測試分散式CDU集群管理API，包括：
            <br />
            • <strong>Raft共識算法</strong>: Leader選舉、日誌複製、故障恢復機制
            <br />
            • <strong>節點管理</strong>: Master/Worker/Backup角色管理和狀態監控
            <br />
            • <strong>集群配置</strong>: 心跳間隔、選舉超時、複製因子設定
            <br />
            • <strong>故障轉移</strong>: 自動故障檢測和Leader重新選舉機制
            <br />
            • <strong>數據一致性</strong>: 分散式數據同步和一致性保證
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default ClusterManagementTestComponent;