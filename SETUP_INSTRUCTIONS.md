# CDU系統環境設置說明

## 問題解決方案

### 1. PLC連接池優化已完成 ✅

**問題**：超過10個PLC區塊後無法讀取數值，出現"PLC Disconnected"錯誤。

**原因**：每個MitsubishiPLCBlock創建獨立連接，超過PLC設備連接限制。

**解決方案**：
- ✅ 實現了PLC連接池管理器 (`blocks/plc_connection_pool.py`)
- ✅ 修正了MitsubishiPLCBlock缺少`block_id`屬性的錯誤
- ✅ 修正了配置檔案中的重複定義和地址錯誤
- ✅ 每個PLC主機最多3個共享連接，支援批量讀取

### 2. 當前API服務問題 ⚠️

**問題**：API服務無法啟動，缺少Python依賴包。

**錯誤訊息**：
```
ModuleNotFoundError: No module named 'fastapi'
```

## 解決方案選項

### 選項1：安裝Python依賴 (推薦)

```bash
# 安裝所需依賴包
pip install fastapi uvicorn pyyaml pymodbus requests

# 或使用requirements.txt
pip install -r requirements.txt
```

### 選項2：使用Docker (推薦用於生產環境)

```bash
# 建構並啟動CDU系統
docker-compose up -d --build

# 查看服務狀態
docker-compose ps

# 查看日誌
docker logs cdu_service
```

### 選項3：手動啟動API服務

安裝依賴後：
```bash
# 啟動分散式CDU API服務
python3 simple_distributed_main.py

# 或使用最小化API
python3 minimal_api.py
```

## 驗證修復

### 1. 檢查API服務
```bash
# 檢查8001端口是否監聽
ss -tlnp | grep 8001

# 測試API連接
curl http://localhost:8001/api/v1/test
```

### 2. 測試PLC連接
```bash
# 運行PLC連接測試
python3 test_distributed_api.py
```

### 3. 前端連接測試
- 確保API在8001端口運行
- 前端UI會自動連接到 `http://localhost:8001`
- 檢查瀏覽器控制台是否有連接錯誤

## 修復狀態

| 問題 | 狀態 | 解決方案 |
|------|------|----------|
| PLC區塊超過10個無法讀取 | ✅ 完成 | 連接池管理器 |
| block_id屬性錯誤 | ✅ 完成 | 添加兼容性屬性 |
| 配置檔案錯誤 | ✅ 完成 | 修正重複定義和地址 |
| API服務無法啟動 | ⚠️ 需要用戶操作 | 安裝依賴包 |
| 前端API連接失敗 | ⚠️ 待API啟動 | 啟動8001端口服務 |

## 下一步操作

1. **立即執行**：安裝Python依賴包
2. **測試驗證**：啟動API服務並測試連接
3. **功能驗證**：確認所有23個PLC區塊都能正常讀取數值

執行這些步驟後，系統應該能完全正常運行，所有PLC區塊都能成功讀取數值。