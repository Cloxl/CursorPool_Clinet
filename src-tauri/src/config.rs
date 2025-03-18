use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use std::sync::RwLock;
use std::time::Duration;

// API 配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    // 默认API基础URL
    pub default_api_url: String,
    // 配置文件URL
    pub config_file_url: String,
    // Cursor API 用户ID
    pub cursor_user_id: String,
    // 不需要认证的公共端点
    pub public_endpoints: Vec<String>,
    // API请求超时时间(秒)
    pub request_timeout: u64,
}

// 路径配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathConfig {
    // Windows路径
    pub windows: WindowsPaths,
    // macOS路径
    pub macos: MacOSPaths,
    // Linux路径
    pub linux: LinuxPaths,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsPaths {
    pub cursor_exe: String,
    pub cursor_resources: String,
    pub cursor_updater: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacOSPaths {
    pub cursor_app: String,
    pub cursor_resources: String,
    pub cursor_updater: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinuxPaths {
    pub cursor_exe: String,
    pub cursor_resources: String,
    pub cursor_updater: String,
}

// 数据库键配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbKeyConfig {
    pub inbound_config_key: String,
    pub current_inbound_key: String,
    pub cursor_main_js_path_key: String,
    pub token_key: String,
    pub lang_key: String,
}

// 超时配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeoutConfig {
    // 测速超时时间(毫秒)
    pub ping_timeout_ms: u64,
    // 普通请求超时(秒)
    pub request_timeout_secs: u64,
}

// 全局应用配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub api: ApiConfig,
    pub paths: PathConfig,
    pub db_keys: DbKeyConfig,
    pub timeouts: TimeoutConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api: ApiConfig {
                default_api_url: "http://127.0.0.1:8080/api".to_string(),//default_api_url: "https://pool.52ai.org/api".to_string(),
                config_file_url: "http://127.0.0.1:8080/api/inbound/config".to_string(),//config_file_url: "https://cursorpool.oss-cn-guangzhou.aliyuncs.com/config.json".to_string(),
                cursor_user_id: "user_01000000000000000000000000".to_string(),
                public_endpoints: vec![
                    "/login".to_string(),
                    "/register".to_string(),
                    "/emailRegister".to_string(),
                    "/checkUser".to_string(),
                    "/register/sendEmailCode".to_string(),
                    "/emailResetPassword".to_string(),
                    "/version".to_string(),
                    "/public/info".to_string(),
                    "/disclaimer".to_string(),
                    "/api/usage".to_string(),
                ],
                request_timeout: 10,
            },
            paths: PathConfig {
                windows: WindowsPaths {
                    cursor_exe: "%LOCALAPPDATA%\\Programs\\cursor\\Cursor.exe".to_string(),
                    cursor_resources: "%LOCALAPPDATA%\\Programs\\cursor\\resources\\app\\out\\main.js".to_string(),
                    cursor_updater: "%LOCALAPPDATA%\\cursor-updater".to_string(),
                },
                macos: MacOSPaths {
                    cursor_app: "/Applications/Cursor.app/Contents/MacOS/Cursor".to_string(),
                    cursor_resources: "/Applications/Cursor.app/Contents/Resources/app/out/main.js".to_string(),
                    cursor_updater: "~/Library/Application Support/cursor-updater".to_string(),
                },
                linux: LinuxPaths {
                    cursor_exe: "/usr/bin/cursor".to_string(),
                    cursor_resources: "/usr/lib/cursor/resources/app/out/main.js".to_string(),
                    cursor_updater: "~/.config/cursor-updater".to_string(),
                },
            },
            db_keys: DbKeyConfig {
                inbound_config_key: "system.inbound.config".to_string(),
                current_inbound_key: "system.inbound.current".to_string(),
                cursor_main_js_path_key: "system.cursor.path.mainJs".to_string(),
                token_key: "user.info.token".to_string(),
                lang_key: "user.info.lang".to_string(),
            },
            timeouts: TimeoutConfig {
                ping_timeout_ms: 5000,
                request_timeout_secs: 10,
            },
        }
    }
}

// 全局配置实例
lazy_static! {
    pub static ref CONFIG: RwLock<AppConfig> = RwLock::new(AppConfig::default());
}

// 初始化配置
pub fn init_config() -> Result<(), String> {
    Ok(())
}

// 辅助函数: 根据操作系统获取当前系统路径配置
pub fn get_os_paths() -> PathBuf {
    let config = CONFIG.read().unwrap();
    
    if cfg!(target_os = "windows") {
        PathBuf::from(config.paths.windows.cursor_exe.replace("%LOCALAPPDATA%", &env::var("LOCALAPPDATA").unwrap_or_default()))
    } else if cfg!(target_os = "macos") {
        PathBuf::from(config.paths.macos.cursor_app.replace("~", &env::var("HOME").unwrap_or_default()))
    } else {
        // Linux
        PathBuf::from(config.paths.linux.cursor_exe.replace("~", &env::var("HOME").unwrap_or_default()))
    }
}

// 获取当前操作系统的资源路径
pub fn get_os_resources_path() -> PathBuf {
    let config = CONFIG.read().unwrap();
    
    if cfg!(target_os = "windows") {
        PathBuf::from(config.paths.windows.cursor_resources.replace("%LOCALAPPDATA%", &env::var("LOCALAPPDATA").unwrap_or_default()))
    } else if cfg!(target_os = "macos") {
        PathBuf::from(config.paths.macos.cursor_resources.replace("~", &env::var("HOME").unwrap_or_default()))
    } else {
        // Linux
        PathBuf::from(config.paths.linux.cursor_resources.replace("~", &env::var("HOME").unwrap_or_default()))
    }
}

// 获取默认的API URL
pub fn get_default_api_url() -> String {
    CONFIG.read().unwrap().api.default_api_url.clone()
}

// 获取配置文件 URL
pub fn get_config_file_url() -> String {
    CONFIG.read().unwrap().api.config_file_url.clone()
}

// 获取请求超时时间
pub fn get_request_timeout() -> Duration {
    Duration::from_secs(CONFIG.read().unwrap().timeouts.request_timeout_secs)
}

// 获取Ping超时时间
pub fn get_ping_timeout() -> Duration {
    Duration::from_millis(CONFIG.read().unwrap().timeouts.ping_timeout_ms)
}

// 检查是否为公共端点
pub fn is_public_endpoint(url: &str) -> bool {
    let config = CONFIG.read().unwrap();
    
    if url.contains("cursor.com") {
        return true;
    }
    
    for endpoint in &config.api.public_endpoints {
        if url.contains(endpoint) {
            return true;
        }
    }
    
    false
}

// 获取数据库键
pub fn get_db_key(key_type: &str) -> String {
    let config = CONFIG.read().unwrap();
    
    match key_type {
        "inbound_config" => config.db_keys.inbound_config_key.clone(),
        "current_inbound" => config.db_keys.current_inbound_key.clone(),
        "cursor_main_js_path" => config.db_keys.cursor_main_js_path_key.clone(),
        "token" => config.db_keys.token_key.clone(),
        "lang" => config.db_keys.lang_key.clone(),
        _ => "".to_string(),
    }
} 