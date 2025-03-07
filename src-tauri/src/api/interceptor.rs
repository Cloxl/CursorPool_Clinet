use reqwest::Request;
use std::sync::Arc;
use tauri::AppHandle;
use tauri::Manager;
use crate::database::Database;

/// HTTP 请求拦截器特征
pub trait Interceptor: Send + Sync {
    /// 拦截并处理请求
    fn intercept(&self, request: &mut Request) -> Result<(), String>;
}

/// JWT 认证拦截器
pub struct AuthInterceptor {
    app_handle: Arc<AppHandle>,
}

impl AuthInterceptor {
    /// 创建认证拦截器实例
    pub fn new(app_handle: Arc<AppHandle>) -> Self {
        Self { app_handle }
    }
}

impl Interceptor for AuthInterceptor {
    fn intercept(&self, request: &mut Request) -> Result<(), String> {
        let db = self.app_handle.state::<Database>();
        
        let token = match db.get_item("user.info.token") {
            Ok(Some(token)) => token,
            _ => return Ok(())
        };
        
        request.headers_mut().insert(
            "Authorization",
            format!("Bearer {}", token).parse().unwrap(),
        );
        
        Ok(())
    }
}

/// 检查 URL 是否需要认证
pub fn is_auth_required_url(url: &str) -> bool {
    if url.contains("cursor.com") {
        return false;
    }
    
    let public_endpoints = [
        "/login",
        "/register",
        "/emailRegister",
        "/checkUser",
        "/register/sendEmailCode",
        "/emailResetPassword",
        "/version",
        "/public/info",
        "/disclaimer",
        "/api/usage",
    ];
    
    for endpoint in public_endpoints {
        if url.contains(endpoint) {
            return false;
        }
    }
    
    true
}

/// 保存认证令牌
pub async fn save_auth_token(db: &tauri::State<'_, Database>, url: &str, response_text: &str) -> Result<(), String> {
    if !url.contains("/login") && !url.contains("/emailRegister") {
        return Ok(());
    }
    
    let api_response: crate::api::types::ApiResponse<crate::api::types::LoginResponse> = match serde_json::from_str(response_text) {
        Ok(response) => response,
        Err(_) => return Ok(())
    };
    
    if api_response.status == 200 && api_response.data.is_some() {
        let data = api_response.data.unwrap();
        if let Some(token) = data.token {
            db.set_item("user.info.token", &token)
                .map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
} 