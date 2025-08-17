#!/usr/bin/env python3
"""
CDU系統監控腳本
定期檢查系統狀態並顯示關鍵指標
"""

import requests
import json
import time
from datetime import datetime
import os
import sys
import signal

# 配置
BASE_URL = "http://localhost:8000"
REFRESH_INTERVAL = 5  # 秒 - 改為1秒更新
CLEAR_SCREEN = True   # 是否清屏

# 全局變量
running = True

def signal_handler(sig, frame):
    """處理Ctrl+C信號"""
    global running
    print("\n正在退出監控...")
    running = False

def clear():
    """清屏"""
    if CLEAR_SCREEN:
        os.system('cls' if os.name == 'nt' else 'clear')

def get_api_data(endpoint):
    """從API獲取數據"""
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=2)
        if response.status_code == 200:
            return response.json()
        return {"error": f"狀態碼: {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

def display_header():
    """顯示標題"""
    print(f"{'='*80}")
    print(f"{'CDU系統監控':^80}")
    print(f"{'更新時間: ' + datetime.now().strftime('%Y-%m-%d %H:%M:%S'):^80}")
    print(f"{'='*80}")

def display_health():
    """顯示健康狀態"""
    health_data = get_api_data("/health")
    
    print("\n[系統健康狀態]")
    if "error" in health_data:
        print(f"錯誤: {health_data['error']}")
        return
    
    print(f"狀態: {health_data.get('status', 'N/A')}")
    print(f"節點ID: {health_data.get('node_id', 'N/A')}")
    print(f"引擎狀態: {health_data.get('engine_status', 'N/A')}")
    print(f"時間戳: {health_data.get('timestamp', 'N/A')}")

def display_sensors():
    """顯示感測器數據"""
    sensors_data = get_api_data("/sensors")

    print("\n[感測器數據]")
    if "error" in sensors_data:
        print(f"錯誤: {sensors_data['error']}")
        return

    for sensor_id, sensor_info in sensors_data.items():
        print(f"\n感測器: {sensor_id}")
        print(f"  類型: {sensor_info.get('type', 'N/A')}")
        print(f"  狀態: {sensor_info.get('status', 'N/A')}")
        print(f"  健康: {sensor_info.get('health', 'N/A')}")

        # 顯示溫度數據
        if 'temperature' in sensor_info:
            temp_value = sensor_info['temperature']
            temp_units = sensor_info.get('temperature_units', '°C')
            if temp_value >= 0:
                print(f"  🌡️  溫度: {temp_value:.1f} {temp_units}")
            else:
                print(f"  🌡️  溫度: 無法讀取")

        # 顯示壓力數據
        if 'pressure' in sensor_info:
            press_value = sensor_info['pressure']
            press_units = sensor_info.get('pressure_units', 'Bar')
            if press_value >= 0:
                print(f"  📊 壓力: {press_value:.2f} {press_units}")
            else:
                print(f"  📊 壓力: 無法讀取")

        # 顯示液位狀態
        if 'level_status' in sensor_info:
            level_status = sensor_info['level_status']
            print(f"  💧 液位: {level_status}")

        # 顯示轉速數據
        if 'current_rpm' in sensor_info:
            rpm_value = sensor_info['current_rpm']
            rpm_units = sensor_info.get('rpm_units', 'RPM')
            print(f"  ⚙️  轉速: {rpm_value:.0f} {rpm_units}")

def display_plc_data():
    """顯示PLC數據"""
    plc_data = get_api_data("/plc")

    print("\n[PLC數據]")
    if "error" in plc_data:
        print(f"錯誤: {plc_data['error']}")
        return

    plc_count = plc_data.get('plc_count', 0)
    if plc_count == 0:
        print("未找到PLC設備")
        return

    print(f"PLC設備數量: {plc_count}")

    for plc_id, plc_info in plc_data.get('plc_data', {}).items():
        print(f"\n🏭 PLC: {plc_id}")
        print(f"  IP地址: {plc_info.get('ip_address', 'N/A')}:{plc_info.get('port', 'N/A')}")
        print(f"  連接狀態: {'✅ 已連接' if plc_info.get('connected', False) else '❌ 未連接'}")
        print(f"  健康狀態: {plc_info.get('health', 'N/A')}")
        print(f"  狀態: {plc_info.get('status', 'N/A')}")

        # 顯示暫存器數據
        registers = plc_info.get('registers', {})
        if registers:
            print(f"  📊 D暫存器數據:")
            for reg_name, reg_value in registers.items():
                print(f"    {reg_name}: {reg_value}")
        else:
            print(f"  📊 暫存器: 無數據")

        # 顯示連接統計
        if 'connection_errors' in plc_info:
            print(f"  🔗 連接錯誤次數: {plc_info['connection_errors']}")

def display_cluster():
    """顯示集群信息"""
    cluster_data = get_api_data("/cluster/nodes")

    print("\n[集群節點信息]")
    if "error" in cluster_data:
        print(f"錯誤: {cluster_data['error']}")
        return

    print(f"當前節點: {cluster_data.get('current_node', 'N/A')}")
    print(f"總節點數: {cluster_data.get('total_nodes', 'N/A')}")
    print(f"節點優先級: {cluster_data.get('node_priority', 'N/A')}")

def main():
    """主函數"""
    # 註冊信號處理器
    signal.signal(signal.SIGINT, signal_handler)
    
    print("CDU系統監控啟動中...")
    print(f"監控URL: {BASE_URL}")
    print(f"刷新間隔: {REFRESH_INTERVAL}秒")
    print("按Ctrl+C退出")
    time.sleep(1)
    
    while running:
        clear()
        display_header()
        display_health()
        display_sensors()
        display_plc_data()
        display_cluster()
        
        print(f"\n{'='*80}")
        print(f"{'按Ctrl+C退出 | 下次更新: ' + (datetime.now().strftime('%H:%M:%S')):^80}")
        
        # 等待下次刷新
        for _ in range(REFRESH_INTERVAL):
            if not running:
                break
            time.sleep(1)
    
    print("監控已停止")

if __name__ == "__main__":
    main()
