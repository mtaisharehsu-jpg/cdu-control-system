# CDU Frontend API Documentation

## 概述

本文檔描述了CDU前端應用程式的API通訊模組，提供與後端CDU系統的完整API接口。

## 文件結構

```
src/api/
├── cduApi.ts          # 主要API模組
├── apiExamples.ts     # 使用範例和React Hooks
├── apiTester.ts       # API測試工具
└── README_API.md      # 本文檔
```

## 環境配置

### .env 文件設定

在專案根目錄創建 `.env` 文件：

```env
# CDU API Configuration
VITE_API_BASE_URL=http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU

# Development settings
VITE_APP_TITLE=CDU Configuration UI
VITE_APP_VERSION=1.0.0

# API timeout settings (in milliseconds)
VITE_API_TIMEOUT=10000

# Enable debug mode
VITE_DEBUG=true
```

## API 模組功能

### 1. 機種配置管理

```typescript
import { getMachineConfigs, setCurrentMachine, createMachineConfig } from './api/cduApi';

// 獲取所有機種配置
const configs = await getMachineConfigs();

// 切換當前機種
await setCurrentMachine('cdu_compact');

// 創建自定義機種
await createMachineConfig({
  machine_type: 'my_cdu',
  machine_name: '我的CDU',
  description: '自定義配置',
  sensor_config: { ... }
});
```

### 2. 系統狀態監控

```typescript
import { getSystemStatus } from './api/cduApi';

// 獲取系統狀態
const status = await getSystemStatus();
console.log('系統運行狀態:', status.summary.overall_status);
```

### 3. 感測器數據讀取

```typescript
import { getSensors, readSensor, batchReadSensors } from './api/cduApi';

// 獲取所有感測器
const allSensors = await getSensors();

// 獲取特定類型感測器
const tempSensors = await getSensors('temperature');

// 批量讀取感測器
const batchData = await batchReadSensors({
  sensor_types: ['temperature', 'pressure'],
  include_reserved: false
});
```

### 4. 異常信息管理

```typescript
import { getAlarms, getIntegratedAlarms } from './api/cduApi';

// 獲取基本異常信息
const alarms = await getAlarms();

// 獲取統合異常信息
const integratedAlarms = await getIntegratedAlarms();
console.log('系統健康評分:', integratedAlarms.system_health_score);
```

### 5. 操作控制

```typescript
import { executeOperation, getOperationsStatus } from './api/cduApi';

// 執行操作
await executeOperation({ operation: 'start' });
await executeOperation({ operation: 'fan_start' });

// 獲取操作狀態
const opStatus = await getOperationsStatus();
```

### 6. 數值設定

```typescript
import { writeValue, getValuesStatus } from './api/cduApi';

// 設定溫度
await writeValue({ parameter: 'temp_setting', value: 25.5 });

// 設定風扇轉速
await writeValue({ parameter: 'fan_speed', value: 75 });

// 獲取數值狀態
const values = await getValuesStatus();
```

## React Hooks 使用

### 機種配置 Hook

```typescript
import { useMachineConfigs } from './api/apiExamples';

const MyComponent = () => {
  const { configs, loading, error, switchMachine } = useMachineConfigs();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Current: {configs?.current_machine}</h2>
      <button onClick={() => switchMachine('cdu_compact')}>
        Switch to Compact
      </button>
    </div>
  );
};
```

### 系統狀態 Hook

```typescript
import { useSystemStatus } from './api/apiExamples';

const StatusDashboard = () => {
  const { status, loading, error } = useSystemStatus(1000); // 每秒更新

  return (
    <div>
      <h2>System Status</h2>
      <p>Running: {status?.summary.running ? '✅' : '❌'}</p>
      <p>Status: {status?.summary.overall_status}</p>
    </div>
  );
};
```

### 感測器監控 Hook

