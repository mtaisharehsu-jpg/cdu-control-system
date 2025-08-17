# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
<!-- 此文件為 Claude Code 在此代碼庫中工作時提供指導說明 -->

## Project Overview
<!-- 專案概覽 -->

This is a CDU (Coolant Distribution Unit) control system platform built on a three-tier architecture designed for high modularity and extensibility. The system controls industrial equipment like pumps, temperature sensors, pressure sensors, and liquid level sensors via Modbus/RS-485 communication.
<!-- 這是一個冷卻劑分配單元(CDU)控制系統平台，採用三層架構設計，具有高模組化和可擴展性。系統通過 Modbus/RS-485 通信控制工業設備，如泵、溫度感測器、壓力感測器和液位感測器。 -->

## Architecture
<!-- 架構 -->

**Three-Tier Architecture:**
<!-- 三層架構： -->
1. **Presentation Layer (API):** 
   - `main_api.py` - FastAPI-based Redfish-like RESTful API (port 8000)
   - `distributed_main_api.py` - Distributed CDU system API (port 8001) 
   - `simple_distributed_main.py` - Simplified distributed API (port 8001)
   - `minimal_api.py` - Minimal testing API for PLC integration
   <!-- 表示層 (API)：多種 API 實現支持不同場景 -->
2. **Logic Layer (Engine):** `engine.py`, `distributed_engine.py` & `blocks/` - Python Function Block engine for control logic
   <!-- 邏輯層 (引擎)：用於控制邏輯的 Python 功能塊引擎，支持分散式架構 -->
3. **Hardware Abstraction Layer (HAL):** `hal/` - C library for hardware communication (Modbus RTU/TCP)
   <!-- 硬體抽象層 (HAL)：用於硬體通信的 C 庫，支持 Modbus RTU/TCP -->

## Development Commands
<!-- 開發命令 -->

### Docker Development (Primary Method)
<!-- Docker 開發 (主要方法) -->
```bash
# Build and run the entire system
# 建構並運行整個系統
docker-compose up -d --build

# View logs
# 查看日誌
docker logs cdu_service

# Stop services
# 停止服務
docker-compose down
```

### HAL Layer Compilation
<!-- HAL 層編譯 -->
```bash
# Compile C library (Windows)
# 編譯 C 庫 (Windows)
cd hal/
make

# The output is lib-cdu-hal.dll (Windows) or lib-cdu-hal.so (Linux)
# 輸出文件是 lib-cdu-hal.dll (Windows) 或 lib-cdu-hal.so (Linux)
```

### Backend Development
<!-- 後端開發 -->
```bash
# Standard CDU system (port 8000)
# 標準 CDU 系統 (端口 8000)
python main_api.py

# Distributed CDU system (port 8001)
# 分散式 CDU 系統 (端口 8001)
python distributed_main_api.py distributed_cdu_config.yaml

# Simplified distributed system (recommended for development)
# 簡化分散式系統 (推薦用於開發)
python simple_distributed_main.py distributed_cdu_config.yaml

# Minimal API for PLC testing
# 用於 PLC 測試的最小 API
python minimal_api.py
```

### Testing
<!-- 測試 -->
```bash
# Run individual test files (comprehensive test suite available)
# 運行個別測試文件 (提供完整測試套件)
python test_cdu_status.py
python test_redfish_api.py
python test_plc_connection.py
python test_distributed_cdu.py
python test_machine_config.py
python test_alarms.py

# Test API endpoints manually
# 手動測試 API 端點
curl http://localhost:8000/redfish/v1/Chassis/CDU_Main/Thermal/Temperatures/Temp1
curl http://localhost:8001/api/v1/sensors/readings

# Run all tests matching pattern
# 運行匹配模式的所有測試
python -m pytest test_*.py -v
```

