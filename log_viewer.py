#!/usr/bin/env python3
"""
CDU系統日誌查看工具
用於查看和分析每日日誌記錄
"""

import os
import json
from datetime import datetime, timedelta
from pathlib import Path
import argparse

class LogViewer:
    """日誌查看器"""
    
    def __init__(self, log_base_dir="log"):
        self.log_base_dir = Path(log_base_dir)
    
    def list_available_dates(self):
        """列出可用的日誌日期"""
        if not self.log_base_dir.exists():
            print("日誌目錄不存在")
            return []
        
        dates = []
        for item in self.log_base_dir.iterdir():
            if item.is_dir() and item.name.count('-') == 2:
                try:
                    datetime.strptime(item.name, "%Y-%m-%d")
                    dates.append(item.name)
                except ValueError:
                    continue
        
        return sorted(dates, reverse=True)
    
    def show_date_summary(self, date_str):
        """顯示指定日期的日誌摘要"""
        date_dir = self.log_base_dir / date_str
        if not date_dir.exists():
            print(f"日期 {date_str} 的日誌不存在")
            return
        
        print(f"\n📅 日誌摘要 - {date_str}")
        print("=" * 50)
        
        # 檢查摘要文件
        summary_file = date_dir / "daily_summary.json"
        if summary_file.exists():
            with open(summary_file, 'r', encoding='utf-8') as f:
                summary = json.load(f)
            print(f"生成時間: {summary.get('generated_at', 'Unknown')}")
        
        # 列出日誌文件和大小
        log_types = ["system", "sensors", "plc", "api", "errors"]
        for log_type in log_types:
            log_dir = date_dir / log_type
            if log_dir.exists():
                log_files = list(log_dir.glob("*.log"))
                total_size = sum(f.stat().st_size for f in log_files)
                file_count = len(log_files)
                print(f"📁 {log_type.upper()}: {file_count} 個文件, {total_size:,} bytes")
    
    def view_log_file(self, date_str, log_type, lines=50):
        """查看指定日誌文件的最後幾行"""
        date_dir = self.log_base_dir / date_str / log_type
        if not date_dir.exists():
            print(f"日誌類型 {log_type} 在 {date_str} 不存在")
            return
        
        log_files = list(date_dir.glob("*.log"))
        if not log_files:
            print(f"在 {log_type} 目錄中沒有找到日誌文件")
            return
        
        # 使用最新的日誌文件
        latest_log = max(log_files, key=lambda f: f.stat().st_mtime)
        
        print(f"\n📄 {log_type.upper()} 日誌 - {date_str}")
        print(f"文件: {latest_log.name}")
        print("=" * 80)
        
        try:
            with open(latest_log, 'r', encoding='utf-8') as f:
                all_lines = f.readlines()
                
            # 顯示最後幾行
            display_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            
            for line in display_lines:
                print(line.rstrip())
                
            print(f"\n顯示了最後 {len(display_lines)} 行 (總共 {len(all_lines)} 行)")
            
        except Exception as e:
            print(f"讀取日誌文件時出錯: {e}")
    
    def search_logs(self, date_str, keyword, log_type=None):
        """在日誌中搜索關鍵字"""
        date_dir = self.log_base_dir / date_str
        if not date_dir.exists():
            print(f"日期 {date_str} 的日誌不存在")
            return
        
        print(f"\n🔍 搜索關鍵字: '{keyword}' 在 {date_str}")
        print("=" * 60)
        
        search_dirs = [log_type] if log_type else ["system", "sensors", "plc", "api", "errors"]
        
        total_matches = 0
        for search_type in search_dirs:
            type_dir = date_dir / search_type
            if not type_dir.exists():
                continue
                
            log_files = list(type_dir.glob("*.log"))
            for log_file in log_files:
                try:
                    with open(log_file, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                    
                    matches = [(i+1, line.strip()) for i, line in enumerate(lines) 
                              if keyword.lower() in line.lower()]
                    
                    if matches:
                        print(f"\n📁 {search_type.upper()} - {log_file.name}")
                        print("-" * 40)
                        for line_num, line in matches[:10]:  # 最多顯示10個匹配
                            print(f"{line_num:4d}: {line}")
                        
                        if len(matches) > 10:
                            print(f"... 還有 {len(matches) - 10} 個匹配")
                        
                        total_matches += len(matches)
                        
                except Exception as e:
                    print(f"搜索 {log_file} 時出錯: {e}")
        
        print(f"\n總共找到 {total_matches} 個匹配")
    
    def generate_daily_report(self, date_str):
        """生成每日報告"""
        date_dir = self.log_base_dir / date_str
        if not date_dir.exists():
            print(f"日期 {date_str} 的日誌不存在")
            return
        
        print(f"\n📊 每日報告 - {date_str}")
        print("=" * 60)
        
        # 統計各類日誌的行數
        stats = {}
        for log_type in ["system", "sensors", "plc", "api", "errors"]:
            type_dir = date_dir / log_type
            if type_dir.exists():
                total_lines = 0
                for log_file in type_dir.glob("*.log"):
                    try:
                        with open(log_file, 'r', encoding='utf-8') as f:
                            total_lines += len(f.readlines())
                    except:
                        continue
                stats[log_type] = total_lines
        
        # 顯示統計
        for log_type, line_count in stats.items():
            print(f"📈 {log_type.upper()}: {line_count:,} 條記錄")
        
        # 錯誤統計
        error_dir = date_dir / "errors"
        if error_dir.exists():
            error_files = list(error_dir.glob("*.log"))
            if error_files:
                print(f"\n⚠️  錯誤分析:")
                for error_file in error_files:
                    try:
                        with open(error_file, 'r', encoding='utf-8') as f:
                            error_lines = f.readlines()
                        print(f"   {error_file.name}: {len(error_lines)} 個錯誤")
                    except:
                        continue

def main():
    """主函數"""
    parser = argparse.ArgumentParser(description="CDU系統日誌查看工具")
    parser.add_argument("--date", help="指定日期 (YYYY-MM-DD)")
    parser.add_argument("--list", action="store_true", help="列出可用日期")
    parser.add_argument("--type", choices=["system", "sensors", "plc", "api", "errors"], 
                       help="日誌類型")
    parser.add_argument("--lines", type=int, default=50, help="顯示行數")
    parser.add_argument("--search", help="搜索關鍵字")
    parser.add_argument("--report", action="store_true", help="生成每日報告")
    
    args = parser.parse_args()
    
    viewer = LogViewer()
    
    if args.list:
        dates = viewer.list_available_dates()
        print("📅 可用的日誌日期:")
        for date in dates:
            print(f"  {date}")
        return
    
    # 默認使用今天的日期
    target_date = args.date or datetime.now().strftime("%Y-%m-%d")
    
    if args.report:
        viewer.generate_daily_report(target_date)
    elif args.search:
        viewer.search_logs(target_date, args.search, args.type)
    elif args.type:
        viewer.view_log_file(target_date, args.type, args.lines)
    else:
        viewer.show_date_summary(target_date)

if __name__ == "__main__":
    main()