```typescript
import { useSensors } from './api/apiExamples';

const SensorMonitor = () => {
  const { sensors, loading, error } = useSensors('temperature', 2000);

  return (
    <div>
      <h2>Temperature Sensors</h2>
      {sensors?.sensors_data.temperature?.sensors && 
        Object.entries(sensors.sensors_data.temperature.sensors).map(([name, data]) => (
          <div key={name}>
            {data.description}: {data.actual_value} {data.unit}
          </div>
        ))
      }
    </div>
  );
};
```

## 錯誤處理

### 統一錯誤處理

```typescript
import { formatApiError, isApiError } from './api/cduApi';

try {
  const result = await getSensors();
  // 處理成功結果
} catch (error) {
  const errorMessage = formatApiError(error);
  console.error('API Error:', errorMessage);
  
  // 顯示用戶友好的錯誤信息
  setErrorMessage(errorMessage);
}
```

### 超時處理

```typescript
import { withTimeout } from './api/cduApi';

try {
  // 5秒超時
  const result = await withTimeout(getSensors(), 5000);
} catch (error) {
  if (error.message === 'Request timeout') {
    console.error('請求超時');
  }
}
```

## API 測試

### 運行所有測試

```typescript
import { runAllTests } from './api/apiTester';

// 在開發環境中運行API測試
const testResults = await runAllTests();
console.log('測試結果:', testResults);
```

### 單獨測試特定API

```typescript
import { testMachineConfigApis, testSensorApis } from './api/apiTester';

// 測試機種配置API
await testMachineConfigApis();

// 測試感測器API
await testSensorApis();
```

## 類型定義

### 主要接口

```typescript
// 機種配置
interface MachineConfig {
  machine_name: string;
  description: string;
  sensor_config: SensorConfig;
  created_time: string;
  updated_time: string;
}

// 感測器數據
interface SensorData {
  register_address: number;
  raw_value: number | null;
  actual_value: number | null;
  unit: string;
  description: string;
  status: string;
  is_active: boolean;
}

// 系統狀態
interface SystemStatus {
  success: boolean;
  summary: SystemSummary;
  registers: Record<string, any>;
  timestamp: string;
}
```

## 最佳實踐

### 1. 使用 TypeScript

所有API調用都有完整的類型定義，確保類型安全：

```typescript
// ✅ 正確：使用類型定義
const config: MachineConfigRequest = {
  machine_type: 'my_cdu',
  machine_name: '我的CDU',
  description: '描述',
  sensor_config: { ... }
};

// ❌ 錯誤：缺少類型定義
const config = { ... };
```

### 2. 錯誤處理

始終處理API錯誤：

```typescript
// ✅ 正確：完整錯誤處理
try {
  const result = await getMachineConfigs();
  setConfigs(result);
} catch (error) {
  setError(formatApiError(error));
  console.error('Failed to fetch configs:', error);
}

// ❌ 錯誤：忽略錯誤
const result = await getMachineConfigs();
setConfigs(result);
```

### 3. 載入狀態

提供載入狀態反饋：

```typescript
// ✅ 正確：顯示載入狀態
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await getSensors();
    setSensors(data);
  } finally {
    setLoading(false);
  }
};

if (loading) return <div>Loading...</div>;
```

### 4. 超時設定

為長時間運行的操作設定超時：

```typescript
// ✅ 正確：設定超時
const result = await withTimeout(
  batchReadSensors(request), 
  10000 // 10秒超時
);
```

## 調試技巧

### 1. 啟用調試模式

在 `.env` 文件中設定：

```env
VITE_DEBUG=true
```

### 2. 查看API請求

開啟瀏覽器開發者工具的Console，可以看到所有API請求和響應的詳細信息。

### 3. 使用API測試工具

```typescript
// 在瀏覽器控制台中運行
import { apiTester } from './api/apiTester';
await apiTester.runAllTests();
```

## 常見問題

### Q: API請求失敗怎麼辦？

