"""
Fault Diagnosis and Troubleshooting Guidance System
故障診斷與排除指導系統 - 基於 CDU200KW 實際故障排除手冊
"""

import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaultSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class ComponentType(Enum):
    PUMP = "pump"
    VALVE = "valve"
    SENSOR = "sensor"
    CONTROLLER = "controller"
    POWER = "power"
    COMMUNICATION = "communication"
    COOLING = "cooling"
    MECHANICAL = "mechanical"

class DiagnosisStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class TroubleshootingStep:
    """故障排除步驟"""
    step_number: int
    title: str
    description: str
    action: str
    expected_result: str
    safety_warning: Optional[str] = None
    required_tools: List[str] = None
    estimated_time: int = 5  # 分鐘
    skill_level: str = "basic"  # basic, intermediate, advanced
    
    def __post_init__(self):
        if self.required_tools is None:
            self.required_tools = []

@dataclass
class FaultPattern:
    """故障模式"""
    pattern_id: str
    name: str
    description: str
    component: ComponentType
    severity: FaultSeverity
    symptoms: List[str]
    possible_causes: List[str]
    troubleshooting_steps: List[TroubleshootingStep]
    prevention_tips: List[str]
    replacement_parts: List[str] = None
    
    def __post_init__(self):
        if self.replacement_parts is None:
            self.replacement_parts = []

@dataclass
class DiagnosisSession:
    """診斷會話"""
    session_id: str
    user_id: str
    component: str
    symptoms: List[str]
    start_time: datetime
    status: DiagnosisStatus
    current_step: int = 0
    matched_patterns: List[str] = None
    completed_steps: List[int] = None
    findings: Dict[str, Any] = None
    resolution: Optional[str] = None
    end_time: Optional[datetime] = None
    
    def __post_init__(self):
        if self.matched_patterns is None:
            self.matched_patterns = []
        if self.completed_steps is None:
            self.completed_steps = []
        if self.findings is None:
            self.findings = {}

@dataclass
class MaintenanceRecord:
    """維護記錄"""
    record_id: str
    component: str
    issue_description: str
    diagnosis_result: str
    actions_taken: List[str]
    parts_replaced: List[str]
    cost: float
    technician: str
    date: datetime
    duration: int  # 分鐘
    effectiveness: str  # resolved, partial, unresolved

