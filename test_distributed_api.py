#!/usr/bin/env python3
"""
分散式CDU系統API測試腳本
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8001"

def test_api_endpoint(endpoint, description):
    """測試API端點"""
    print(f"\n{'='*60}")
    print(f"測試: {description}")
    print(f"端點: {endpoint}")
    print(f"{'='*60}")
    
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
        print(f"狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("回應內容:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"錯誤 ({response.status_code}): {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 連接失敗 - 請確認分散式API服務是否在8001端口運行")
        print("   啟動命令: python distributed_main_api.py distributed_cdu_config.yaml")
    except requests.exceptions.Timeout:
        print("⏰ 請求超時")
    except Exception as e:
        print(f"請求失敗: {e}")

def monitor_sensors():
    """持續監控感測器數據"""
    try:
        print("開始監控感測器數據 (每3秒更新，按Ctrl+C停止)...")
        
        while True:
            try:
                response = requests.get(f"{BASE_URL}/api/v1/sensors/readings", timeout=3)
                
                if response.status_code == 200:
                    data = response.json()
                    timestamp = datetime.now().strftime('%H:%M:%S')
                    
                    print(f"\n[{timestamp}] 感測器數據:")
                    for sensor in data:
                        if sensor['block_type'] in ['TempSensorBlock', 'PressSensorBlock']:
                            print(f"  {sensor['block_id']}: {sensor['value']} {sensor['unit']} "
                                  f"(健康度: {sensor['health']}, 狀態: {sensor['status']})")
                else:
                    print(f"API錯誤: {response.status_code}")
                    
            except requests.exceptions.ConnectionError:
                print("❌ API連接中斷")
                break
            except Exception as e:
                print(f"監控錯誤: {e}")
                
            time.sleep(3)
            
    except KeyboardInterrupt:
        print("\n✅ 監控已停止")

def main():
    """主測試函數"""
    print("分散式CDU系統API測試 (端口: 8001)")
    print(f"測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 測試各個API端點
    test_cases = [
        ("/", "根端點 - 系統歡迎訊息"),
        ("/api/v1/test", "API測試端點 - 連接測試"),
        ("/api/v1/sensors/readings", "感測器數據 - 即時讀數"),
        ("/docs", "API文檔 - Swagger UI"),
    ]
    
    for endpoint, description in test_cases:
        test_api_endpoint(endpoint, description)
        time.sleep(1)  # 避免請求過於頻繁
    
    print(f"\n{'='*60}")
    print("測試完成！")
    print("您可以在瀏覽器中訪問以下URL:")
    print(f"- API文檔: {BASE_URL}/docs")
    print(f"- API測試: {BASE_URL}/api/v1/test")
    print(f"- 感測器數據: {BASE_URL}/api/v1/sensors/readings")
    print(f"{'='*60}")
    
    # 如果感測器API正常，進行持續監控
    print("\n嘗試持續監控感測器數據...")
    monitor_sensors()

if __name__ == "__main__":
    main()
