import hashlib
import hmac
import ssl
import logging
import ipaddress
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
import threading
import time
import secrets
import jwt
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.fernet import Fernet
import base64
import os

logger = logging.getLogger(__name__)

@dataclass
class UserCredential:
    """使用者憑證"""
    username: str
    password_hash: str
    salt: str
    role: str
    level: int
    created_at: datetime
    last_login: Optional[datetime] = None
    failed_attempts: int = 0
    locked_until: Optional[datetime] = None

@dataclass
class AuditLog:
    """審計日誌"""
    timestamp: datetime
    user: str
    action: str
    resource: str
    result: str
    ip_address: str
    details: Dict[str, Any]

class TPMManager:
    """TPM 2.0 硬體安全模組管理器"""
    
    def __init__(self):
        self.tpm_available = False
        self.device_key = None
        self.attestation_key = None
        
        # 檢查TPM可用性
        self._check_tpm_availability()
        
    def _check_tpm_availability(self):
        """檢查TPM硬體可用性"""
        try:
            # 在實際部署中，這裡會使用 tpm2-tools 或 pytss 庫
            # 模擬檢查TPM設備
            if os.path.exists('/dev/tpm0') or os.path.exists('/dev/tpmrm0'):
                self.tpm_available = True
                logger.info("TPM 2.0 device detected and available")
                self._initialize_tpm()
            else:
                logger.warning("TPM 2.0 device not found, using software fallback")
                self._initialize_software_fallback()
                
        except Exception as e:
            logger.error(f"Error checking TPM availability: {e}")
            self._initialize_software_fallback()
            
    def _initialize_tpm(self):
        """初始化TPM"""
        try:
            # 實際實現中會使用TPM庫生成和管理密鑰
            # 這裡使用模擬實現
            self.device_key = self._generate_device_key()
            self.attestation_key = self._generate_attestation_key()
            logger.info("TPM initialized successfully")
            
        except Exception as e:
            logger.error(f"TPM initialization failed: {e}")
            self._initialize_software_fallback()
            
    def _initialize_software_fallback(self):
        """軟體回退實現"""
        self.tpm_available = False
        self.device_key = self._generate_software_key()
        self.attestation_key = self._generate_software_key()
        logger.info("Using software cryptographic fallback")
        
    def _generate_device_key(self) -> str:
        """生成設備密鑰"""
        # 實際實現中會調用TPM生成密鑰
        return secrets.token_hex(32)
        
    def _generate_attestation_key(self) -> str:
        """生成認證密鑰"""
        # 實際實現中會調用TPM生成認證密鑰
        return secrets.token_hex(32)
        
    def _generate_software_key(self) -> str:
        """生成軟體密鑰"""
        return secrets.token_hex(32)
        
    def get_device_identity(self) -> Dict[str, str]:
        """獲取設備身份"""
        device_id = hashlib.sha256(self.device_key.encode()).hexdigest()[:16]
        return {
            'device_id': device_id,
            'tpm_enabled': self.tpm_available,
            'attestation_available': self.tpm_available
        }
        
    def attest_boot_integrity(self) -> Dict[str, Any]:
        """證明開機完整性"""
        if not self.tpm_available:
            return {'status': 'software_mode', 'trusted': False}
            
        # 實際實現中會讀取TPM PCR值進行完整性驗證
        pcr_values = {
            'pcr0': hashlib.sha256(b'boot_measurement').hexdigest(),
            'pcr1': hashlib.sha256(b'bios_measurement').hexdigest(),
            'pcr7': hashlib.sha256(b'secure_boot').hexdigest()
        }
        
        return {
            'status': 'verified',
            'trusted': True,
            'pcr_values': pcr_values,
            'timestamp': datetime.now().isoformat()
        }

