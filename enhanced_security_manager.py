"""
Enhanced Security Manager for CDU Control System
增強型安全管理器 - 支援多因素認證、加密和審計
"""

import os
import jwt
import bcrypt
import pyotp
import secrets
import hashlib
import json
import qrcode
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import ipaddress
from pathlib import Path
import threading
import time
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UserRole(Enum):
    VIEWER = "viewer"
    OPERATOR = "operator"  
    MAINTAINER = "maintainer"
    ADMINISTRATOR = "administrator"
    SUPER_ADMIN = "super_admin"

class AuthMethod(Enum):
    PASSWORD = "password"
    TOTP = "totp"
    CERTIFICATE = "certificate"
    BIOMETRIC = "biometric"

class SessionStatus(Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    LOCKED = "locked"

@dataclass
class User:
    """使用者資料類"""
    user_id: str
    username: str
    email: str
    password_hash: str
    salt: str
    role: UserRole
    totp_secret: Optional[str] = None
    certificate_fingerprint: Optional[str] = None
    created_at: datetime = None
    last_login: Optional[datetime] = None
    failed_attempts: int = 0
    locked_until: Optional[datetime] = None
    password_expires_at: Optional[datetime] = None
    must_change_password: bool = False
    enabled: bool = True
    two_factor_enabled: bool = False
    allowed_ips: List[str] = None
    session_timeout: int = 3600  # 1小時

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc)
        if self.allowed_ips is None:
            self.allowed_ips = []

@dataclass
class Session:
    """會話資料類"""
    session_id: str
    user_id: str
    username: str
    role: UserRole
    source_ip: str
    user_agent: str
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    status: SessionStatus = SessionStatus.ACTIVE
    mfa_verified: bool = False
    permissions: List[str] = None

    def __post_init__(self):
        if self.permissions is None:
            self.permissions = []

@dataclass
class SecurityEvent:
    """安全事件資料類"""
    event_id: str
    event_type: str
    user_id: Optional[str]
    username: Optional[str]
    source_ip: str
    timestamp: datetime
    details: Dict[str, Any]
    risk_level: str  # low, medium, high, critical

class PasswordPolicy:
    """密碼策略類"""
    def __init__(self):
        self.min_length = 8
        self.max_length = 128
        self.require_uppercase = True
        self.require_lowercase = True
        self.require_digits = True
        self.require_special = True
        self.special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        self.password_history = 5
        self.max_age_days = 90
        self.lockout_attempts = 5
        self.lockout_duration = 1800  # 30分鐘
        
    def validate_password(self, password: str, username: str = "") -> Tuple[bool, List[str]]:
        """驗證密碼強度"""
        errors = []
        
        if len(password) < self.min_length:
            errors.append(f"密碼長度至少需要 {self.min_length} 個字元")
        
        if len(password) > self.max_length:
            errors.append(f"密碼長度不能超過 {self.max_length} 個字元")
        
        if self.require_uppercase and not any(c.isupper() for c in password):
            errors.append("密碼必須包含至少一個大寫字母")
        
        if self.require_lowercase and not any(c.islower() for c in password):
            errors.append("密碼必須包含至少一個小寫字母")
        
        if self.require_digits and not any(c.isdigit() for c in password):
            errors.append("密碼必須包含至少一個數字")
        
        if self.require_special and not any(c in self.special_chars for c in password):
            errors.append(f"密碼必須包含至少一個特殊字元: {self.special_chars}")
        
        # 檢查是否包含使用者名稱
        if username and username.lower() in password.lower():
            errors.append("密碼不能包含使用者名稱")
        
        # 檢查常見弱密碼
        weak_passwords = [
            "password", "123456", "admin", "root", "user",
            "qwerty", "abc123", "password123", "admin123"
        ]
        if password.lower() in weak_passwords:
            errors.append("不能使用常見的弱密碼")
        
        return len(errors) == 0, errors

class EncryptionManager:
    """加密管理器"""
    
    def __init__(self, key_file: str = "encryption.key"):
        self.key_file = key_file
        self.fernet = self._load_or_create_key()
        
    def _load_or_create_key(self) -> Fernet:
        """載入或建立加密金鑰"""
        key_path = Path(self.key_file)
        
        if key_path.exists():
            with open(key_path, 'rb') as f:
                key = f.read()
        else:
            key = Fernet.generate_key()
            with open(key_path, 'wb') as f:
                f.write(key)
            # 設定檔案權限為僅擁有者可讀
            os.chmod(key_path, 0o600)
            
        return Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """加密資料"""
        return self.fernet.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """解密資料"""
        return self.fernet.decrypt(encrypted_data.encode()).decode()
    
    def hash_password(self, password: str) -> Tuple[str, str]:
        """雜湊密碼"""
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password.encode(), salt)
        return password_hash.decode(), salt.decode()
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """驗證密碼"""
        return bcrypt.checkpw(password.encode(), password_hash.encode())

