#!/usr/bin/env python3
"""
驗證PLC數據來源 - 檢查是否為實際PLC數據
"""

import requests
import json
import time
from datetime import datetime

def get_plc_data():
    """獲取PLC數據"""
    try:
        response = requests.get('http://localhost:8001/redfish/v1/Systems/CDU1')
        if response.status_code == 200:
            data = response.json()
            return data['Oem']['CDU']['RegisterData']
        return None
    except Exception as e:
        print(f"獲取數據失敗: {e}")
        return None

def analyze_data_pattern():
    """分析數據模式以判斷數據來源"""
    print("=== PLC數據來源驗證 ===")
    print(f"開始時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 收集多次數據
    data_samples = []
    for i in range(10):
        print(f"收集第 {i+1} 次數據...")
        data = get_plc_data()
        if data:
            data_samples.append({
                'time': datetime.now(),
                'data': data
            })
        time.sleep(2)
    
    if not data_samples:
        print("❌ 無法獲取數據")
        return
    
    print(f"\n=== 數據分析結果 ===")
    print(f"收集到 {len(data_samples)} 組數據")
    
    # 分析每個暫存器的變化
    registers = ['R10000', 'R10001', 'R10002', 'R10003', 'R10004', 
                'R10005', 'R10006', 'R10007', 'R10008', 'R10009', 'R10010']
    
    for reg in registers:
        values = []
        for sample in data_samples:
            if reg in sample['data']:
                values.append(sample['data'][reg]['value'])
        
        if values:
            min_val = min(values)
            max_val = max(values)
            unique_vals = len(set(values))
            
            print(f"{reg} ({sample['data'][reg]['name']}):")
            print(f"  範圍: {min_val} - {max_val}")
            print(f"  變化次數: {unique_vals}")
            print(f"  最新值: {values[-1]}")
            
            # 判斷數據特徵
            if unique_vals == 1:
                print(f"  特徵: 固定值 (可能是設定值或狀態)")
            elif unique_vals > len(values) * 0.7:
                print(f"  特徵: 高變化率 (可能是實時測量值)")
            else:
                print(f"  特徵: 中等變化率")
            print()
    
    # 檢查運轉時間是否遞增
    r10009_values = []
    for sample in data_samples:
        if 'R10009' in sample['data']:
            r10009_values.append(sample['data']['R10009']['value'])
    
    if len(r10009_values) > 1:
        is_increasing = all(r10009_values[i] <= r10009_values[i+1] 
                           for i in range(len(r10009_values)-1))
        print(f"R10009 運轉時間遞增: {'是' if is_increasing else '否'}")
        if is_increasing:
            print("✅ 運轉時間正常遞增，表明數據可能來自實際PLC")
        else:
            print("⚠️ 運轉時間未遞增，可能是模擬數據")
    
    # 檢查數據更新時間
    print(f"\n=== 數據更新分析 ===")
    for i, sample in enumerate(data_samples[-3:], len(data_samples)-2):
        print(f"第{i}次: {sample['time'].strftime('%H:%M:%S')}")
    
    # 總結判斷
    print(f"\n=== 數據來源判斷 ===")
    
    # 檢查是否有典型的模擬數據特徵
    temp_values = [s['data']['R10002']['value'] for s in data_samples if 'R10002' in s['data']]
    current_values = [s['data']['R10006']['value'] for s in data_samples if 'R10006' in s['data']]
    voltage_values = [s['data']['R10007']['value'] for s in data_samples if 'R10007' in s['data']]
    
    temp_range = max(temp_values) - min(temp_values) if temp_values else 0
    current_range = max(current_values) - min(current_values) if current_values else 0
    voltage_range = max(voltage_values) - min(voltage_values) if voltage_values else 0
    
    print(f"溫度變化範圍: {temp_range}°C")
    print(f"電流變化範圍: {current_range}A")
    print(f"電壓變化範圍: {voltage_range}V")
    
    # 模擬數據通常有較大的隨機變化
    if temp_range > 5 or current_range > 30 or voltage_range > 15:
        print("🔄 數據來源: 可能是模擬數據 (變化範圍較大)")
    elif temp_range == 0 and current_range == 0 and voltage_range == 0:
        print("📊 數據來源: 可能是固定值或PLC離線")
    else:
        print("🏭 數據來源: 可能是實際PLC數據 (變化範圍合理)")

if __name__ == "__main__":
    analyze_data_pattern()