A: 檢查以下項目：
1. 後端服務是否運行 (http://localhost:8001)
2. 網路連接是否正常
3. API端點是否正確
4. 請求參數是否符合要求

### Q: 如何處理CORS問題？

A: 確保後端API服務器配置了正確的CORS設定，允許前端域名訪問。

### Q: 如何自定義API超時時間？

A: 在 `.env` 文件中設定 `VITE_API_TIMEOUT`，或在個別API調用中使用 `withTimeout`。

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 配置環境

創建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:8001/redfish/v1/Systems/CDU1/Oem/CDU
VITE_DEBUG=true
```

### 3. 啟動開發服務器

```bash
npm run dev
```

### 4. 測試API連接

在瀏覽器中訪問API測試組件：

```typescript
import ApiTestComponent from './components/ApiTestComponent';

// 在你的App組件中使用
<ApiTestComponent />
```

## 文件說明

### 核心文件

- **`cduApi.ts`**: 主要API模組，包含所有API函數和類型定義
- **`apiExamples.ts`**: React Hooks和使用範例
- **`apiTester.ts`**: API測試工具和測試套件
- **`index.ts`**: 統一導出文件
- **`ApiTestComponent.tsx`**: 可視化API測試組件

### 支援文件

- **`.env`**: 環境配置文件
- **`README_API.md`**: 本文檔

## 完整功能列表

### ✅ 已實現功能

1. **機種配置管理**
   - 獲取所有機種配置
   - 創建自定義機種配置
   - 切換當前機種
   - 刪除機種配置

2. **系統狀態監控**
   - 實時系統狀態
   - 運行狀態檢查
   - 異常狀態監控

3. **感測器數據管理**
   - 所有感測器數據讀取
   - 按類型篩選感測器
   - 批量感測器讀取
   - 實時數據更新

4. **異常信息管理**
   - 基本異常信息
   - 統合異常分析
   - 系統健康評分
   - 關鍵問題識別

5. **操作控制**
   - CDU啟動/停止
   - 風扇控制
   - 操作狀態監控

6. **數值設定**
   - 溫度設定
   - 風扇轉速設定
   - 泵浦轉速設定
   - 流量設定

7. **暫存器操作**
   - 單一暫存器讀取
   - 單一暫存器寫入

8. **開發工具**
   - 完整API測試套件
   - 錯誤處理工具
   - 調試功能
   - 超時管理

## 架構設計

```
CDU Frontend API Module
├── Core API Layer (cduApi.ts)
│   ├── Axios Configuration
│   ├── Request/Response Interceptors
│   ├── Type Definitions
│   └── API Functions
├── React Integration (apiExamples.ts)
│   ├── Custom Hooks
│   ├── Component Examples
│   └── State Management
├── Testing Framework (apiTester.ts)
│   ├── Test Suites
│   ├── Performance Monitoring
│   └── Error Reporting
├── Utilities (index.ts)
│   ├── Quick Access Functions
│   ├── Constants
│   └── Helper Functions
└── UI Components (ApiTestComponent.tsx)
    ├── Visual Testing Interface
    ├── Real-time Monitoring
    └── Debug Tools
```

## 性能優化

### 1. 請求優化
- 自動重試機制
- 請求超時控制
- 並發請求管理

### 2. 數據緩存
- React Hook狀態緩存
- 智能刷新策略
- 錯誤狀態恢復

### 3. 類型安全
- 完整TypeScript支援
- 運行時類型檢查
- API響應驗證

## 安全考慮

### 1. 錯誤處理
- 統一錯誤格式化
- 敏感信息過濾
- 用戶友好錯誤信息

### 2. 請求安全
- CORS配置
- 請求頭驗證
- 超時保護

### 3. 數據驗證
- 輸入參數驗證
- 響應數據檢查
- 類型安全保證

## 更新日誌

- **v1.0.0** (2025-07-21): 初始版本，完整的CDU API通訊模組
  - 實現所有核心API功能
  - 提供React Hooks集成
  - 包含完整測試套件
  - 支援TypeScript類型安全
  - 提供可視化測試工具
