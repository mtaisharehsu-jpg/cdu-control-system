# VS Code CDU 專案開發指南
# VS Code CDU Project Development Guide

[中文](#中文) | [English](#english)

---

## 中文

### 🚀 快速開始

#### 1. 安裝必要的 VS Code 擴展

當您打開此專案時，VS Code 會自動建議安裝推薦的擴展。點擊「Install All」或手動安裝以下核心擴展：

**必要擴展：**
- **Python** (Microsoft) - Python 語言支持
- **GitLens** - 增強的 Git 功能
- **Docker** - Docker 容器支持
- **Thunder Client** - API 測試工具
- **YAML** - YAML 檔案支持

**前端開發擴展：**
- **ES7+ React/Redux/React-Native snippets** - React 代碼片段
- **Prettier** - 代碼格式化
- **ESLint** - JavaScript/TypeScript 程式碼檢查

#### 2. 設置 Python 解釋器

1. 按 `Ctrl+Shift+P` 打開命令面板
2. 輸入 "Python: Select Interpreter"
3. 選擇您的 Python 3.8+ 環境

#### 3. 安裝依賴

使用內建任務快速安裝所有依賴：
- 按 `Ctrl+Shift+P`
- 輸入 "Tasks: Run Task"
- 選擇 "CDU: Install Python Dependencies"
- 選擇 "CDU: Install Frontend Dependencies"

### 📁 專案結構說明

```
CDU_cid_v00/
├── .vscode/                    # VS Code 配置
│   ├── launch.json            # 偵錯配置
│   ├── settings.json          # 工作區設置
│   ├── tasks.json             # 自動化任務
│   └── extensions.json        # 推薦擴展
├── 後端 API/
│   ├── main_api.py            # 標準 Redfish API (端口 8000)
│   ├── distributed_main_api.py # 分散式 API (端口 8001)
│   └── minimal_api.py         # 測試用最小 API
├── 控制邏輯/
│   ├── engine.py              # 控制引擎
│   ├── blocks/                # 功能塊目錄
│   └── distributed_engine.py  # 分散式引擎
├── 硬體抽象層/
│   └── hal/                   # C 語言硬體通信庫
├── 前端界面/
│   └── cdu-config-ui/         # React/TypeScript UI
└── 配置檔案/
    ├── *.yaml                 # 系統配置
    └── test_*.py              # 測試檔案
```

### 🛠️ 開發工作流程

#### 啟動開發環境

**方法 1：使用偵錯器 (推薦)**
1. 按 `F5` 或點擊左側的「執行和偵錯」
2. 選擇以下配置之一：
   - **Python: CDU Distributed API** - 啟動分散式 API (推薦)
   - **Python: CDU Main API** - 啟動標準 API
   - **Launch CDU Full Stack** - 同時啟動後端和前端

**方法 2：使用內建任務**
1. 按 `Ctrl+Shift+P`
2. 輸入 "Tasks: Run Task"
3. 選擇想要執行的任務

#### 常用任務快捷鍵

| 任務 | 快捷鍵 | 說明 |
|------|--------|------|
| 偵錯當前檔案 | `F5` | 啟動偵錯器 |
| 執行任務 | `Ctrl+Shift+P` → Tasks | 執行預定義任務 |
| 整合終端 | `Ctrl+`` | 打開終端 |
| Git 面板 | `Ctrl+Shift+G` | 打開 Git 控制面板 |
| 檔案搜索 | `Ctrl+P` | 快速打開檔案 |
| 全域搜索 | `Ctrl+Shift+F` | 在專案中搜索 |

### 🔧 開發任務說明

#### 後端開發任務
- **CDU: Run Main API** - 啟動標準 Redfish API (端口 8000)
- **CDU: Run Distributed API** - 啟動分散式 API (端口 8001)
- **CDU: Run All Tests** - 執行所有 Python 測試
- **CDU: Lint Python Code** - 檢查 Python 代碼風格
- **CDU: Format Python Code** - 格式化 Python 代碼

#### 前端開發任務
- **CDU: Run Frontend Dev Server** - 啟動 React 開發服務器 (端口 5173)
- **CDU: Build Frontend** - 建構生產版本前端

#### Docker 開發任務
- **CDU: Docker Build** - 建構 Docker 映像
- **CDU: Docker Up** - 啟動 Docker 容器
- **CDU: Docker Down** - 停止 Docker 容器
- **CDU: Docker Logs** - 查看容器日誌

#### 建構任務
- **CDU: Build HAL Library** - 編譯 C 語言 HAL 庫
- **CDU: Install Python Dependencies** - 安裝 Python 依賴
- **CDU: Install Frontend Dependencies** - 安裝前端依賴

### 🐛 偵錯指南

#### Python 後端偵錯
1. 在代碼中設置斷點 (點擊行號左側)
2. 按 `F5` 選擇偵錯配置
3. 使用偵錯控制台查看變數值
4. 使用步驟執行功能：
   - `F10` - 單步執行
   - `F11` - 進入函數
   - `Shift+F11` - 跳出函數

#### API 測試
使用內建的 Thunder Client 或 REST Client：
1. 創建 `.http` 檔案
2. 編寫 API 請求
3. 點擊 "Send Request" 測試

範例：
```http
### 測試溫度感測器
GET http://localhost:8001/api/v1/sensors/readings

### 測試 PLC 暫存器
GET http://localhost:8001/plc/PLC1/registers
```

### 🔄 Git 工作流程

#### 基本工作流程
1. **創建功能分支**
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/新功能名稱
   ```

2. **開發和提交**
   - 使用 VS Code 的 Git 面板 (`Ctrl+Shift+G`)
   - 或使用命令：
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

3. **推送和創建 PR**
   ```bash
   git push origin feature/新功能名稱
   ```
   然後在 GitHub 創建 Pull Request

#### VS Code Git 功能
- **Source Control 面板** - 查看更改、暫存、提交
- **GitLens** - 查看行級別的 Git 歷史
- **Git Graph** - 視覺化分支歷史

### 🧪 測試指南

#### 運行測試
- **所有測試**: 選擇 "CDU: Run All Tests" 任務
- **單個測試**: 打開測試檔案，按 `F5` 選擇 "Python: Test Current File"
- **特定測試**: 使用 Python 測試探索器

#### 測試檔案說明
- `test_cdu_status.py` - CDU 狀態測試
- `test_redfish_api.py` - Redfish API 測試
- `test_plc_connection.py` - PLC 連接測試
- `test_distributed_api.py` - 分散式 API 測試

### 📦 建構和部署

#### 本地建構
1. **後端**: 確保所有 Python 依賴已安裝
2. **前端**: 執行 "CDU: Build Frontend" 任務
3. **HAL 庫**: 執行 "CDU: Build HAL Library" 任務

#### Docker 建構
1. 執行 "CDU: Docker Build" 任務
2. 使用 "CDU: Docker Up" 啟動完整系統
3. 訪問：
   - 後端 API: http://localhost:8000
   - 分散式 API: http://localhost:8001
   - 前端 UI: http://localhost:5173

### 🔍 常見問題排除

#### Python 相關問題
- **ModuleNotFoundError**: 確認已選擇正確的 Python 解釋器
- **Import 錯誤**: 檢查 PYTHONPATH 設置
- **依賴問題**: 重新執行 "CDU: Install Python Dependencies"

#### 前端相關問題
- **npm 錯誤**: 刪除 `node_modules` 並重新安裝
- **TypeScript 錯誤**: 重新啟動 TypeScript 服務器
- **熱重載問題**: 重新啟動開發服務器

#### Docker 相關問題
- **容器啟動失敗**: 檢查端口是否被佔用
- **權限問題**: 確認 Docker 權限設置
- **建構失敗**: 檢查 Dockerfile 和依賴

### 💡 開發技巧

#### 代碼片段
VS Code 會自動提供代碼補全和片段：
- 輸入 `class` 創建 Python 類
- 輸入 `def` 創建函數
- 輸入 `rfc` 創建 React 功能組件

#### 快捷操作
- `Ctrl+D` - 選擇相同的詞
- `Alt+Up/Down` - 移動行
- `Ctrl+/` - 註釋/取消註釋
- `Ctrl+Shift+L` - 選擇所有相同的詞

#### 工作區技巧
- 使用多個編輯器面板查看不同檔案
- 使用 Explorer 側欄快速導航
- 使用 Problems 面板查看錯誤和警告

---

## English

### 🚀 Quick Start

#### 1. Install Required VS Code Extensions

When you open this project, VS Code will automatically suggest installing recommended extensions. Click "Install All" or manually install these core extensions:

**Essential Extensions:**
- **Python** (Microsoft) - Python language support
- **GitLens** - Enhanced Git capabilities
- **Docker** - Docker container support
- **Thunder Client** - API testing tool
- **YAML** - YAML file support

**Frontend Development Extensions:**
- **ES7+ React/Redux/React-Native snippets** - React code snippets
- **Prettier** - Code formatter
- **ESLint** - JavaScript/TypeScript linting

#### 2. Set Python Interpreter

1. Press `Ctrl+Shift+P` to open command palette
2. Type "Python: Select Interpreter"
3. Select your Python 3.8+ environment

#### 3. Install Dependencies

Use built-in tasks to quickly install all dependencies:
- Press `Ctrl+Shift+P`
- Type "Tasks: Run Task"
- Select "CDU: Install Python Dependencies"
- Select "CDU: Install Frontend Dependencies"

### 📁 Project Structure

```
CDU_cid_v00/
├── .vscode/                    # VS Code configuration
│   ├── launch.json            # Debug configurations
│   ├── settings.json          # Workspace settings
│   ├── tasks.json             # Automated tasks
│   └── extensions.json        # Recommended extensions
├── Backend API/
│   ├── main_api.py            # Standard Redfish API (port 8000)
│   ├── distributed_main_api.py # Distributed API (port 8001)
│   └── minimal_api.py         # Minimal testing API
├── Control Logic/
│   ├── engine.py              # Control engine
│   ├── blocks/                # Function blocks directory
│   └── distributed_engine.py  # Distributed engine
├── Hardware Abstraction/
│   └── hal/                   # C language hardware communication
├── Frontend UI/
│   └── cdu-config-ui/         # React/TypeScript UI
└── Configuration/
    ├── *.yaml                 # System configuration
    └── test_*.py              # Test files
```

### 🛠️ Development Workflow

#### Starting Development Environment

**Method 1: Using Debugger (Recommended)**
1. Press `F5` or click "Run and Debug" in the sidebar
2. Select one of these configurations:
   - **Python: CDU Distributed API** - Start distributed API (recommended)
   - **Python: CDU Main API** - Start standard API
   - **Launch CDU Full Stack** - Start both backend and frontend

**Method 2: Using Built-in Tasks**
1. Press `Ctrl+Shift+P`
2. Type "Tasks: Run Task"
3. Select the task you want to execute

#### Common Task Shortcuts

| Task | Shortcut | Description |
|------|----------|-------------|
| Debug current file | `F5` | Start debugger |
| Run task | `Ctrl+Shift+P` → Tasks | Execute predefined tasks |
| Integrated terminal | `Ctrl+`` | Open terminal |
| Git panel | `Ctrl+Shift+G` | Open Git control panel |
| File search | `Ctrl+P` | Quick open file |
| Global search | `Ctrl+Shift+F` | Search in project |

### 🔧 Development Tasks

#### Backend Development Tasks
- **CDU: Run Main API** - Start standard Redfish API (port 8000)
- **CDU: Run Distributed API** - Start distributed API (port 8001)
- **CDU: Run All Tests** - Execute all Python tests
- **CDU: Lint Python Code** - Check Python code style
- **CDU: Format Python Code** - Format Python code

#### Frontend Development Tasks
- **CDU: Run Frontend Dev Server** - Start React dev server (port 5173)
- **CDU: Build Frontend** - Build production frontend

#### Docker Development Tasks
- **CDU: Docker Build** - Build Docker image
- **CDU: Docker Up** - Start Docker containers
- **CDU: Docker Down** - Stop Docker containers
- **CDU: Docker Logs** - View container logs

#### Build Tasks
- **CDU: Build HAL Library** - Compile C language HAL library
- **CDU: Install Python Dependencies** - Install Python dependencies
- **CDU: Install Frontend Dependencies** - Install frontend dependencies

### 🐛 Debugging Guide

#### Python Backend Debugging
1. Set breakpoints in code (click left of line numbers)
2. Press `F5` to select debug configuration
3. Use debug console to inspect variables
4. Use step execution:
   - `F10` - Step over
   - `F11` - Step into
   - `Shift+F11` - Step out

#### API Testing
Use built-in Thunder Client or REST Client:
1. Create `.http` files
2. Write API requests
3. Click "Send Request" to test

Example:
```http
### Test temperature sensor
GET http://localhost:8001/api/v1/sensors/readings

### Test PLC registers
GET http://localhost:8001/plc/PLC1/registers
```

### 🔄 Git Workflow

#### Basic Workflow
1. **Create feature branch**
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/new-feature-name
   ```

2. **Develop and commit**
   - Use VS Code's Git panel (`Ctrl+Shift+G`)
   - Or use commands:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push and create PR**
   ```bash
   git push origin feature/new-feature-name
   ```
   Then create Pull Request on GitHub

#### VS Code Git Features
- **Source Control panel** - View changes, stage, commit
- **GitLens** - View line-level Git history
- **Git Graph** - Visualize branch history

### 🧪 Testing Guide

#### Running Tests
- **All tests**: Select "CDU: Run All Tests" task
- **Single test**: Open test file, press `F5` select "Python: Test Current File"
- **Specific tests**: Use Python test explorer

#### Test File Description
- `test_cdu_status.py` - CDU status tests
- `test_redfish_api.py` - Redfish API tests
- `test_plc_connection.py` - PLC connection tests
- `test_distributed_api.py` - Distributed API tests

### 📦 Build and Deployment

#### Local Build
1. **Backend**: Ensure all Python dependencies are installed
2. **Frontend**: Execute "CDU: Build Frontend" task
3. **HAL Library**: Execute "CDU: Build HAL Library" task

#### Docker Build
1. Execute "CDU: Docker Build" task
2. Use "CDU: Docker Up" to start complete system
3. Access:
   - Backend API: http://localhost:8000
   - Distributed API: http://localhost:8001
   - Frontend UI: http://localhost:5173

### 🔍 Troubleshooting

#### Python Related Issues
- **ModuleNotFoundError**: Confirm correct Python interpreter is selected
- **Import errors**: Check PYTHONPATH settings
- **Dependency issues**: Re-run "CDU: Install Python Dependencies"

#### Frontend Related Issues
- **npm errors**: Delete `node_modules` and reinstall
- **TypeScript errors**: Restart TypeScript server
- **Hot reload issues**: Restart development server

#### Docker Related Issues
- **Container startup failure**: Check if ports are in use
- **Permission issues**: Verify Docker permission settings
- **Build failures**: Check Dockerfile and dependencies

### 💡 Development Tips

#### Code Snippets
VS Code automatically provides code completion and snippets:
- Type `class` to create Python class
- Type `def` to create function
- Type `rfc` to create React functional component

#### Quick Operations
- `Ctrl+D` - Select same word
- `Alt+Up/Down` - Move line
- `Ctrl+/` - Comment/uncomment
- `Ctrl+Shift+L` - Select all same words

#### Workspace Tips
- Use multiple editor panels to view different files
- Use Explorer sidebar for quick navigation
- Use Problems panel to view errors and warnings

---

## 更多資源 | Additional Resources

- [VS Code Python Documentation](https://code.visualstudio.com/docs/python/python-tutorial)
- [VS Code TypeScript Documentation](https://code.visualstudio.com/docs/typescript/typescript-tutorial)
- [GitLens Extension Documentation](https://gitlens.amod.io/)
- [Thunder Client Documentation](https://github.com/rangav/thunder-client-support)