class FaultDiagnosisSystem:
    """故障診斷系統"""
    
    def __init__(self, knowledge_base_file: str = "fault_knowledge_base.json"):
        self.fault_patterns: Dict[str, FaultPattern] = {}
        self.diagnosis_sessions: Dict[str, DiagnosisSession] = {}
        self.maintenance_history: List[MaintenanceRecord] = []
        self.component_reliability: Dict[str, Dict] = {}
        
        # 載入知識庫
        self._initialize_knowledge_base()
        self._load_knowledge_base(knowledge_base_file)
        
    def _initialize_knowledge_base(self):
        """初始化故障診斷知識庫"""
        
        # 泵浦相關故障模式
        pump_patterns = [
            FaultPattern(
                pattern_id="PUMP_001",
                name="泵浦不啟動",
                description="泵浦接收到啟動命令但不能啟動運行",
                component=ComponentType.PUMP,
                severity=FaultSeverity.CRITICAL,
                symptoms=[
                    "泵浦顯示停止狀態",
                    "無電機運轉聲",
                    "流量為零",
                    "控制面板顯示警報"
                ],
                possible_causes=[
                    "電源故障",
                    "變頻器故障",
                    "控制信號中斷",
                    "機械卡死",
                    "過載保護動作"
                ],
                troubleshooting_steps=[
                    TroubleshootingStep(
                        1, "檢查電源供應", "檢查泵浦電源是否正常",
                        "使用萬用表測量電源電壓", "電壓應在額定電壓±10%範圍內",
                        "注意電氣安全，穿戴絕緣手套", ["萬用表"], 5, "basic"
                    ),
                    TroubleshootingStep(
                        2, "檢查變頻器狀態", "檢查變頻器是否有故障代碼",
                        "查看變頻器顯示面板", "無故障代碼顯示",
                        None, ["變頻器手冊"], 3, "intermediate"
                    ),
                    TroubleshootingStep(
                        3, "檢查控制信號", "檢查PLC到變頻器的控制信號",
                        "測量控制信號電壓", "4-20mA信號或0-10V信號正常",
                        None, ["萬用表", "示波器"], 10, "intermediate"
                    ),
                    TroubleshootingStep(
                        4, "檢查機械卡阻", "手動轉動泵浦軸",
                        "切斷電源後手動轉動泵軸", "泵軸能順暢轉動",
                        "警告：必須先切斷電源", ["扳手"], 10, "advanced"
                    )
                ],
                prevention_tips=[
                    "定期檢查電源電壓穩定性",
                    "保持變頻器散熱良好",
                    "定期清潔控制櫃",
                    "定期檢查軸承潤滑"
                ],
                replacement_parts=["變頻器", "接觸器", "軸承", "密封件"]
            ),
            
            FaultPattern(
                pattern_id="PUMP_002",
                name="泵浦振動過大",
                description="泵浦運行時振動超過正常範圍",
                component=ComponentType.PUMP,
                severity=FaultSeverity.WARNING,
                symptoms=[
                    "異常振動聲",
                    "基座震動",
                    "管路震動",
                    "軸承溫度升高"
                ],
                possible_causes=[
                    "軸承磨損",
                    "葉輪不平衡",
                    "管路支撐不當",
                    "流量偏離設計點",
                    "軸對中不良"
                ],
                troubleshooting_steps=[
                    TroubleshootingStep(
                        1, "測量振動", "使用振動測試儀測量振動值",
                        "在軸承位置測量徑向和軸向振動", "振動值應小於6.3mm/s",
                        None, ["振動測試儀"], 10, "intermediate"
                    ),
                    TroubleshootingStep(
                        2, "檢查基座固定", "檢查泵浦基座螺栓緊固情況",
                        "檢查並重新緊固基座螺栓", "所有螺栓應緊固到規定扭矩",
                        None, ["扭力扳手"], 15, "basic"
                    ),
                    TroubleshootingStep(
                        3, "檢查管路支撐", "檢查吸入和排出管路的支撐",
                        "確保管路有適當的支撐點", "管路無額外應力作用於泵浦",
                        None, ["支撐架"], 20, "intermediate"
                    )
                ],
                prevention_tips=[
                    "定期監測振動趨勢",
                    "保持適當的運行流量",
                    "定期檢查軸承潤滑",
                    "確保管路支撐充分"
                ],
                replacement_parts=["軸承", "密封件", "葉輪", "聯軸器"]
            ),
        ]
        
        # 溫度感測器故障模式
        temp_sensor_patterns = [
            FaultPattern(
                pattern_id="TEMP_001",
                name="溫度讀數異常",
                description="溫度感測器顯示不合理的數值",
                component=ComponentType.SENSOR,
                severity=FaultSeverity.WARNING,
                symptoms=[
                    "溫度突然跳變",
                    "溫度讀數超出合理範圍",
                    "溫度不隨實際情況變化",
                    "顯示錯誤代碼"
                ],
                possible_causes=[
                    "感測器損壞",
                    "接線鬆動",
                    "信號干擾",
                    "標定錯誤",
                    "電源故障"
                ],
                troubleshooting_steps=[
                    TroubleshootingStep(
                        1, "檢查接線", "檢查感測器接線是否牢固",
                        "檢查並重新緊固接線端子", "接線牢固無鬆動",
                        None, ["螺絲刀"], 5, "basic"
                    ),
                    TroubleshootingStep(
                        2, "測量電阻", "測量PT100感測器電阻值",
                        "在0°C時測量應為100Ω", "電阻值在規格範圍內",
                        None, ["萬用表"], 10, "intermediate"
                    ),
                    TroubleshootingStep(
                        3, "檢查標定", "對照標準溫度計檢查讀數",
                        "比較標準溫度計與感測器讀數", "誤差在±0.5°C內",
                        None, ["標準溫度計"], 15, "intermediate"
                    )
                ],
                prevention_tips=[
                    "定期校驗感測器精度",
                    "保護好感測器接線",
                    "避免機械衝擊",
                    "防止水氣進入"
                ],
                replacement_parts=["PT100感測器", "傳輸器", "接線端子", "保護套管"]
            ),
        ]
        
        # 閥門故障模式
        valve_patterns = [
            FaultPattern(
                pattern_id="VALVE_001",
                name="閥門動作異常",
                description="閥門不能正常開啟或關閉",
                component=ComponentType.VALVE,
                severity=FaultSeverity.CRITICAL,
                symptoms=[
                    "閥門不動作",
                    "動作緩慢",
                    "位置回饋不準確",
                    "異常噪音"
                ],
                possible_causes=[
                    "執行器故障",
                    "閥芯卡死",
                    "氣源壓力不足",
                    "位置感測器故障",
                    "控制信號異常"
                ],
                troubleshooting_steps=[
                    TroubleshootingStep(
                        1, "檢查氣源壓力", "檢查執行器氣源壓力",
                        "測量氣源壓力", "壓力應在0.4-0.7MPa範圍內",
                        None, ["壓力表"], 5, "basic"
                    ),
                    TroubleshootingStep(
                        2, "檢查控制信號", "檢查PLC輸出的控制信號",
                        "測量4-20mA控制信號", "信號在正常範圍內",
                        None, ["萬用表"], 10, "intermediate"
                    ),
                    TroubleshootingStep(
                        3, "手動操作測試", "切換到手動模式測試閥門",
                        "使用手動操作器控制閥門", "閥門能正常開關",
                        "注意系統壓力", ["手動操作器"], 10, "intermediate"
                    )
                ],
                prevention_tips=[
                    "定期檢查氣源質量",
                    "保持執行器清潔",
                    "定期校驗位置回饋",
                    "避免超壓操作"
                ],
                replacement_parts=["執行器", "閥芯", "密封件", "位置感測器"]
            ),
        ]
        
        # 整合所有故障模式
        all_patterns = pump_patterns + temp_sensor_patterns + valve_patterns
        
        for pattern in all_patterns:
            self.fault_patterns[pattern.pattern_id] = pattern
            
        logger.info(f"Initialized {len(self.fault_patterns)} fault patterns")
        
    def _load_knowledge_base(self, knowledge_base_file: str):
        """載入知識庫檔案"""
        try:
            with open(knowledge_base_file, 'r', encoding='utf-8') as f:
                knowledge_data = json.load(f)
                
            # 載入額外的故障模式
            if 'fault_patterns' in knowledge_data:
                for pattern_data in knowledge_data['fault_patterns']:
                    pattern = FaultPattern(**pattern_data)
                    self.fault_patterns[pattern.pattern_id] = pattern
                    
            logger.info(f"Loaded knowledge base from {knowledge_base_file}")
            
        except FileNotFoundError:
            logger.info("Knowledge base file not found, using built-in patterns only")
        except Exception as e:
            logger.error(f"Error loading knowledge base: {e}")
            
    def start_diagnosis(self, user_id: str, component: str, symptoms: List[str]) -> str:
        """開始故障診斷"""
        import secrets
        session_id = secrets.token_hex(16)
        
        session = DiagnosisSession(
            session_id=session_id,
            user_id=user_id,
            component=component,
            symptoms=symptoms,
            start_time=datetime.now(),
            status=DiagnosisStatus.PENDING
        )
        
        # 匹配故障模式
        matched_patterns = self._match_fault_patterns(symptoms, component)
        session.matched_patterns = [p.pattern_id for p in matched_patterns]
        session.status = DiagnosisStatus.IN_PROGRESS
        
        self.diagnosis_sessions[session_id] = session
        
        logger.info(f"Started diagnosis session {session_id} for component {component}")
        return session_id
        
    def _match_fault_patterns(self, symptoms: List[str], component: str = None) -> List[FaultPattern]:
        """匹配故障模式"""
        matched_patterns = []
        
        for pattern in self.fault_patterns.values():
            # 如果指定了組件，優先匹配該組件的故障
            if component and pattern.component.value != component:
                continue
                
            # 計算症狀匹配度
            match_score = 0
            for symptom in symptoms:
                for pattern_symptom in pattern.symptoms:
                    if self._fuzzy_match(symptom.lower(), pattern_symptom.lower()):
                        match_score += 1
                        break
            
            # 如果匹配度大於0，加入候選列表
            if match_score > 0:
                matched_patterns.append((pattern, match_score))
        
        # 按匹配度排序
        matched_patterns.sort(key=lambda x: x[1], reverse=True)
        
        return [pattern for pattern, score in matched_patterns[:5]]  # 返回前5個匹配的模式
        
    def _fuzzy_match(self, text1: str, text2: str, threshold: float = 0.6) -> bool:
        """模糊匹配兩個文字字串"""
        # 簡單的模糊匹配實現
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 or not words2:
            return False
            
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        similarity = len(intersection) / len(union)
        return similarity >= threshold
        
    def get_diagnosis_result(self, session_id: str) -> Optional[Dict[str, Any]]:
        """取得診斷結果"""
        session = self.diagnosis_sessions.get(session_id)
        if not session:
            return None
            
        result = {
            "session_id": session_id,
            "component": session.component,
            "symptoms": session.symptoms,
            "status": session.status.value,
            "start_time": session.start_time.isoformat(),
            "matched_patterns": []
        }
        
        # 添加匹配的故障模式資訊
        for pattern_id in session.matched_patterns:
            pattern = self.fault_patterns.get(pattern_id)
            if pattern:
                result["matched_patterns"].append({
                    "pattern_id": pattern.pattern_id,
                    "name": pattern.name,
                    "description": pattern.description,
                    "severity": pattern.severity.value,
                    "possible_causes": pattern.possible_causes,
                    "troubleshooting_steps": [
                        {
                            "step_number": step.step_number,
                            "title": step.title,
                            "description": step.description,
                            "action": step.action,
                            "expected_result": step.expected_result,
                            "safety_warning": step.safety_warning,
                            "required_tools": step.required_tools,
                            "estimated_time": step.estimated_time,
                            "skill_level": step.skill_level
                        }
                        for step in pattern.troubleshooting_steps
                    ],
                    "prevention_tips": pattern.prevention_tips,
                    "replacement_parts": pattern.replacement_parts
                })
        
        return result
        
    def get_troubleshooting_steps(self, session_id: str, pattern_id: str) -> Optional[List[Dict]]:
        """取得特定故障模式的排除步驟"""
        session = self.diagnosis_sessions.get(session_id)
        if not session:
            return None
            
        pattern = self.fault_patterns.get(pattern_id)
        if not pattern:
            return None
            
        steps = []
        for step in pattern.troubleshooting_steps:
            step_info = {
                "step_number": step.step_number,
                "title": step.title,
                "description": step.description,
                "action": step.action,
                "expected_result": step.expected_result,
                "safety_warning": step.safety_warning,
                "required_tools": step.required_tools,
                "estimated_time": step.estimated_time,
                "skill_level": step.skill_level,
                "completed": step.step_number in session.completed_steps
            }
            steps.append(step_info)
            
        return steps
        
    def complete_step(self, session_id: str, step_number: int, result: str, notes: str = "") -> bool:
        """標記排除步驟為完成"""
        session = self.diagnosis_sessions.get(session_id)
        if not session:
            return False
            
        if step_number not in session.completed_steps:
            session.completed_steps.append(step_number)
            
        # 記錄步驟結果
        session.findings[f"step_{step_number}"] = {
            "result": result,
            "notes": notes,
            "completed_at": datetime.now().isoformat()
        }
        
        return True
        
    def complete_diagnosis(self, session_id: str, resolution: str) -> bool:
        """完成診斷"""
        session = self.diagnosis_sessions.get(session_id)
        if not session:
            return False
            
        session.status = DiagnosisStatus.COMPLETED
        session.resolution = resolution
        session.end_time = datetime.now()
        
        # 更新組件可靠性統計
        self._update_reliability_stats(session.component, resolution)
        
        logger.info(f"Completed diagnosis session {session_id} with resolution: {resolution}")
        return True
        
    def _update_reliability_stats(self, component: str, resolution: str):
        """更新組件可靠性統計"""
        if component not in self.component_reliability:
            self.component_reliability[component] = {
                "total_issues": 0,
                "resolved_issues": 0,
                "common_problems": {},
                "mtbf_hours": 0  # Mean Time Between Failures
            }
            
        stats = self.component_reliability[component]
        stats["total_issues"] += 1
        
        if "resolved" in resolution.lower():
            stats["resolved_issues"] += 1
            
        # 更新常見問題統計
        if resolution not in stats["common_problems"]:
            stats["common_problems"][resolution] = 0
        stats["common_problems"][resolution] += 1
        
    def get_maintenance_recommendations(self, component: str) -> List[Dict[str, Any]]:
        """取得維護建議"""
        recommendations = []
        
        # 基於故障模式的預防性維護建議
        component_patterns = [
            pattern for pattern in self.fault_patterns.values()
            if pattern.component.value == component
        ]
        
        for pattern in component_patterns:
            recommendation = {
                "component": component,
                "pattern_name": pattern.name,
                "prevention_tips": pattern.prevention_tips,
                "replacement_parts": pattern.replacement_parts,
                "severity": pattern.severity.value,
                "recommended_interval": self._get_maintenance_interval(pattern.severity)
            }
            recommendations.append(recommendation)
            
        return recommendations
        
    def _get_maintenance_interval(self, severity: FaultSeverity) -> str:
        """根據嚴重程度取得維護間隔建議"""
        intervals = {
            FaultSeverity.EMERGENCY: "立即",
            FaultSeverity.CRITICAL: "每週",
            FaultSeverity.WARNING: "每月",
            FaultSeverity.INFO: "每季"
        }
        return intervals.get(severity, "每月")
        
    def export_diagnosis_report(self, session_id: str) -> Optional[Dict[str, Any]]:
        """匯出診斷報告"""
        session = self.diagnosis_sessions.get(session_id)
        if not session:
            return None
            
        report = {
            "report_id": f"DIAG_{session_id[:8]}",
            "generated_at": datetime.now().isoformat(),
            "session_info": {
                "session_id": session_id,
                "user_id": session.user_id,
                "component": session.component,
                "symptoms": session.symptoms,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "status": session.status.value,
                "resolution": session.resolution
            },
            "diagnosis_results": [],
            "completed_steps": [],
            "recommendations": []
        }
        
        # 添加診斷結果
        for pattern_id in session.matched_patterns:
            pattern = self.fault_patterns.get(pattern_id)
            if pattern:
                report["diagnosis_results"].append({
                    "pattern_id": pattern.pattern_id,
                    "name": pattern.name,
                    "description": pattern.description,
                    "severity": pattern.severity.value,
                    "possible_causes": pattern.possible_causes
                })
        
        # 添加完成的步驟
        for step_num in session.completed_steps:
            if f"step_{step_num}" in session.findings:
                report["completed_steps"].append({
                    "step_number": step_num,
                    "findings": session.findings[f"step_{step_num}"]
                })
        
        # 添加維護建議
        report["recommendations"] = self.get_maintenance_recommendations(session.component)
        
        return report
        
    def get_system_statistics(self) -> Dict[str, Any]:
        """取得系統統計資訊"""
        total_sessions = len(self.diagnosis_sessions)
        completed_sessions = len([s for s in self.diagnosis_sessions.values() 
                                if s.status == DiagnosisStatus.COMPLETED])
        
        # 組件故障統計
        component_stats = {}
        for session in self.diagnosis_sessions.values():
            component = session.component
            if component not in component_stats:
                component_stats[component] = 0
            component_stats[component] += 1
        
        # 最常見的故障模式
        pattern_usage = {}
        for session in self.diagnosis_sessions.values():
            for pattern_id in session.matched_patterns:
                if pattern_id not in pattern_usage:
                    pattern_usage[pattern_id] = 0
                pattern_usage[pattern_id] += 1
        
        most_common_patterns = sorted(pattern_usage.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "completion_rate": completed_sessions / total_sessions if total_sessions > 0 else 0,
            "component_statistics": component_stats,
            "most_common_patterns": [
                {
                    "pattern_id": pattern_id,
                    "name": self.fault_patterns[pattern_id].name if pattern_id in self.fault_patterns else "Unknown",
                    "usage_count": count
                }
                for pattern_id, count in most_common_patterns
            ],
            "reliability_statistics": self.component_reliability
        }

