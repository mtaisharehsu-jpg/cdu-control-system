import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
import threading
import time
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os

logger = logging.getLogger(__name__)

@dataclass
class MetricsData:
    """指標資料結構"""
    timestamp: datetime
    node_id: str
    load_kw: float
    capacity_kw: float
    temperature: float
    pressure: float
    pump_rpm: List[float]
    power_consumption: float
    efficiency: float
    vibration: float = 0.0
    flow_rate: float = 0.0
    
    def to_features(self) -> List[float]:
        """轉換為機器學習特徵"""
        hour = self.timestamp.hour
        day_of_week = self.timestamp.weekday()
        load_ratio = self.load_kw / self.capacity_kw if self.capacity_kw > 0 else 0
        avg_pump_rpm = sum(self.pump_rpm) / len(self.pump_rpm) if self.pump_rpm else 0
        
        return [
            hour, day_of_week, load_ratio, self.temperature, self.pressure,
            avg_pump_rpm, self.power_consumption, self.efficiency,
            self.vibration, self.flow_rate
        ]

class LoadPredictor:
    """負載預測器"""
    
    def __init__(self, model_path: str = "./models/load_predictor.pkl"):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.model_path = model_path
        self.is_trained = False
        self.feature_history = []
        self.target_history = []
        self.min_samples = 100  # 最小訓練樣本數
        
        # 嘗試載入已訓練的模型
        self._load_model()
        
    def _load_model(self):
        """載入已訓練的模型"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.is_trained = True
                logger.info("Load prediction model loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load model: {e}")
            
    def _save_model(self):
        """儲存訓練好的模型"""
        try:
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_data = {
                'model': self.model,
                'scaler': self.scaler
            }
            joblib.save(model_data, self.model_path)
            logger.info("Load prediction model saved")
        except Exception as e:
            logger.error(f"Could not save model: {e}")
            
    def add_sample(self, metrics: MetricsData):
        """新增訓練樣本"""
        features = metrics.to_features()
        target = metrics.load_kw
        
        self.feature_history.append(features)
        self.target_history.append(target)
        
        # 保持歷史資料在合理範圍內
        if len(self.feature_history) > 10000:
            self.feature_history = self.feature_history[-5000:]
            self.target_history = self.target_history[-5000:]
            
    def train(self):
        """訓練模型"""
        if len(self.feature_history) < self.min_samples:
            logger.warning(f"Insufficient samples for training: {len(self.feature_history)}/{self.min_samples}")
            return False
            
        try:
            X = np.array(self.feature_history)
            y = np.array(self.target_history)
            
            # 標準化特徵
            X_scaled = self.scaler.fit_transform(X)
            
            # 訓練模型
            self.model.fit(X_scaled, y)
            self.is_trained = True
            
            # 儲存模型
            self._save_model()
            
            logger.info(f"Load prediction model trained with {len(X)} samples")
            return True
            
        except Exception as e:
            logger.error(f"Error training load prediction model: {e}")
            return False
            
    def predict(self, timestamp: datetime, current_metrics: MetricsData, 
                horizon_minutes: int = 30) -> List[float]:
        """預測未來負載"""
        if not self.is_trained:
            return [current_metrics.load_kw] * (horizon_minutes // 5)  # 默認每5分鐘一個預測點
            
        try:
            predictions = []
            
            # 生成未來時間點的預測
            for i in range(0, horizon_minutes, 5):  # 每5分鐘預測一次
                future_time = timestamp + timedelta(minutes=i)
                
                # 構建特徵
                hour = future_time.hour
                day_of_week = future_time.weekday()
                load_ratio = current_metrics.load_kw / current_metrics.capacity_kw
                avg_pump_rpm = sum(current_metrics.pump_rpm) / len(current_metrics.pump_rpm) if current_metrics.pump_rpm else 0
                
                features = np.array([[
                    hour, day_of_week, load_ratio, current_metrics.temperature,
                    current_metrics.pressure, avg_pump_rpm, current_metrics.power_consumption,
                    current_metrics.efficiency, current_metrics.vibration, current_metrics.flow_rate
                ]])
                
                # 標準化並預測
                features_scaled = self.scaler.transform(features)
                prediction = self.model.predict(features_scaled)[0]
                predictions.append(max(0, prediction))  # 確保預測值非負
                
            return predictions
            
        except Exception as e:
            logger.error(f"Error predicting load: {e}")
            return [current_metrics.load_kw] * (horizon_minutes // 5)

class EfficiencyOptimizer:
    """效率優化器"""
    
    def __init__(self):
        self.efficiency_history = []
        self.optimal_points = {}  # 儲存不同負載下的最佳運行點
        
    def add_efficiency_sample(self, load_ratio: float, pump_speed: float, 
                             temperature: float, efficiency: float):
        """新增效率樣本"""
        self.efficiency_history.append({
            'load_ratio': load_ratio,
            'pump_speed': pump_speed,
            'temperature': temperature,
            'efficiency': efficiency,
            'timestamp': datetime.now()
        })
        
        # 保持歷史資料在合理範圍內
        if len(self.efficiency_history) > 5000:
            self.efficiency_history = self.efficiency_history[-2500:]
            
    def find_optimal_settings(self, target_load_ratio: float, 
                             current_temperature: float) -> Dict[str, float]:
        """尋找最佳運行設定"""
        if len(self.efficiency_history) < 50:
            # 使用預設設定
            return self._get_default_settings(target_load_ratio)
            
        try:
            # 篩選相似負載條件的歷史資料
            similar_conditions = []
            for record in self.efficiency_history:
                load_diff = abs(record['load_ratio'] - target_load_ratio)
                temp_diff = abs(record['temperature'] - current_temperature)
                
                if load_diff < 0.1 and temp_diff < 5.0:  # 負載差異<10%, 溫度差異<5°C
                    similar_conditions.append(record)
                    
            if not similar_conditions:
                return self._get_default_settings(target_load_ratio)
                
            # 找出效率最高的設定
            best_record = max(similar_conditions, key=lambda x: x['efficiency'])
            
            return {
                'pump_speed_ratio': best_record['pump_speed'],
                'cooling_mode': self._determine_cooling_mode(target_load_ratio),
                'target_temperature': current_temperature - 2 if current_temperature > 25 else current_temperature,
                'predicted_efficiency': best_record['efficiency']
            }
            
        except Exception as e:
            logger.error(f"Error finding optimal settings: {e}")
            return self._get_default_settings(target_load_ratio)
            
    def _get_default_settings(self, load_ratio: float) -> Dict[str, float]:
        """獲取預設設定"""
        if load_ratio < 0.3:
            return {
                'pump_speed_ratio': 0.6,
                'cooling_mode': 'eco',
                'target_temperature': 22.0,
                'predicted_efficiency': 0.85
            }
        elif load_ratio > 0.8:
            return {
                'pump_speed_ratio': 1.0,
                'cooling_mode': 'performance',
                'target_temperature': 20.0,
                'predicted_efficiency': 0.92
            }
        else:
            return {
                'pump_speed_ratio': 0.7 + load_ratio * 0.3,
                'cooling_mode': 'balanced',
                'target_temperature': 21.0,
                'predicted_efficiency': 0.88
            }
            
    def _determine_cooling_mode(self, load_ratio: float) -> str:
        """決定冷卻模式"""
        if load_ratio < 0.3:
            return 'eco'
        elif load_ratio > 0.8:
            return 'performance'
        else:
            return 'balanced'

class FaultPredictor:
    """故障預測器"""
    
    def __init__(self, model_path: str = "./models/fault_predictor.pkl"):
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.model_path = model_path
        self.is_trained = False
        self.feature_history = []
        self.fault_history = []
        self.min_samples = 200
        
        # 載入已訓練的模型
        self._load_model()
        
    def _load_model(self):
        """載入已訓練的模型"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.anomaly_detector = model_data['model']
                self.scaler = model_data['scaler']
                self.is_trained = True
                logger.info("Fault prediction model loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load fault model: {e}")
            
    def _save_model(self):
        """儲存訓練好的模型"""
        try:
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_data = {
                'model': self.anomaly_detector,
                'scaler': self.scaler
            }
            joblib.save(model_data, self.model_path)
            logger.info("Fault prediction model saved")
        except Exception as e:
            logger.error(f"Could not save fault model: {e}")
            
    def add_sample(self, metrics: MetricsData, fault_occurred: bool = False):
        """新增訓練樣本"""
        features = self._extract_fault_features(metrics)
        
        self.feature_history.append(features)
        self.fault_history.append(fault_occurred)
        
        # 保持歷史資料在合理範圍內
        if len(self.feature_history) > 5000:
            self.feature_history = self.feature_history[-2500:]
            self.fault_history = self.fault_history[-2500:]
            
    def _extract_fault_features(self, metrics: MetricsData) -> List[float]:
        """提取故障預測特徵"""
        load_ratio = metrics.load_kw / metrics.capacity_kw if metrics.capacity_kw > 0 else 0
        avg_pump_rpm = sum(metrics.pump_rpm) / len(metrics.pump_rpm) if metrics.pump_rpm else 0
        pump_rpm_variance = np.var(metrics.pump_rpm) if len(metrics.pump_rpm) > 1 else 0
        
        return [
            load_ratio,
            metrics.temperature,
            metrics.pressure,
            avg_pump_rpm,
            pump_rpm_variance,
            metrics.power_consumption,
            metrics.efficiency,
            metrics.vibration,
            metrics.flow_rate
        ]
        
    def train(self):
        """訓練異常檢測模型"""
        if len(self.feature_history) < self.min_samples:
            logger.warning(f"Insufficient samples for fault training: {len(self.feature_history)}/{self.min_samples}")
            return False
            
        try:
            X = np.array(self.feature_history)
            
            # 只使用正常樣本訓練異常檢測器
            normal_samples = []
            for i, is_fault in enumerate(self.fault_history):
                if not is_fault:
                    normal_samples.append(X[i])
                    
            if len(normal_samples) < self.min_samples // 2:
                logger.warning("Insufficient normal samples for training")
                return False
                
            X_normal = np.array(normal_samples)
            
            # 標準化特徵
            X_scaled = self.scaler.fit_transform(X_normal)
            
            # 訓練異常檢測器
            self.anomaly_detector.fit(X_scaled)
            self.is_trained = True
            
            # 儲存模型
            self._save_model()
            
            logger.info(f"Fault prediction model trained with {len(X_normal)} normal samples")
            return True
            
        except Exception as e:
            logger.error(f"Error training fault prediction model: {e}")
            return False
            
    def predict_fault_risk(self, metrics: MetricsData) -> Dict[str, float]:
        """預測故障風險"""
        try:
            # 基本規則檢查
            risk_factors = self._rule_based_risk_assessment(metrics)
            
            # 機器學習檢查 (如果模型已訓練)
            if self.is_trained:
                ml_risk = self._ml_based_risk_assessment(metrics)
                risk_factors['anomaly_score'] = ml_risk
                risk_factors['overall_risk'] = min(
                    (risk_factors['temperature_risk'] + 
                     risk_factors['pressure_risk'] + 
                     risk_factors['vibration_risk'] + 
                     ml_risk) / 4, 1.0
                )
            else:
                risk_factors['overall_risk'] = min(
                    (risk_factors['temperature_risk'] + 
                     risk_factors['pressure_risk'] + 
                     risk_factors['vibration_risk']) / 3, 1.0
                )
                
            return risk_factors
            
        except Exception as e:
            logger.error(f"Error predicting fault risk: {e}")
            return {'overall_risk': 0.0}
            
    def _rule_based_risk_assessment(self, metrics: MetricsData) -> Dict[str, float]:
        """基於規則的風險評估"""
        risk_factors = {}
        
        # 溫度風險
        if metrics.temperature > 65:
            risk_factors['temperature_risk'] = min((metrics.temperature - 65) / 20, 1.0)
        else:
            risk_factors['temperature_risk'] = 0.0
            
        # 壓力風險  
        if metrics.pressure > 8.0:
            risk_factors['pressure_risk'] = min((metrics.pressure - 8.0) / 2.0, 1.0)
        elif metrics.pressure < 2.0:
            risk_factors['pressure_risk'] = min((2.0 - metrics.pressure) / 2.0, 1.0)
        else:
            risk_factors['pressure_risk'] = 0.0
            
        # 振動風險
        if metrics.vibration > 5.0:
            risk_factors['vibration_risk'] = min((metrics.vibration - 5.0) / 10.0, 1.0)
        else:
            risk_factors['vibration_risk'] = 0.0
            
        # 效率風險
        if metrics.efficiency < 0.7:
            risk_factors['efficiency_risk'] = min((0.7 - metrics.efficiency) / 0.3, 1.0)
        else:
            risk_factors['efficiency_risk'] = 0.0
            
        return risk_factors
        
    def _ml_based_risk_assessment(self, metrics: MetricsData) -> float:
        """基於機器學習的風險評估"""
        try:
            features = np.array([self._extract_fault_features(metrics)])
            features_scaled = self.scaler.transform(features)
            
            # 異常分數 (-1為正常, 1為異常)
            anomaly_score = self.anomaly_detector.decision_function(features_scaled)[0]
            
            # 轉換為0-1的風險分數
            risk_score = max(0, (0.5 - anomaly_score) / 1.0)
            return min(risk_score, 1.0)
            
        except Exception as e:
            logger.error(f"Error in ML risk assessment: {e}")
            return 0.0

