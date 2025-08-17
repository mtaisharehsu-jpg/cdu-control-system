# Contributing to CDU Control System Platform
# CDU 控制系統平台貢獻指南

[English](#english) | [中文](#中文)

---

## English

We welcome contributions to the CDU Control System Platform! This document provides guidelines for contributing to the project.

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/cdu-control-system.git
   cd cdu-control-system
   ```
3. **Set up the development environment**:
   ```bash
   # Using Docker (recommended)
   docker-compose up -d --build
   
   # Or local development
   pip install -r requirements.txt
   cd cdu-config-ui && npm install
   ```

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   # Backend tests
   python -m pytest test_*.py -v
   
   # Frontend tests
   cd cdu-config-ui && npm test
   
   # Integration tests
   python test_integration_logic.py
   ```

4. **Commit your changes**:
   ```bash
   git commit -m "feat: add new sensor type support"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

### Coding Standards

#### Python Code (Backend)
- Follow PEP 8 style guidelines
- Use type hints where possible
- Add docstrings for functions and classes
- Write unit tests for new functionality

#### TypeScript/React Code (Frontend)
- Follow ESLint configuration
- Use functional components with hooks
- Add proper TypeScript types
- Test components with appropriate test frameworks

#### C Code (HAL Layer)
- Follow standard C coding conventions
- Add proper error handling
- Document hardware-specific functions
- Test on actual hardware when possible

### Architecture Guidelines

#### Adding New Function Blocks
1. **Create block class** in `blocks/` directory:
   ```python
   class NewSensorBlock(BaseBlock):
       def __init__(self, block_id, **config):
           super().__init__(block_id, **config)
   ```

2. **Update configuration** in `distributed_cdu_config.yaml`:
   ```yaml
   - id: NewSensor1
     type: NewSensorBlock
     # ... configuration parameters
   ```

3. **Add tests** in `test_new_sensor.py`

#### API Endpoint Guidelines
- Follow Redfish conventions for standard API
- Use clear, RESTful URL structures
- Include proper error handling and status codes
- Add comprehensive API documentation

### Testing

#### Required Tests
- Unit tests for all new functions/classes
- Integration tests for API endpoints
- Hardware simulation tests for HAL functions
- End-to-end tests for critical workflows

#### Test Commands
```bash
# All backend tests
python -m pytest test_*.py -v

# Specific component tests
python test_cdu_sensors.py
python test_redfish_api.py
python test_plc_connection.py

# Frontend tests
cd cdu-config-ui && npm test
```

### Documentation

#### Required Documentation
- Update README.md if adding major features
- Add API documentation for new endpoints
- Include configuration examples
- Document hardware requirements

#### Documentation Format
- Use Markdown for all documentation
- Include both English and Chinese sections
- Add code examples where relevant
- Keep architecture diagrams updated

### Pull Request Guidelines

#### PR Requirements
- Descriptive title and summary
- Reference related issues
- Include test results
- Update documentation as needed
- Follow commit message conventions

#### Commit Message Format
```
type(scope): description

feat(api): add new temperature sensor endpoint
fix(hal): resolve Modbus connection timeout
docs(readme): update installation instructions
test(plc): add unit tests for register operations
```

#### PR Review Process
1. Automated tests must pass
2. Code review by maintainers
3. Documentation review
4. Final approval and merge

### Security Guidelines

- Never commit sensitive data (passwords, keys, certificates)
- Use environment variables for configuration
- Follow secure coding practices
- Report security vulnerabilities privately

### Getting Help

- Check existing [issues](https://github.com/your-repo/issues)
- Read project documentation
- Join our community discussions
- Contact maintainers for major architectural changes

---

## 中文

我們歡迎對 CDU 控制系統平台的貢獻！本文檔提供了為專案做出貢獻的指南。

### 開始使用

1. **在 GitHub 上 Fork 倉庫**
2. **在本地克隆您的 fork**：
   ```bash
   git clone https://github.com/your-username/cdu-control-system.git
   cd cdu-control-system
   ```
3. **設置開發環境**：
   ```bash
   # 使用 Docker（推薦）
   docker-compose up -d --build
   
   # 或本地開發
   pip install -r requirements.txt
   cd cdu-config-ui && npm install
   ```

### 開發工作流程

1. **建立功能分支**：
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **按照編碼標準進行更改**

3. **測試您的更改**：
   ```bash
   # 後端測試
   python -m pytest test_*.py -v
   
   # 前端測試
   cd cdu-config-ui && npm test
   
   # 整合測試
   python test_integration_logic.py
   ```

4. **提交您的更改**：
   ```bash
   git commit -m "feat: add new sensor type support"
   ```

5. **推送到您的 fork**：
   ```bash
   git push origin feature/your-feature-name
   ```

6. **在 GitHub 上建立 Pull Request**

### 編碼標準

#### Python 代碼（後端）
- 遵循 PEP 8 風格指南
- 盡可能使用類型提示
- 為函數和類添加文檔字符串
- 為新功能編寫單元測試

#### TypeScript/React 代碼（前端）
- 遵循 ESLint 配置
- 使用帶有 hooks 的函數組件
- 添加適當的 TypeScript 類型
- 使用適當的測試框架測試組件

#### C 代碼（HAL 層）
- 遵循標準 C 編碼慣例
- 添加適當的錯誤處理
- 記錄硬體特定函數
- 盡可能在實際硬體上測試

### 架構指南

#### 添加新功能塊
1. **在 `blocks/` 目錄中建立塊類**：
   ```python
   class NewSensorBlock(BaseBlock):
       def __init__(self, block_id, **config):
           super().__init__(block_id, **config)
   ```

2. **在 `distributed_cdu_config.yaml` 中更新配置**：
   ```yaml
   - id: NewSensor1
     type: NewSensorBlock
     # ... 配置參數
   ```

3. **在 `test_new_sensor.py` 中添加測試**

#### API 端點指南
- 為標準 API 遵循 Redfish 慣例
- 使用清晰的 RESTful URL 結構
- 包含適當的錯誤處理和狀態碼
- 添加完整的 API 文檔

### 測試

#### 必需的測試
- 所有新函數/類的單元測試
- API 端點的整合測試
- HAL 函數的硬體模擬測試
- 關鍵工作流程的端到端測試

#### 測試命令
```bash
# 所有後端測試
python -m pytest test_*.py -v

# 特定組件測試
python test_cdu_sensors.py
python test_redfish_api.py
python test_plc_connection.py

# 前端測試
cd cdu-config-ui && npm test
```

### 文檔

#### 必需的文檔
- 如果添加主要功能，請更新 README.md
- 為新端點添加 API 文檔
- 包含配置示例
- 記錄硬體要求

#### 文檔格式
- 所有文檔使用 Markdown
- 包含英文和中文部分
- 在相關位置添加代碼示例
- 保持架構圖表更新

### Pull Request 指南

#### PR 要求
- 描述性標題和摘要
- 引用相關問題
- 包含測試結果
- 根據需要更新文檔
- 遵循提交訊息慣例

#### 提交訊息格式
```
type(scope): description

feat(api): add new temperature sensor endpoint
fix(hal): resolve Modbus connection timeout
docs(readme): update installation instructions
test(plc): add unit tests for register operations
```

#### PR 審查流程
1. 自動化測試必須通過
2. 維護者進行代碼審查
3. 文檔審查
4. 最終批准和合併

### 安全指南

- 永遠不要提交敏感數據（密碼、金鑰、證書）
- 使用環境變數進行配置
- 遵循安全編碼實踐
- 私下報告安全漏洞

### 獲得幫助

- 檢查現有的 [issues](https://github.com/your-repo/issues)
- 閱讀專案文檔
- 加入我們的社區討論
- 聯繫維護者進行重大架構更改