### UI Development
<!-- UI 開發 -->
```bash
# React/TypeScript configuration UI (cdu-config-ui/)
# React/TypeScript 配置界面 (cdu-config-ui/)
cd cdu-config-ui/
npm install
npm run dev        # Development server with hot reload (port 5173)
npm run build      # Production build
npm run preview    # Preview production build

# UI runs on http://localhost:5173 in development
# 開發模式下 UI 運行在 http://localhost:5173

# Frontend connects to distributed API on port 8001
# 前端連接到端口 8001 的分散式 API

# If esbuild platform issues occur:
# 如果發生 esbuild 平台兼容性問題：
rm -rf node_modules package-lock.json && npm install --force
```

### Dependencies
<!-- 依賴項 -->
```bash
pip install -r requirements.txt
# Core: fastapi, uvicorn, pydantic<2, pyyaml
# 核心依賴：fastapi, uvicorn, pydantic<2, pyyaml
```

## Key Files and Structure
<!-- 關鍵文件和結構 -->

### Configuration
<!-- 配置 -->
- `cdu_config.yaml` - Main configuration defining function blocks, Modbus addresses, and device mappings
  <!-- 主要配置文件，定義功能塊、Modbus 地址和設備映射 -->
- `distributed_cdu_config.yaml` - Configuration for distributed/cluster mode
  <!-- 分散式/叢集模式的配置 -->

### Core Components
<!-- 核心組件 -->

#### Backend APIs
<!-- 後端 API -->
- `main_api.py` - Standard FastAPI server with Redfish-style endpoints (port 8000)
  <!-- 標準 FastAPI 服務器，具有 Redfish 風格的端點 (端口 8000) -->
- `distributed_main_api.py` - Distributed CDU system API with comprehensive features (port 8001)
  <!-- 具有完整功能的分散式 CDU 系統 API (端口 8001) -->
- `simple_distributed_main.py` - Simplified distributed API for development (port 8001)
  <!-- 用於開發的簡化分散式 API (端口 8001) -->
- `minimal_api.py` - Minimal API for PLC testing and development (port 8001)
  <!-- 用於 PLC 測試和開發的最小 API (端口 8001) -->

#### Control Engines
<!-- 控制引擎 -->
- `engine.py` - Standard control engine that manages function blocks in background thread
  <!-- 標準控制引擎，在後台線程中管理功能塊 -->
- `distributed_engine.py` - Distributed control engine for cluster operations
  <!-- 用於叢集操作的分散式控制引擎 -->

#### Function Blocks
<!-- 功能塊 -->
- `blocks/base_block.py` - Abstract base class for all function blocks
  <!-- 所有功能塊的抽象基類 -->
- `blocks/pump_vfd.py`, `blocks/temp_sensor.py`, `blocks/press_sensor.py` - Modbus RTU sensor implementations
  <!-- Modbus RTU 感測器實現 -->
- `blocks/mitsubishi_plc.py` - Mitsubishi PLC block for Modbus TCP communication
  <!-- 三菱 PLC 區塊用於 Modbus TCP 通信 -->

#### System Management
<!-- 系統管理 -->
- `distributed_cdu.py` - Raft consensus-based distributed system manager
  <!-- 基於 Raft 共識的分散式系統管理器 -->
- `machine_config.py` - Machine configuration and management system
  <!-- 機器配置和管理系統 -->
- `security_manager.py` - Security, authentication, and audit logging
  <!-- 安全、認證和審計日誌記錄 -->

#### Frontend Interface
<!-- 前端界面 -->
- `cdu-config-ui/` - React/TypeScript configuration interface with Material-UI
  <!-- React/TypeScript 配置界面，使用 Material-UI -->
- `cdu-config-ui/src/contexts/MachineConfigContext.tsx` - Dynamic machine configuration context
  <!-- 動態機器配置上下文 -->
- `cdu-config-ui/src/api/simpleApi.ts` - Frontend API client (connects to port 8001)
  <!-- 前端 API 客戶端 (連接到端口 8001) -->

