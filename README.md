# CDU Control System Platform v1.0
# CDU 控制系統平台 v1.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)

[English](#english) | [中文](#中文)

---

## English

### Overview

This is a **Coolant Distribution Unit (CDU) Control System Platform** built on a three-tier architecture designed for high modularity and extensibility. The system controls industrial equipment like pumps, temperature sensors, pressure sensors, and liquid level sensors via Modbus/RS-485 communication.

### Architecture

**Three-Tier Architecture:**
1. **Presentation Layer (API):** FastAPI-based Redfish-like RESTful API
2. **Logic Layer (Engine):** Python Function Block engine for control logic  
3. **Hardware Abstraction Layer (HAL):** C library for hardware communication (Modbus RTU/TCP)

### Key Features

- 🏭 **Industrial Control**: Support for pumps, sensors, and PLC systems
- 🌐 **Multi-API Support**: Standard Redfish API and distributed system API
- 🔧 **Hardware Abstraction**: C-based HAL for Modbus RTU/TCP communication
- 📊 **Real-time Monitoring**: Live sensor data and system status
- 🖥️ **Web Interface**: React/TypeScript configuration UI
- 🐳 **Docker Ready**: Complete containerization support
- 🔒 **Security**: Built-in authentication and audit logging
- 📈 **Scalable**: Distributed system with Raft consensus

### Quick Start

#### Prerequisites
- Docker and Docker Compose
- Python 3.8+
- Node.js (for UI development)

#### 1. Docker Development (Recommended)
```bash
# Build and run the entire system
docker-compose up -d --build

# View logs
docker logs cdu_service

# Stop services
docker-compose down
```

#### 2. Backend Development
```bash
# Install dependencies
pip install -r requirements.txt

# Standard CDU system (port 8000)
python main_api.py

# Distributed CDU system (port 8001)
python distributed_main_api.py distributed_cdu_config.yaml

# Minimal API for testing
python minimal_api.py
```

#### 3. Frontend Development
```bash
cd cdu-config-ui/
npm install
npm run dev        # Development server (port 5173)
npm run build      # Production build
```

### API Endpoints

#### Standard API (Port 8000) - Redfish Style
```bash
# Pump control
curl http://localhost:8000/redfish/v1/Chassis/CDU_Main/Thermal/Pumps/VFD1

# Temperature sensors
curl http://localhost:8000/redfish/v1/Chassis/CDU_Main/Thermal/Temperatures/Temp1

# Pressure sensors  
curl http://localhost:8000/redfish/v1/Chassis/CDU_Main/Thermal/Pressures/Press1
```

#### Distributed API (Port 8001) - Frontend Integration
```bash
# Real-time sensor data
curl http://localhost:8001/api/v1/sensors/readings

# Function block configuration
curl http://localhost:8001/api/v1/function-blocks/config

# PLC register operations
curl http://localhost:8001/plc/PLC1/registers
```

### Project Structure

```
CDU_cid_v00/
├── main_api.py              # Standard Redfish API
├── distributed_main_api.py  # Distributed system API
├── engine.py               # Control engine
├── blocks/                 # Function blocks
│   ├── temp_sensor.py     # Temperature sensors
│   ├── press_sensor.py    # Pressure sensors
│   └── mitsubishi_plc.py  # PLC communication
├── hal/                   # Hardware abstraction layer
├── cdu-config-ui/         # React frontend
├── config/               # Configuration files
└── tests/               # Test suites
```

### Testing

```bash
# Run individual tests
python test_cdu_status.py
python test_redfish_api.py
python test_plc_connection.py

# Run all tests
python -m pytest test_*.py -v
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 中文

### 概述

這是一個基於三層式架構的 **冷卻劑分配單元(CDU)控制系統平台**，旨在實現高模組化與可擴展性。系統通過 Modbus/RS-485 通信控制工業設備，如泵、溫度感測器、壓力感測器和液位感測器。

### 架構

**三層式架構：**
1. **表現層 (API):** 基於 FastAPI 的 Redfish-like RESTful API
2. **邏輯層 (Engine):** 基於 Python 的功能塊引擎，用於控制邏輯
3. **硬體抽象層 (HAL):** 基於 C 語言的硬體通信函式庫 (Modbus RTU/TCP)

### 主要功能

- 🏭 **工業控制**: 支持泵、感測器和 PLC 系統
- 🌐 **多 API 支持**: 標準 Redfish API 和分散式系統 API
- 🔧 **硬體抽象**: 基於 C 的 HAL 層支持 Modbus RTU/TCP 通信
- 📊 **即時監控**: 即時感測器數據和系統狀態
- 🖥️ **Web 界面**: React/TypeScript 配置介面
- 🐳 **Docker 就緒**: 完整的容器化支持
- 🔒 **安全性**: 內建認證和審計日誌
- 📈 **可擴展**: 基於 Raft 共識的分散式系統

### 快速開始

#### 系統需求
- Docker 和 Docker Compose
- Python 3.8+
- Node.js (用於 UI 開發)

#### 1. Docker 開發 (推薦)
```bash
# 建構並運行整個系統
docker-compose up -d --build

# 查看日誌
docker logs cdu_service

# 停止服務
docker-compose down
```

#### 2. 後端開發
```bash
# 安裝依賴
pip install -r requirements.txt

# 標準 CDU 系統 (端口 8000)
python main_api.py

# 分散式 CDU 系統 (端口 8001)
python distributed_main_api.py distributed_cdu_config.yaml

# 測試用最小 API
python minimal_api.py
```

#### 3. 前端開發
```bash
cd cdu-config-ui/
npm install
npm run dev        # 開發服務器 (端口 5173)
npm run build      # 生產建構
```

### API 端點

#### 標準 API (端口 8000) - Redfish 風格
```bash
# 泵控制
curl http://localhost:8000/redfish/v1/Chassis/CDU_Main/Thermal/Pumps/VFD1

# 溫度感測器
curl http://localhost:8000/redfish/v1/Chassis/CDU_Main/Thermal/Temperatures/Temp1

# 壓力感測器
curl http://localhost:8000/redfish/v1/Chassis/CDU_Main/Thermal/Pressures/Press1
```

#### 分散式 API (端口 8001) - 前端整合
```bash
# 即時感測器數據
curl http://localhost:8001/api/v1/sensors/readings

# 功能塊配置
curl http://localhost:8001/api/v1/function-blocks/config

# PLC 暫存器操作
curl http://localhost:8001/plc/PLC1/registers
```

### 專案結構

```
CDU_cid_v00/
├── main_api.py              # 標準 Redfish API
├── distributed_main_api.py  # 分散式系統 API
├── engine.py               # 控制引擎
├── blocks/                 # 功能塊
│   ├── temp_sensor.py     # 溫度感測器
│   ├── press_sensor.py    # 壓力感測器
│   └── mitsubishi_plc.py  # PLC 通信
├── hal/                   # 硬體抽象層
├── cdu-config-ui/         # React 前端
├── config/               # 配置檔案
└── tests/               # 測試套件
```

### 測試

```bash
# 運行個別測試
python test_cdu_status.py
python test_redfish_api.py
python test_plc_connection.py

# 運行所有測試
python -m pytest test_*.py -v
```

### 貢獻

1. Fork 此倉庫
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 授權

此專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案。

### 支持

如果您遇到問題或有功能建議，請在 GitHub Issues 中報告。

---

## Documentation | 文檔

- [Setup Instructions | 設置說明](SETUP_INSTRUCTIONS.md)
- [API Documentation | API 文檔](README_Redfish_API.md)
- [Architecture Manual | 架構手冊](CDU_Project_Architecture_Manual.md)
- [Development Guide | 開發指南](CLAUDE.md)