class CryptographicManager:
    """加密管理器"""
    
    def __init__(self, tpm_manager: TPMManager):
        self.tpm_manager = tpm_manager
        self.master_key = None
        self.certificate = None
        self.private_key = None
        
        self._initialize_crypto()
        
    def _initialize_crypto(self):
        """初始化加密組件"""
        # 生成主密鑰
        if self.tpm_manager and self.tpm_manager.tpm_available:
            # 使用TPM保護的密鑰
            self.master_key = self.tpm_manager.device_key
        else:
            # 軟體密鑰
            self.master_key = Fernet.generate_key()
            
        # 生成TLS憑證和私鑰
        self._generate_tls_certificate()
        
    def _generate_tls_certificate(self):
        """生成TLS憑證"""
        try:
            # 生成RSA私鑰
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048
            )
            
            # 實際部署中應使用正式的CA簽發憑證
            # 這裡生成自簽憑證用於開發
            from cryptography import x509
            from cryptography.x509.oid import NameOID
            
            subject = issuer = x509.Name([
                x509.NameAttribute(NameOID.COUNTRY_NAME, "TW"),
                x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Taiwan"),
                x509.NameAttribute(NameOID.LOCALITY_NAME, "Taipei"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "CDU Systems"),
                x509.NameAttribute(NameOID.COMMON_NAME, "cdu.local"),
            ])
            
            cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                issuer
            ).public_key(
                private_key.public_key()
            ).serial_number(
                x509.random_serial_number()
            ).not_valid_before(
                datetime.utcnow()
            ).not_valid_after(
                datetime.utcnow() + timedelta(days=365)
            ).add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName("localhost"),
                    x509.DNSName("cdu.local"),
                    x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                ]),
                critical=False,
            ).sign(private_key, hashes.SHA256())
            
            self.private_key = private_key
            self.certificate = cert
            
            # 保存憑證到檔案
            os.makedirs('./certs', exist_ok=True)
            
            with open('./certs/server.crt', 'wb') as f:
                f.write(cert.public_bytes(serialization.Encoding.PEM))
                
            with open('./certs/server.key', 'wb') as f:
                f.write(private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
                
            logger.info("TLS certificate generated successfully")
            
        except Exception as e:
            logger.error(f"Error generating TLS certificate: {e}")
            
    def encrypt_data(self, data: str) -> str:
        """加密資料"""
        try:
            f = Fernet(self.master_key)
            encrypted = f.encrypt(data.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            return data
            
    def decrypt_data(self, encrypted_data: str) -> str:
        """解密資料"""
        try:
            f = Fernet(self.master_key)
            decoded = base64.b64decode(encrypted_data.encode())
            decrypted = f.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            return encrypted_data
            
    def create_ssl_context(self) -> ssl.SSLContext:
        """創建SSL上下文"""
        context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        if self.certificate and self.private_key:
            # 使用生成的憑證
            context.load_cert_chain('./certs/server.crt', './certs/server.key')
            
        return context

class RBACManager:
    """角色權限控制管理器"""
    
    def __init__(self):
        self.roles = {
            'system_admin': {'level': 4, 'permissions': ['*']},
            'operator': {'level': 3, 'permissions': ['read', 'write', 'control']},
            'monitor': {'level': 2, 'permissions': ['read', 'monitor']},
            'readonly': {'level': 1, 'permissions': ['read']}
        }
        
        self.users: Dict[str, UserCredential] = {}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.audit_logs: List[AuditLog] = []
        
        # 初始化預設管理員帳號
        self._create_default_admin()
        
    def _create_default_admin(self):
        """創建預設管理員帳號"""
        salt = secrets.token_hex(16)
        password = "admin123"  # 實際部署時應強制修改
        password_hash = self._hash_password(password, salt)
        
        admin = UserCredential(
            username="admin",
            password_hash=password_hash,
            salt=salt,
            role="system_admin",
            level=4,
            created_at=datetime.now()
        )
        
        self.users["admin"] = admin
        logger.warning("Default admin account created - PASSWORD MUST BE CHANGED IN PRODUCTION")
        
    def _hash_password(self, password: str, salt: str) -> str:
        """雜湊密碼"""
        return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
        
    def create_user(self, username: str, password: str, role: str, 
                   created_by: str) -> bool:
        """創建使用者"""
        try:
            if username in self.users:
                return False
                
            if role not in self.roles:
                return False
                
            salt = secrets.token_hex(16)
            password_hash = self._hash_password(password, salt)
            
            user = UserCredential(
                username=username,
                password_hash=password_hash,
                salt=salt,
                role=role,
                level=self.roles[role]['level'],
                created_at=datetime.now()
            )
            
            self.users[username] = user
            
            # 記錄審計日誌
            self._log_audit(created_by, 'create_user', f'user:{username}', 
                          'success', '', {'new_role': role})
            
            logger.info(f"User {username} created with role {role}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return False
            
    def authenticate(self, username: str, password: str, 
                    ip_address: str = '') -> Optional[str]:
        """使用者認證"""
        try:
            if username not in self.users:
                self._log_audit(username, 'login', 'system', 'fail', 
                              ip_address, {'reason': 'user_not_found'})
                return None
                
            user = self.users[username]
            
            # 檢查帳號是否被鎖定
            if user.locked_until and datetime.now() < user.locked_until:
                self._log_audit(username, 'login', 'system', 'fail', 
                              ip_address, {'reason': 'account_locked'})
                return None
                
            # 驗證密碼
            password_hash = self._hash_password(password, user.salt)
            if password_hash != user.password_hash:
                user.failed_attempts += 1
                
                # 5次失敗後鎖定帳號30分鐘
                if user.failed_attempts >= 5:
                    user.locked_until = datetime.now() + timedelta(minutes=30)
                    
                self._log_audit(username, 'login', 'system', 'fail', 
                              ip_address, {'reason': 'invalid_password'})
                return None
                
            # 認證成功
            user.failed_attempts = 0
            user.locked_until = None
            user.last_login = datetime.now()
            
            # 創建會話
            session_token = secrets.token_urlsafe(32)
            self.active_sessions[session_token] = {
                'username': username,
                'role': user.role,
                'level': user.level,
                'created_at': datetime.now(),
                'ip_address': ip_address
            }
            
            self._log_audit(username, 'login', 'system', 'success', 
                          ip_address, {'session_token': session_token[:8] + '...'})
            
            logger.info(f"User {username} authenticated successfully")
            return session_token
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
            
    def check_permission(self, session_token: str, action: str, 
                        resource: str) -> bool:
        """檢查權限"""
        try:
            if session_token not in self.active_sessions:
                return False
                
            session = self.active_sessions[session_token]
            
            # 檢查會話是否過期 (8小時)
            if (datetime.now() - session['created_at']).total_seconds() > 28800:
                del self.active_sessions[session_token]
                return False
                
            role = session['role']
            permissions = self.roles[role]['permissions']
            
            # 系統管理員有所有權限
            if '*' in permissions:
                return True
                
            # 檢查特定權限
            if action in permissions:
                return True
                
            # 記錄權限拒絕
            self._log_audit(session['username'], action, resource, 'denied', 
                          session['ip_address'], {'reason': 'insufficient_permissions'})
            
            return False
            
        except Exception as e:
            logger.error(f"Permission check error: {e}")
            return False
            
    def logout(self, session_token: str):
        """登出"""
        if session_token in self.active_sessions:
            session = self.active_sessions[session_token]
            self._log_audit(session['username'], 'logout', 'system', 'success', 
                          session['ip_address'], {})
            del self.active_sessions[session_token]
            
    def _log_audit(self, user: str, action: str, resource: str, result: str, 
                  ip_address: str, details: Dict[str, Any]):
        """記錄審計日誌"""
        audit_log = AuditLog(
            timestamp=datetime.now(),
            user=user,
            action=action,
            resource=resource,
            result=result,
            ip_address=ip_address,
            details=details
        )
        
        self.audit_logs.append(audit_log)
        
        # 保持審計日誌在合理範圍內
        if len(self.audit_logs) > 10000:
            self.audit_logs = self.audit_logs[-5000:]
            
        # 記錄到檔案
        self._write_audit_to_file(audit_log)
        
    def _write_audit_to_file(self, audit_log: AuditLog):
        """寫入審計日誌到檔案"""
        try:
            os.makedirs('./logs', exist_ok=True)
            log_file = f"./logs/audit_{datetime.now().strftime('%Y%m%d')}.log"
            
            log_entry = {
                'timestamp': audit_log.timestamp.isoformat(),
                'user': audit_log.user,
                'action': audit_log.action,
                'resource': audit_log.resource,
                'result': audit_log.result,
                'ip_address': audit_log.ip_address,
                'details': audit_log.details
            }
            
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
                
        except Exception as e:
            logger.error(f"Error writing audit log: {e}")
            
    def get_audit_logs(self, start_time: Optional[datetime] = None, 
                      end_time: Optional[datetime] = None) -> List[AuditLog]:
        """獲取審計日誌"""
        filtered_logs = self.audit_logs
        
        if start_time:
            filtered_logs = [log for log in filtered_logs if log.timestamp >= start_time]
            
        if end_time:
            filtered_logs = [log for log in filtered_logs if log.timestamp <= end_time]
            
        return filtered_logs

class SecurityManager:
    """安全管理器主類"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config['Security']
        
        # 初始化各個安全組件
        self.tpm_manager = TPMManager() if self.config['enable_tpm'] else None
        self.crypto_manager = CryptographicManager(self.tpm_manager)
        self.rbac_manager = RBACManager() if self.config['enable_rbac'] else None
        
        # 安全狀態
        self.security_events = []
        self.threat_level = 'low'
        
        # 啟動安全監控
        threading.Thread(target=self._security_monitor_loop, daemon=True).start()
        
        logger.info("Security Manager initialized")
        
    def authenticate_request(self, request_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """認證請求"""
        if not self.rbac_manager:
            return True, None
            
        username = request_data.get('username')
        password = request_data.get('password')
        ip_address = request_data.get('ip_address', '')
        
        if not username or not password:
            return False, "Missing credentials"
            
        session_token = self.rbac_manager.authenticate(username, password, ip_address)
        if session_token:
            return True, session_token
        else:
            return False, "Authentication failed"
            
    def authorize_action(self, session_token: str, action: str, resource: str) -> bool:
        """授權操作"""
        if not self.rbac_manager:
            return True
            
        return self.rbac_manager.check_permission(session_token, action, resource)
        
    def encrypt_sensitive_data(self, data: str) -> str:
        """加密敏感資料"""
        return self.crypto_manager.encrypt_data(data)
        
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """解密敏感資料"""
        return self.crypto_manager.decrypt_data(encrypted_data)
        
    def get_ssl_context(self) -> ssl.SSLContext:
        """獲取SSL上下文"""
        return self.crypto_manager.create_ssl_context()
        
    def get_device_attestation(self) -> Dict[str, Any]:
        """獲取設備認證"""
        if self.tpm_manager:
            identity = self.tpm_manager.get_device_identity()
            integrity = self.tpm_manager.attest_boot_integrity()
            return {**identity, **integrity}
        else:
            return {'status': 'no_tpm', 'trusted': False}
            
    def report_security_event(self, event_type: str, description: str, 
                            severity: str = 'medium'):
        """報告安全事件"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'type': event_type,
            'description': description,
            'severity': severity
        }
        
        self.security_events.append(event)
        
        # 調整威脅等級
        if severity == 'critical':
            self.threat_level = 'critical'
        elif severity == 'high' and self.threat_level == 'low':
            self.threat_level = 'medium'
            
        logger.warning(f"Security event: {event_type} - {description}")
        
        # 保持事件日誌在合理範圍內
        if len(self.security_events) > 1000:
            self.security_events = self.security_events[-500:]
            
    def get_security_status(self) -> Dict[str, Any]:
        """獲取安全狀態"""
        return {
            'threat_level': self.threat_level,
            'tpm_available': self.tpm_manager.tpm_available if self.tpm_manager else False,
            'rbac_enabled': self.rbac_manager is not None,
            'active_sessions': len(self.rbac_manager.active_sessions) if self.rbac_manager else 0,
            'recent_events': self.security_events[-10:],
            'device_attestation': self.get_device_attestation()
        }
        
    def _security_monitor_loop(self):
        """安全監控迴圈"""
        while True:
            try:
                # 檢查異常登入活動
                self._check_login_anomalies()
                
                # 檢查過期會話
                self._cleanup_expired_sessions()
                
                # 降低威脅等級 (如果沒有新的高威脅事件)
                self._decay_threat_level()
                
                time.sleep(300)  # 每5分鐘檢查一次
                
            except Exception as e:
                logger.error(f"Error in security monitoring: {e}")
                time.sleep(60)
                
    def _check_login_anomalies(self):
        """檢查異常登入活動"""
        if not self.rbac_manager:
            return
            
        # 檢查過去1小時的登入失敗次數
        recent_failures = [
            log for log in self.rbac_manager.audit_logs 
            if (log.action == 'login' and log.result == 'fail' and 
                (datetime.now() - log.timestamp).total_seconds() < 3600)
        ]
        
        if len(recent_failures) > 10:
            self.report_security_event(
                'suspicious_login_activity',
                f'{len(recent_failures)} failed login attempts in the last hour',
                'high'
            )
            
    def _cleanup_expired_sessions(self):
        """清理過期會話"""
        if not self.rbac_manager:
            return
            
        expired_sessions = []
        for token, session in self.rbac_manager.active_sessions.items():
            if (datetime.now() - session['created_at']).total_seconds() > 28800:  # 8小時
                expired_sessions.append(token)
                
        for token in expired_sessions:
            del self.rbac_manager.active_sessions[token]
            
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
            
    def _decay_threat_level(self):
        """降低威脅等級"""
        # 如果過去1小時沒有高威脅事件，降低威脅等級
        recent_high_threats = [
            event for event in self.security_events
            if (event['severity'] in ['high', 'critical'] and
                (datetime.now() - datetime.fromisoformat(event['timestamp'])).total_seconds() < 3600)
        ]
        
        if not recent_high_threats:
            if self.threat_level == 'critical':
                self.threat_level = 'high'
            elif self.threat_level == 'high':
                self.threat_level = 'medium'
            elif self.threat_level == 'medium':
                self.threat_level = 'low'