class TOTPManager:
    """TOTP 多因素認證管理器"""
    
    @staticmethod
    def generate_secret() -> str:
        """產生 TOTP 密鑰"""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(username: str, secret: str, issuer: str = "CDU Control System") -> str:
        """產生 QR Code"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=username,
            issuer_name=issuer
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        # 這裡可以將 QR Code 儲存為圖檔或回傳 base64
        return totp_uri
    
    @staticmethod
    def verify_totp(secret: str, token: str, window: int = 1) -> bool:
        """驗證 TOTP 令牌"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=window)

class SecurityManager:
    """安全管理器主類"""
    
    def __init__(self, config_file: str = "security_config.json"):
        self.config = self._load_config(config_file)
        self.users: Dict[str, User] = {}
        self.sessions: Dict[str, Session] = {}
        self.security_events: List[SecurityEvent] = []
        self.failed_attempts: Dict[str, List[datetime]] = {}
        self.blocked_ips: Dict[str, datetime] = {}
        
        self.password_policy = PasswordPolicy()
        self.encryption_manager = EncryptionManager()
        self.jwt_secret = secrets.token_hex(32)
        
        # 載入使用者資料
        self._load_users()
        
        # 啟動清理任務
        self._start_cleanup_tasks()
        
    def _load_config(self, config_file: str) -> Dict:
        """載入安全設定"""
        default_config = {
            "jwt_expiration_hours": 24,
            "session_timeout_seconds": 3600,
            "max_failed_attempts": 5,
            "lockout_duration_seconds": 1800,
            "ip_whitelist": [],
            "ip_blacklist": [],
            "require_https": True,
            "secure_headers": True,
            "rate_limit": {
                "enabled": True,
                "requests_per_minute": 60,
                "burst_limit": 10
            },
            "audit_log": {
                "enabled": True,
                "retention_days": 365,
                "file_path": "logs/security_audit.log"
            },
            "encryption": {
                "algorithm": "AES-256",
                "key_rotation_days": 90
            },
            "two_factor": {
                "enabled": True,
                "required_roles": ["administrator", "super_admin"]
            }
        }
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            # 合併預設設定
            for key, value in default_config.items():
                if key not in config:
                    config[key] = value
            return config
        except FileNotFoundError:
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)
            return default_config
    
    def _load_users(self):
        """載入使用者資料"""
        users_file = "users.json"
        try:
            with open(users_file, 'r', encoding='utf-8') as f:
                users_data = json.load(f)
                
            for user_data in users_data:
                user = User(**user_data)
                user.role = UserRole(user.role)
                if user.created_at:
                    user.created_at = datetime.fromisoformat(user.created_at)
                if user.last_login:
                    user.last_login = datetime.fromisoformat(user.last_login)
                if user.locked_until:
                    user.locked_until = datetime.fromisoformat(user.locked_until)
                if user.password_expires_at:
                    user.password_expires_at = datetime.fromisoformat(user.password_expires_at)
                    
                self.users[user.user_id] = user
                
        except FileNotFoundError:
            # 建立預設管理員使用者
            self._create_default_admin()
    
    def _create_default_admin(self):
        """建立預設管理員使用者"""
        password_hash, salt = self.encryption_manager.hash_password("admin123")
        
        admin_user = User(
            user_id="admin",
            username="admin",
            email="admin@cdu.local",
            password_hash=password_hash,
            salt=salt,
            role=UserRole.ADMINISTRATOR,
            must_change_password=True,
            two_factor_enabled=False
        )
        
        self.users["admin"] = admin_user
        self._save_users()
        
        logger.info("Default admin user created. Username: admin, Password: admin123")
        logger.warning("Please change the default password immediately!")
    
    def _save_users(self):
        """儲存使用者資料"""
        users_data = []
        for user in self.users.values():
            user_dict = asdict(user)
            user_dict['role'] = user.role.value
            if user.created_at:
                user_dict['created_at'] = user.created_at.isoformat()
            if user.last_login:
                user_dict['last_login'] = user.last_login.isoformat()
            if user.locked_until:
                user_dict['locked_until'] = user.locked_until.isoformat()
            if user.password_expires_at:
                user_dict['password_expires_at'] = user.password_expires_at.isoformat()
            users_data.append(user_dict)
        
        with open("users.json", 'w', encoding='utf-8') as f:
            json.dump(users_data, f, indent=2, ensure_ascii=False, default=str)
    
    def create_user(self, username: str, email: str, password: str, role: UserRole,
                   admin_user_id: str) -> Tuple[bool, str, Optional[User]]:
        """建立新使用者"""
        # 檢查管理員權限
        admin_user = self.users.get(admin_user_id)
        if not admin_user or admin_user.role not in [UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN]:
            return False, "Insufficient permissions", None
        
        # 檢查使用者名稱是否已存在
        if any(u.username == username for u in self.users.values()):
            return False, "Username already exists", None
        
        # 驗證密碼強度
        valid, errors = self.password_policy.validate_password(password, username)
        if not valid:
            return False, "; ".join(errors), None
        
        # 建立新使用者
        user_id = secrets.token_hex(16)
        password_hash, salt = self.encryption_manager.hash_password(password)
        
        new_user = User(
            user_id=user_id,
            username=username,
            email=email,
            password_hash=password_hash,
            salt=salt,
            role=role,
            password_expires_at=datetime.now(timezone.utc) + timedelta(days=self.password_policy.max_age_days)
        )
        
        self.users[user_id] = new_user
        self._save_users()
        
        # 記錄安全事件
        self._log_security_event(
            "user_created",
            admin_user_id,
            admin_user.username,
            "127.0.0.1",
            {"new_username": username, "new_role": role.value},
            "low"
        )
        
        return True, "User created successfully", new_user
    
    def authenticate_user(self, username: str, password: str, source_ip: str,
                         user_agent: str = "", totp_token: str = "") -> Tuple[bool, str, Optional[Session]]:
        """使用者認證"""
        # 檢查 IP 是否被封鎖
        if self._is_ip_blocked(source_ip):
            self._log_security_event(
                "blocked_ip_attempt",
                None,
                username,
                source_ip,
                {"reason": "IP blocked"},
                "high"
            )
            return False, "IP address is blocked", None
        
        # 查找使用者
        user = None
        for u in self.users.values():
            if u.username == username:
                user = u
                break
        
        if not user:
            self._log_failed_attempt(source_ip, username)
            return False, "Invalid credentials", None
        
        # 檢查使用者是否被鎖定
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            remaining = (user.locked_until - datetime.now(timezone.utc)).seconds
            return False, f"Account locked for {remaining} seconds", None
        
        # 檢查使用者是否啟用
        if not user.enabled:
            return False, "Account is disabled", None
        
        # 驗證密碼
        if not self.encryption_manager.verify_password(password, user.password_hash):
            user.failed_attempts += 1
            
            if user.failed_attempts >= self.password_policy.lockout_attempts:
                user.locked_until = datetime.now(timezone.utc) + timedelta(
                    seconds=self.password_policy.lockout_duration
                )
                self._log_security_event(
                    "account_locked",
                    user.user_id,
                    username,
                    source_ip,
                    {"failed_attempts": user.failed_attempts},
                    "high"
                )
            
            self._save_users()
            self._log_failed_attempt(source_ip, username)
            return False, "Invalid credentials", None
        
        # 檢查密碼是否過期
        if user.password_expires_at and user.password_expires_at < datetime.now(timezone.utc):
            return False, "Password has expired", None
        
        # 檢查是否需要雙因素認證
        if user.two_factor_enabled and user.totp_secret:
            if not totp_token:
                return False, "TOTP token required", None
            
            if not TOTPManager.verify_totp(user.totp_secret, totp_token):
                self._log_security_event(
                    "invalid_totp",
                    user.user_id,
                    username,
                    source_ip,
                    {"totp_token": totp_token},
                    "medium"
                )
                return False, "Invalid TOTP token", None
        
        # 重置失敗次數
        user.failed_attempts = 0
        user.last_login = datetime.now(timezone.utc)
        user.locked_until = None
        self._save_users()
        
        # 建立會話
        session = self._create_session(user, source_ip, user_agent)
        session.mfa_verified = not user.two_factor_enabled or bool(totp_token)
        
        # 記錄成功登入
        self._log_security_event(
            "login_success",
            user.user_id,
            username,
            source_ip,
            {"user_agent": user_agent, "mfa_verified": session.mfa_verified},
            "low"
        )
        
        return True, "Authentication successful", session
    
    def _create_session(self, user: User, source_ip: str, user_agent: str) -> Session:
        """建立使用者會話"""
        session_id = secrets.token_hex(32)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=user.session_timeout)
        
        session = Session(
            session_id=session_id,
            user_id=user.user_id,
            username=user.username,
            role=user.role,
            source_ip=source_ip,
            user_agent=user_agent,
            created_at=now,
            last_activity=now,
            expires_at=expires_at,
            permissions=self._get_role_permissions(user.role)
        )
        
        self.sessions[session_id] = session
        return session
    
    def _get_role_permissions(self, role: UserRole) -> List[str]:
        """取得角色權限"""
        permissions_map = {
            UserRole.VIEWER: [
                "read:status", "read:sensors", "read:alarms"
            ],
            UserRole.OPERATOR: [
                "read:status", "read:sensors", "read:alarms",
                "write:control", "acknowledge:alarms"
            ],
            UserRole.MAINTAINER: [
                "read:status", "read:sensors", "read:alarms", "read:logs",
                "write:control", "acknowledge:alarms", "clear:alarms",
                "read:maintenance", "write:maintenance"
            ],
            UserRole.ADMINISTRATOR: [
                "read:*", "write:*", "delete:*",
                "manage:users", "manage:settings", "manage:firmware"
            ],
            UserRole.SUPER_ADMIN: [
                "read:*", "write:*", "delete:*",
                "manage:*", "system:*"
            ]
        }
        
        return permissions_map.get(role, [])
    
    def validate_session(self, session_id: str, source_ip: str = None) -> Tuple[bool, Optional[Session]]:
        """驗證會話有效性"""
        session = self.sessions.get(session_id)
        
        if not session:
            return False, None
        
        # 檢查會話狀態
        if session.status != SessionStatus.ACTIVE:
            return False, None
        
        # 檢查過期時間
        if session.expires_at < datetime.now(timezone.utc):
            session.status = SessionStatus.EXPIRED
            return False, None
        
        # 檢查 IP 一致性（可選）
        if source_ip and session.source_ip != source_ip:
            # 記錄可疑活動
            self._log_security_event(
                "session_ip_mismatch",
                session.user_id,
                session.username,
                source_ip,
                {"original_ip": session.source_ip, "new_ip": source_ip},
                "medium"
            )
        
        # 更新最後活動時間
        session.last_activity = datetime.now(timezone.utc)
        session.expires_at = session.last_activity + timedelta(seconds=3600)  # 延長1小時
        
        return True, session
    
    def logout_user(self, session_id: str) -> bool:
        """使用者登出"""
        session = self.sessions.get(session_id)
        if not session:
            return False
        
        session.status = SessionStatus.REVOKED
        
        # 記錄登出事件
        self._log_security_event(
            "logout",
            session.user_id,
            session.username,
            session.source_ip,
            {"session_duration": str(datetime.now(timezone.utc) - session.created_at)},
            "low"
        )
        
        # 從活躍會話中移除
        del self.sessions[session_id]
        return True
    
    def enable_two_factor(self, user_id: str) -> Tuple[bool, str, Optional[str]]:
        """啟用雙因素認證"""
        user = self.users.get(user_id)
        if not user:
            return False, "User not found", None
        
        if user.two_factor_enabled:
            return False, "Two-factor authentication is already enabled", None
        
        # 產生 TOTP 密鑰
        secret = TOTPManager.generate_secret()
        qr_uri = TOTPManager.generate_qr_code(user.username, secret)
        
        # 暫時儲存密鑰（等待驗證）
        user.totp_secret = secret
        user.two_factor_enabled = True
        self._save_users()
        
        return True, "Two-factor authentication enabled", qr_uri
    
    def _log_failed_attempt(self, source_ip: str, username: str):
        """記錄失敗嘗試"""
        now = datetime.now(timezone.utc)
        
        if source_ip not in self.failed_attempts:
            self.failed_attempts[source_ip] = []
        
        self.failed_attempts[source_ip].append(now)
        
        # 清理 1 小時前的記錄
        cutoff = now - timedelta(hours=1)
        self.failed_attempts[source_ip] = [
            attempt for attempt in self.failed_attempts[source_ip]
            if attempt > cutoff
        ]
        
        # 檢查是否需要封鎖 IP
        if len(self.failed_attempts[source_ip]) >= 10:  # 1小時內10次失敗
            self.blocked_ips[source_ip] = now + timedelta(hours=1)
            
            self._log_security_event(
                "ip_blocked",
                None,
                username,
                source_ip,
                {"failed_attempts": len(self.failed_attempts[source_ip])},
                "high"
            )
    
    def _is_ip_blocked(self, source_ip: str) -> bool:
        """檢查 IP 是否被封鎖"""
        if source_ip in self.blocked_ips:
            if self.blocked_ips[source_ip] > datetime.now(timezone.utc):
                return True
            else:
                del self.blocked_ips[source_ip]
        return False
    
    def _log_security_event(self, event_type: str, user_id: Optional[str], username: Optional[str],
                          source_ip: str, details: Dict[str, Any], risk_level: str):
        """記錄安全事件"""
        event = SecurityEvent(
            event_id=secrets.token_hex(16),
            event_type=event_type,
            user_id=user_id,
            username=username,
            source_ip=source_ip,
            timestamp=datetime.now(timezone.utc),
            details=details,
            risk_level=risk_level
        )
        
        self.security_events.append(event)
        
        # 記錄到日誌檔案
        logger.info(f"Security Event: {event_type} - User: {username} - IP: {source_ip} - Risk: {risk_level}")
    
    def _start_cleanup_tasks(self):
        """啟動清理任務"""
        def cleanup_expired_sessions():
            while True:
                time.sleep(300)  # 每5分鐘執行一次
                now = datetime.now(timezone.utc)
                
                expired_sessions = []
                for session_id, session in self.sessions.items():
                    if session.expires_at < now:
                        expired_sessions.append(session_id)
                
                for session_id in expired_sessions:
                    self.sessions[session_id].status = SessionStatus.EXPIRED
                    del self.sessions[session_id]
        
        cleanup_thread = threading.Thread(target=cleanup_expired_sessions, daemon=True)
        cleanup_thread.start()
    
    def get_security_statistics(self) -> Dict[str, Any]:
        """取得安全統計資訊"""
        now = datetime.now(timezone.utc)
        
        # 活躍會話統計
        active_sessions = len([s for s in self.sessions.values() if s.status == SessionStatus.ACTIVE])
        
        # 今日事件統計
        today_events = [e for e in self.security_events if e.timestamp.date() == now.date()]
        
        # 風險等級統計
        risk_stats = {}
        for event in today_events:
            risk_stats[event.risk_level] = risk_stats.get(event.risk_level, 0) + 1
        
        # 使用者統計
        user_stats = {
            "total_users": len(self.users),
            "active_users": len([u for u in self.users.values() if u.enabled]),
            "locked_users": len([u for u in self.users.values() if u.locked_until and u.locked_until > now]),
            "2fa_enabled": len([u for u in self.users.values() if u.two_factor_enabled])
        }
        
        return {
            "active_sessions": active_sessions,
            "today_events": len(today_events),
            "risk_statistics": risk_stats,
            "user_statistics": user_stats,
            "blocked_ips": len(self.blocked_ips),
            "failed_attempts_last_hour": sum(len(attempts) for attempts in self.failed_attempts.values())
        }

