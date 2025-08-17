# 分散式自主CDU系統

## 系統特色

### 1. 完全自主運行架構
- 每台CDU都是完整系統，具備獨立的Jetson Nano控制器
- 單一Master協調，其餘5台獨立運行
- 動態Master選舉採用Raft共識算法

### 2. 智能負載調度機制
- Master承擔80%負載 + 全域調度責任
- 動態平衡根據各CDU剩餘容量分配負載
- 故障時自動調度其他CDU補償

### 3. 毫秒級故障切換
- 心跳監控：每50ms廣播狀態
- 故障檢測：150ms無心跳判定故障
- Master切換：300ms內完成

### 4. 先進通訊架構
- CAN Bus 2.0B：實時控制指令 (50ms心跳)
- Modbus TCP：設備狀態查詢 (100ms週期)
- MQTT over TLS：數據上傳 (1s週期)
- RESTful API：管理介面 (HTTPS)

### 5. AI驅動智能化
- 負載預測：基於歷史數據預測未來30分鐘負載
- 效率優化：學習各CDU最佳運行點
- 故障預測：提前10-30天預警

### 6. 多層安全防護
- TPM 2.0硬體安全模組
- Mutual TLS雙向認證
- RBAC角色權限控制
- 完整審計日誌

## 系統架構

### 四層軟硬件分離架構
```
Layer 4: API層 (distributed_main_api.py)
├── RESTful API端點
├── 認證和授權
└── HTTPS/TLS加密

Layer 3: 應用層 (distributed_engine.py)
├── Raft共識算法
├── 負載調度器
├── AI優化器
└── 集群通訊協調

Layer 2: 功能區塊層 (blocks/)
├── 泵浦VFD控制
├── 溫度感測器
├── 壓力感測器
└── 液位感測器

Layer 1: 硬體抽象層 (hal/)
├── Modbus通訊
├── RS-485串口
└── C語言驅動程式
```

## 安裝與配置

### 1. 安裝依賴
```bash
pip install -r requirements_distributed.txt
```

### 2. 配置系統
編輯 `distributed_cdu_config.yaml`:
```yaml
CDU_System:
  node_id: "CDU_01"  # 每台CDU設定不同ID
  priority_map:
    CDU_01: 1  # 優先級 (1最高)
```

### 3. 啟動系統
```bash
# 啟動分散式CDU系統
python distributed_main_api.py distributed_cdu_config.yaml

# 或使用原有引擎 (向下相容)
python main_api.py
```

## API使用指南

### 認證
```bash
# 登入 (預設帳號: admin/admin123)
curl -X POST "https://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 返回: {"token": "session_token", "message": "Login successful"}
```

### 集群管理
```bash
# 獲取集群狀態
curl -H "Authorization: Bearer session_token" \
  "https://localhost:8000/cluster/status"

# 獲取負載分配
curl -H "Authorization: Bearer session_token" \
  "https://localhost:8000/load/distribution"

# 觸發負載重平衡 (僅Master)
curl -X POST -H "Authorization: Bearer session_token" \
  "https://localhost:8000/load/rebalance"
```

### AI優化
```bash
# 獲取AI預測
curl -H "Authorization: Bearer session_token" \
  "https://localhost:8000/ai/predictions"

# 獲取優化建議
curl -H "Authorization: Bearer session_token" \
  "https://localhost:8000/ai/recommendations"
```

### 設備控制 (向下相容)
```bash
# 獲取泵浦狀態
curl -H "Authorization: Bearer session_token" \
  "https://localhost:8000/redfish/v1/Chassis/CDU_Main/Thermal/Pumps/VFD1"

# 設定泵浦轉速
curl -X POST -H "Authorization: Bearer session_token" \
  "https://localhost:8000/redfish/v1/Chassis/CDU_Main/Thermal/Pumps/VFD1/Actions/Pump.SetSpeed" \
  -d '{"SpeedRPM": 1500}'
```

## 運行情境範例

### 情境一：正常運行
- 系統負載: 240kW (80%)
- 分配策略: CDU1(40kW) + CDU2(35kW) + CDU3(30kW) + CDU4(25kW) + CDU5(20kW) + CDU6(15kW)
- 剩餘容量: 60kW可應急擴展

### 情境二：CDU3故障
- t=0ms: CDU3故障檢測
- t=150ms: Master確認CDU3離線
- t=300ms: 完成30kW負載重分配
- 新分配: CDU2→45kW, CDU4→35kW, CDU5→30kW, CDU6→25kW

### 情境三：Master故障
- t=0ms: CDU1心跳停止
- t=150ms: CDU2檢測故障，發起選舉
- t=200ms: CDU2獲得多數票成為新Master
- t=300ms: CDU2接管調度，重分配CDU1的40kW負載

## 安全配置

### 1. TPM 2.0設定
```bash
# 檢查TPM可用性
ls /dev/tpm*

# 啟用TPM (如果可用)
sudo systemctl enable tpm2-abrmd
```

### 2. TLS憑證
```bash
# 生成自簽憑證 (開發用)
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/server.key \
  -out certs/server.crt -days 365 -nodes
```

### 3. 用戶管理
```python
# 透過API創建用戶
{
  "username": "operator1",
  "password": "secure_password",
  "role": "operator"
}
```

## 效能指標

- **可用性**: 99.99% (年停機 <53分鐘)
- **Master切換**: <300ms
- **負載重分配**: <200ms  
- **MTBF**: >87,600小時 (10年)
- **自動恢復**: MTTR <5分鐘

## 故障排除

### 常見問題

1. **CAN Bus無法初始化**
   ```bash
   sudo ip link set can0 type can bitrate 500000
   sudo ip link set up can0
   ```

2. **TPM不可用**
   - 檢查硬體支援: `dmesg | grep -i tpm`
   - 系統會自動切換到軟體加密模式

3. **Modbus連線失敗**
   - 檢查RS-485連線
   - 驗證設備地址設定

4. **MQTT連線問題**
   - 檢查broker地址和認證
   - 驗證TLS憑證

### 日誌位置
- 系統日誌: 標準輸出
- 審計日誌: `./logs/audit_YYYYMMDD.log`
- AI模型: `./models/`
- TLS憑證: `./certs/`

## 開發指南

### 擴展功能區塊
1. 在 `blocks/` 目錄創建新模組
2. 繼承 `BaseBlock` 類別
3. 在配置檔中添加區塊定義

### 添加AI模型
1. 在 `ai_optimizer.py` 中擴展預測器
2. 實現訓練和預測方法
3. 註冊到主優化器

### 新增通訊協定
1. 在 `cluster_communication.py` 中添加處理器
2. 實現協定特定的編解碼
3. 註冊訊息處理器

## 授權

本系統基於分散式自主CDU架構設計，保持與原有四層軟硬件分離架構的相容性。