#### Testing and Development Tools
<!-- 測試和開發工具 -->
- `cdu-config-ui/hal-data-injector.js` - HAL data injection for frontend testing
  <!-- 用於前端測試的 HAL 數據注入 -->
- `cdu-config-ui/mock-api-server.html` - Mock API server for development
  <!-- 用於開發的模擬 API 服務器 -->
- `cdu-config-ui/mock-hal-data.json` - Mock sensor data for testing
  <!-- 用於測試的模擬感測器數據 -->

### HAL Layer
<!-- HAL 層 -->
- `hal/hal_modbus.c` - Modbus communication implementation
  <!-- Modbus 通信實現 -->
- `hal/hal_uart.c` - UART/serial communication
  <!-- UART/串行通信 -->
- `hal/Makefile` - Builds shared library for Python integration
  <!-- 建構用於 Python 集成的共享庫 -->

### API Structure
<!-- API 結構 -->

#### Standard API (port 8000) - Redfish Style
<!-- 標準 API (端口 8000) - Redfish 風格 -->
The API follows Redfish conventions:
<!-- API 遵循 Redfish 慣例： -->
- `/redfish/v1/Chassis/CDU_Main/Thermal/Pumps/{pump_id}` - Pump control
  <!-- 泵控制 -->
- `/redfish/v1/Chassis/CDU_Main/Thermal/Temperatures/{temp_id}` - Temperature sensors
  <!-- 溫度感測器 -->
- `/redfish/v1/Chassis/CDU_Main/Thermal/Pressures/{press_id}` - Pressure sensors
  <!-- 壓力感測器 -->
- `/redfish/v1/Chassis/CDU_Main/Alarms/` - Alarm management and monitoring
  <!-- 警報管理和監控 -->
- `/redfish/v1/MachineConfig/` - Machine configuration endpoints
  <!-- 機器配置端點 -->
- `/redfish/v1/Distributed/` - Distributed system management
  <!-- 分散式系統管理 -->

#### Distributed API (port 8001) - Frontend Integration
<!-- 分散式 API (端口 8001) - 前端整合 -->
Frontend-optimized endpoints for real-time data and configuration:
<!-- 為即時數據和配置優化的前端端點： -->
- `/api/v1/test` - API connection test and status
  <!-- API 連接測試和狀態 -->
- `/api/v1/sensors/readings` - Real-time sensor data (all sensors)
  <!-- 即時感測器數據 (所有感測器) -->
- `/api/v1/function-blocks/config` - Dynamic function block configuration
  <!-- 動態功能區塊配置 -->
- `/sensors/{sensor_id}` - Individual sensor detailed information
  <!-- 個別感測器詳細信息 -->
- `/plc/{plc_id}` - PLC block detailed information
  <!-- PLC 區塊詳細信息 -->
- `/plc/{plc_id}/registers` - PLC register data (D/R registers)
  <!-- PLC 暫存器數據 (D/R 暫存器) -->
- `/plc/{plc_id}/write_register` - Write single PLC register
  <!-- 寫入單個 PLC 暫存器 -->
- `/plc/{plc_id}/write_registers_batch` - Batch write PLC registers
  <!-- 批量寫入 PLC 暫存器 -->

## Adding New Components
<!-- 添加新組件 -->

### Adding New Function Blocks (Recommended Process)
<!-- 添加新功能區塊 (推薦流程) -->

1. **Configuration First:** Add block definition to `distributed_cdu_config.yaml`
   <!-- 配置優先：將塊定義添加到 `distributed_cdu_config.yaml` -->
   ```yaml
   - id: PLC1-Temp4
     type: MitsubishiPLCBlock
     ip_address: "10.10.40.8"
     port: 502
     unit_id: 1
     register: 20  # R10020
   ```

2. **Automatic Frontend Integration:** The frontend will automatically detect and load new function blocks
   <!-- 自動前端整合：前端會自動檢測和載入新功能區塊 -->
   - New blocks appear in machine configuration dropdown menus
   - Real-time data display updates automatically
   - No manual frontend code changes required