# 全域安全管理器實例
_security_manager = None

def get_security_manager() -> SecurityManager:
    """取得全域安全管理器實例"""
    global _security_manager
    if _security_manager is None:
        _security_manager = SecurityManager()
    return _security_manager

# 示例使用
if __name__ == "__main__":
    # 建立安全管理器
    security_manager = SecurityManager()
    
    # 建立使用者
    success, message, user = security_manager.create_user(
        "operator1", "operator1@cdu.local", "StrongPass123!", UserRole.OPERATOR, "admin"
    )
    print(f"Create user: {success} - {message}")
    
    # 使用者認證
    success, message, session = security_manager.authenticate_user(
        "admin", "admin123", "192.168.1.100", "Mozilla/5.0"
    )
    print(f"Authentication: {success} - {message}")
    
    if session:
        print(f"Session ID: {session.session_id}")
        
        # 驗證會話
        valid, session_check = security_manager.validate_session(session.session_id)
        print(f"Session valid: {valid}")
        
        # 啟用雙因素認證
        success, message, qr_uri = security_manager.enable_two_factor(session.user_id)
        print(f"Enable 2FA: {success} - {message}")
        if qr_uri:
            print(f"QR URI: {qr_uri}")
    
    # 取得安全統計
    stats = security_manager.get_security_statistics()
    print("Security Statistics:")
    print(json.dumps(stats, indent=2, default=str))