class AIOptimizer:
    """AI驅動的綜合優化器"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.load_predictor = LoadPredictor()
        self.efficiency_optimizer = EfficiencyOptimizer()
        self.fault_predictor = FaultPredictor()
        
        # 歷史資料
        self.metrics_history = []
        self.optimization_history = []
        
        # 訓練參數
        self.training_interval = 3600  # 每小時訓練一次
        self.last_training = datetime.now()
        
        # 啟動定期訓練執行緒
        if config['enable_load_prediction'] or config['enable_fault_prediction']:
            threading.Thread(target=self._training_loop, daemon=True).start()
            
    def add_metrics(self, node_id: str, metrics_data: Dict[str, Any]):
        """新增指標資料"""
        try:
            metrics = MetricsData(
                timestamp=datetime.now(),
                node_id=node_id,
                load_kw=metrics_data.get('load_kw', 0.0),
                capacity_kw=metrics_data.get('capacity_kw', 50.0),
                temperature=metrics_data.get('temperature', 25.0),
                pressure=metrics_data.get('pressure', 5.0),
                pump_rpm=metrics_data.get('pump_rpm', [0.0]),
                power_consumption=metrics_data.get('power_consumption', 0.0),
                efficiency=metrics_data.get('efficiency', 0.85),
                vibration=metrics_data.get('vibration', 0.0),
                flow_rate=metrics_data.get('flow_rate', 0.0)
            )
            
            self.metrics_history.append(metrics)
            
            # 新增到各個模組
            self.load_predictor.add_sample(metrics)
            
            load_ratio = metrics.load_kw / metrics.capacity_kw if metrics.capacity_kw > 0 else 0
            avg_pump_rpm = sum(metrics.pump_rpm) / len(metrics.pump_rpm) if metrics.pump_rpm else 0
            self.efficiency_optimizer.add_efficiency_sample(
                load_ratio, avg_pump_rpm / 1500.0, metrics.temperature, metrics.efficiency
            )
            
            fault_occurred = metrics_data.get('fault_occurred', False)
            self.fault_predictor.add_sample(metrics, fault_occurred)
            
            # 保持歷史資料在合理範圍內
            if len(self.metrics_history) > 10000:
                self.metrics_history = self.metrics_history[-5000:]
                
        except Exception as e:
            logger.error(f"Error adding metrics: {e}")
            
    def predict_load(self, node_id: str, horizon_minutes: int = 30) -> List[float]:
        """預測未來負載"""
        if not self.config['enable_load_prediction']:
            return []
            
        # 找到該節點的最新指標
        current_metrics = None
        for metrics in reversed(self.metrics_history):
            if metrics.node_id == node_id:
                current_metrics = metrics
                break
                
        if not current_metrics:
            return []
            
        return self.load_predictor.predict(
            datetime.now(), current_metrics, horizon_minutes
        )
        
    def optimize_efficiency(self, node_id: str, target_load_kw: float, 
                          current_temperature: float) -> Dict[str, Any]:
        """優化運行效率"""
        if not self.config['enable_efficiency_optimization']:
            return {}
            
        # 計算目標負載率
        capacity_kw = 50.0  # 假設容量
        for metrics in reversed(self.metrics_history):
            if metrics.node_id == node_id:
                capacity_kw = metrics.capacity_kw
                break
                
        target_load_ratio = target_load_kw / capacity_kw if capacity_kw > 0 else 0
        
        return self.efficiency_optimizer.find_optimal_settings(
            target_load_ratio, current_temperature
        )
        
    def predict_failures(self, node_id: str) -> Dict[str, float]:
        """預測故障風險"""
        if not self.config['enable_fault_prediction']:
            return {}
            
        # 找到該節點的最新指標
        current_metrics = None
        for metrics in reversed(self.metrics_history):
            if metrics.node_id == node_id:
                current_metrics = metrics
                break
                
        if not current_metrics:
            return {}
            
        return self.fault_predictor.predict_fault_risk(current_metrics)
        
    def get_optimization_recommendations(self, nodes: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """獲取優化建議"""
        recommendations = {}
        
        for node_id, node_info in nodes.items():
            try:
                current_temp = node_info.get('temperature', 25.0)
                current_load = node_info.get('current_load_kw', 0.0)
                
                # 效率優化建議
                efficiency_rec = self.optimize_efficiency(node_id, current_load, current_temp)
                
                # 故障風險評估
                fault_risk = self.predict_failures(node_id)
                
                # 負載預測
                load_prediction = self.predict_load(node_id)
                
                recommendations[node_id] = {
                    'efficiency_optimization': efficiency_rec,
                    'fault_risk_assessment': fault_risk,
                    'load_prediction': load_prediction,
                    'recommended_actions': self._generate_actions(efficiency_rec, fault_risk)
                }
                
            except Exception as e:
                logger.error(f"Error generating recommendations for {node_id}: {e}")
                recommendations[node_id] = {'error': str(e)}
                
        return recommendations
        
    def _generate_actions(self, efficiency_rec: Dict[str, Any], 
                         fault_risk: Dict[str, float]) -> List[str]:
        """生成建議操作"""
        actions = []
        
        # 基於效率建議
        if efficiency_rec.get('cooling_mode') == 'eco':
            actions.append("Switch to eco cooling mode for energy savings")
        elif efficiency_rec.get('cooling_mode') == 'performance':
            actions.append("Switch to performance mode for maximum cooling")
            
        # 基於故障風險
        overall_risk = fault_risk.get('overall_risk', 0.0)
        if overall_risk > 0.7:
            actions.append("CRITICAL: Schedule immediate maintenance check")
        elif overall_risk > 0.5:
            actions.append("WARNING: Schedule preventive maintenance")
        elif overall_risk > 0.3:
            actions.append("INFO: Monitor system closely")
            
        if fault_risk.get('temperature_risk', 0.0) > 0.5:
            actions.append("Reduce load or improve cooling - high temperature risk")
            
        if fault_risk.get('pressure_risk', 0.0) > 0.5:
            actions.append("Check pump and piping system - pressure anomaly detected")
            
        return actions
        
    def _training_loop(self):
        """定期訓練模型"""
        while True:
            try:
                time.sleep(600)  # 每10分鐘檢查一次
                
                if (datetime.now() - self.last_training).total_seconds() > self.training_interval:
                    logger.info("Starting AI model training...")
                    
                    if self.config['enable_load_prediction']:
                        self.load_predictor.train()
                        
                    if self.config['enable_fault_prediction']:
                        self.fault_predictor.train()
                        
                    self.last_training = datetime.now()
                    logger.info("AI model training completed")
                    
            except Exception as e:
                logger.error(f"Error in training loop: {e}")
                time.sleep(300)  # 錯誤後等待5分鐘再重試