3. **Optional Block Implementation:** Create custom block class in `blocks/` if needed
   <!-- 可選區塊實現：如需要，在 `blocks/` 中創建自定義區塊類 -->
   ```python
   class CustomSensorBlock(BaseBlock):
       def __init__(self, block_id, **config):
           super().__init__(block_id, **config)
           # Custom initialization
   ```

4. **HAL Layer Extension:** Add C functions in `hal/` for new hardware protocols
   <!-- HAL 層擴展：在 `hal/` 中為新的硬體協議添加 C 函數 -->

### Function Block Types Supported
<!-- 支持的功能區塊類型 -->
- **TempSensorBlock:** Modbus RTU temperature sensors (COM port communication)
  <!-- 溫度感測器區塊：Modbus RTU 溫度感測器 (COM 端口通信) -->
- **PressSensorBlock:** Modbus RTU pressure sensors (COM port communication)  
  <!-- 壓力感測器區塊：Modbus RTU 壓力感測器 (COM 端口通信) -->
- **MitsubishiPLCBlock:** Modbus TCP PLC communication (IP/Ethernet)
  <!-- 三菱 PLC 區塊：Modbus TCP PLC 通信 (IP/乙太網路) -->
- **PumpVFDBlock:** Variable Frequency Drive pump control
  <!-- 泵 VFD 區塊：變頻驅動器泵控制 -->
- **LiquidLevelSensorBlock:** Liquid level monitoring
  <!-- 液位感測器區塊：液位監控 -->

## Development Notes
<!-- 開發注意事項 -->

### System Architecture
<!-- 系統架構 -->
- System supports both Windows (development) and Linux (production) environments
  <!-- 系統支持 Windows (開發) 和 Linux (生產) 環境 -->
- HAL library automatically falls back to simulation mode if hardware unavailable
  <!-- 如果硬體不可用，HAL 庫會自動回退到模擬模式 -->
- Engine runs in background thread while API serves requests
  <!-- 引擎在後台線程中運行，同時 API 處理請求 -->
- Configuration changes require backend restart (not container restart for development)
  <!-- 配置更改需要重新啟動後端 (開發時不需要重新啟動容器) -->

### Hardware Communication
<!-- 硬體通信 -->
- **Modbus RTU:** Serial communication via COM ports (temperature/pressure sensors)
  <!-- Modbus RTU：通過 COM 端口的串行通信 (溫度/壓力感測器) -->
- **Modbus TCP:** Ethernet/IP communication (PLC systems)
  <!-- Modbus TCP：乙太網路/IP 通信 (PLC 系統) -->
- Serial port `/dev/ttyTHS1` is mapped for Jetson Nano hardware
  <!-- 串行端口 `/dev/ttyTHS1` 映射到 Jetson Nano 硬體 -->

### Frontend-Backend Integration
<!-- 前後端整合 -->
- Frontend (port 5173) connects to distributed API (port 8001)
  <!-- 前端 (端口 5173) 連接到分散式 API (端口 8001) -->
- Dynamic function block loading: New blocks in YAML automatically appear in UI
  <!-- 動態功能區塊載入：YAML 中的新區塊會自動出現在 UI 中 -->
- Real-time sensor data updates every 3 seconds
  <!-- 即時感測器數據每 3 秒更新一次 -->
- HAL data display: Blue text indicates real hardware data vs simulated data
  <!-- HAL 數據顯示：藍色文字表示真實硬體數據 vs 模擬數據 -->

### Development Tools
<!-- 開發工具 -->
- All test files use `test_` prefix and can be run independently
  <!-- 所有測試文件使用 `test_` 前綴，可以獨立運行 -->
- Mock API server available for frontend development without backend
  <!-- 提供模擬 API 服務器用於無後端的前端開發 -->
- HAL data injector for testing real data integration
  <!-- HAL 數據注入器用於測試真實數據整合 -->