# 全域故障診斷系統實例
_diagnosis_system = None

def get_diagnosis_system() -> FaultDiagnosisSystem:
    """取得全域故障診斷系統實例"""
    global _diagnosis_system
    if _diagnosis_system is None:
        _diagnosis_system = FaultDiagnosisSystem()
    return _diagnosis_system

# 示例使用
if __name__ == "__main__":
    # 建立故障診斷系統
    diagnosis_system = FaultDiagnosisSystem()
    
    # 開始診斷
    symptoms = ["泵浦顯示停止狀態", "無電機運轉聲", "流量為零"]
    session_id = diagnosis_system.start_diagnosis("technician1", "pump", symptoms)
    print(f"Started diagnosis session: {session_id}")
    
    # 取得診斷結果
    result = diagnosis_system.get_diagnosis_result(session_id)
    if result:
        print("Diagnosis Result:")
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    
    # 取得排除步驟
    if result and result["matched_patterns"]:
        pattern_id = result["matched_patterns"][0]["pattern_id"]
        steps = diagnosis_system.get_troubleshooting_steps(session_id, pattern_id)
        print(f"\nTroubleshooting steps for {pattern_id}:")
        for step in steps:
            print(f"Step {step['step_number']}: {step['title']}")
    
    # 完成步驟
    diagnosis_system.complete_step(session_id, 1, "電源電壓正常", "測量結果：220V")
    
    # 完成診斷
    diagnosis_system.complete_diagnosis(session_id, "電源故障已解決")
    
    # 匯出報告
    report = diagnosis_system.export_diagnosis_report(session_id)
    if report:
        print("\nDiagnosis Report:")
        print(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    
    # 取得系統統計
    stats = diagnosis_system.get_system_statistics()
    print("\nSystem Statistics:")
    print(json.dumps(stats, indent=2, ensure_ascii=False, default=str))