- Comprehensive logging system with structured logs in `logs/` directory
  <!-- 完整的日誌系統，在 `logs/` 目錄中提供結構化日誌 -->

### Production Features
<!-- 生產功能 -->
- Distributed mode uses Raft consensus algorithm for cluster coordination
  <!-- 分散式模式使用 Raft 共識算法進行叢集協調 -->
- UI state management uses Context API with Material-UI components
  <!-- UI 狀態管理使用 Context API 和 Material-UI 組件 -->
- SSL certificates supported for production deployment
  <!-- 支持 SSL 證書用於生產部署 -->
- PLC register read/write operations with batch support
  <!-- PLC 暫存器讀寫操作，支持批量操作 -->

## Troubleshooting
<!-- 故障排除 -->

### Backend Issues
<!-- 後端問題 -->
- **Python dependencies missing**: Install with `pip install -r requirements.txt`
  <!-- Python 依賴項缺失：使用 `pip install -r requirements.txt` 安裝 -->
- **API server fails to start**: Check if port 8001 is already in use
  <!-- API 服務器啟動失敗：檢查端口 8001 是否已被使用 -->
- **Container fails to start**: Check `docker logs cdu_service` for detailed error messages
  <!-- 容器啟動失敗：檢查 `docker logs cdu_service` 獲取詳細錯誤信息 -->
- **PLC connection issues**: Verify IP address and port in `distributed_cdu_config.yaml`
  <!-- PLC 連接問題：驗證 `distributed_cdu_config.yaml` 中的 IP 地址和端口 -->

### Frontend Issues
<!-- 前端問題 -->
- **UI not loading**: Ensure React dev server is running on port 5173
  <!-- UI 無法加載：確保 React 開發服務器在端口 5173 上運行 -->
- **esbuild platform errors**: Delete node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install --force`
  <!-- esbuild 平台錯誤：刪除 node_modules 並重新安裝 -->
- **API connection failed**: Check if distributed API is running on port 8001
  <!-- API 連接失敗：檢查分散式 API 是否在端口 8001 上運行 -->
- **New function blocks not appearing**: Restart both backend and frontend servers
  <!-- 新功能區塊未出現：重新啟動後端和前端服務器 -->

### Data Display Issues
<!-- 數據顯示問題 -->
- **Simulated data instead of real HAL data**: 
  <!-- 顯示模擬數據而非真實 HAL 數據： -->
  1. Verify backend is reading hardware correctly
  2. Check HAL connection logs in `logs/` directory
  3. Use HAL data injector for testing: `hal-data-injector.js`
- **Function blocks missing from dropdown**: Check `distributed_cdu_config.yaml` syntax
  <!-- 下拉選單中缺少功能區塊：檢查 `distributed_cdu_config.yaml` 語法 -->

### Hardware Communication
<!-- 硬體通信 -->
- **Hardware communication issues**: HAL library will fallback to simulation mode automatically
  <!-- 硬體通信問題：HAL 庫會自動回退到模擬模式 -->
- **Modbus RTU errors**: Check COM port settings and cable connections
  <!-- Modbus RTU 錯誤：檢查 COM 端口設置和電纜連接 -->
- **Modbus TCP errors**: Verify network connectivity and PLC IP address
  <!-- Modbus TCP 錯誤：驗證網路連接和 PLC IP 地址 -->

### Development Environment
<!-- 開發環境 -->
- **Test failures**: Run individual test files to isolate issues
  <!-- 測試失敗：運行個別測試文件以隔離問題 -->
- **Cross-platform issues**: Use minimal_api.py for simplified testing
  <!-- 跨平台問題：使用 minimal_api.py 進行簡化測試 -->
- **Mock data testing**: Open `mock-api-server.html` in browser for standalone testing
  <!-- 模擬數據測試：在瀏覽器中打開 `mock-api-server.html` 進行獨立測試 -->