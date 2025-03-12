use serde_json::{json, Value};
use std::fs;
use rusqlite::Connection;
use crate::utils::paths::AppPaths;
use crate::utils::id_generator::generate_new_ids;
use crate::utils::ProcessManager;
use crate::utils::hook::Hook;
use crate::utils::file_utils::safe_write;
use crate::utils::ErrorReporter;
use crate::api::client::ApiClient;
use tauri::State;

/// 终止 Cursor 进程
#[tauri::command]
pub async fn close_cursor() -> Result<bool, String> {
    let process_manager = ProcessManager::new();
    
    // 检查Cursor是否在运行
    if !process_manager.is_cursor_running() {
        return Ok(false); // Cursor未运行，无需关闭
    }
    
    // 关闭Cursor进程
    process_manager.kill_cursor_processes()?;
    
    // 等待进程完全关闭
    let mut attempts = 0;
    while process_manager.is_cursor_running() && attempts < 10 {
        std::thread::sleep(std::time::Duration::from_millis(500));
        attempts += 1;
    }
    
    // 检查是否成功关闭
    if process_manager.is_cursor_running() {
        return Err("无法完全关闭Cursor进程".to_string());
    }
    
    Ok(true)
}

/// 启动 Cursor 应用
#[tauri::command]
pub async fn launch_cursor() -> Result<bool, String> {
    let paths = AppPaths::new()?;
    
    // 启动Cursor
    paths.launch_cursor()?;
    
    Ok(true)
}

/// 重置设备标识符
#[tauri::command]
pub async fn reset_machine_id(
    client: State<'_, ApiClient>,
    force_kill: bool,
    machine_id: Option<String>
) -> Result<bool, String> {
    let process_manager = ProcessManager::new();
    
    // 检查Cursor进程
    if !force_kill && process_manager.is_cursor_running() {
        return Err("Cursor进程正在运行, 请先关闭Cursor".to_string());
    }

    // 如果force_kill为true, 则强制终止Cursor进程
    if force_kill {
        match process_manager.kill_cursor_processes() {
            Ok(_) => {},
            Err(e) => {
                // 上报错误
                ErrorReporter::report_error(
                    client.clone(),
                    "reset_machine_id",
                    &e,
                    None,
                    Some("low".to_string())
                ).await;
                return Err(e);
            }
        }
    }

    let paths = match AppPaths::new() {
        Ok(p) => p,
        Err(e) => {
            // 上报错误
            ErrorReporter::report_error(
                client.clone(),
                "reset_machine_id",
                &e,
                None,
                Some("low".to_string())
            ).await;
            return Err(e);
        }
    };
    
    let new_ids = if let Some(id) = machine_id {
        // 生成随机 ID
        let mut ids = generate_new_ids();
        // 替换 devDeviceId
        ids.insert("telemetry.devDeviceId".to_string(), id);
        ids
    } else {
        // 否则随机生成
        generate_new_ids()
    };

    // 更新 storage.json
    let mut storage_content = if paths.storage.exists() {
        let content = match fs::read_to_string(&paths.storage) {
            Ok(c) => c,
            Err(e) => {
                let err = format!("读取 storage.json 失败: {}", e);
                ErrorReporter::report_error(
                    client.clone(),
                    "reset_machine_id",
                    &err,
                    None,
                    Some("low".to_string())
                ).await;
                return Err(err);
            }
        };
        
        match serde_json::from_str(&content) {
            Ok(c) => c,
            Err(e) => {
                let err = format!("解析 storage.json 失败: {}", e);
                ErrorReporter::report_error(
                    client.clone(),
                    "reset_machine_id",
                    &err,
                    None,
                    Some("low".to_string())
                ).await;
                return Err(err);
            }
        }
    } else {
        json!({})
    };

    if let Value::Object(ref mut map) = storage_content {
        map.insert("telemetry.devDeviceId".to_string(), Value::String(new_ids.get("telemetry.devDeviceId").unwrap().clone()));
        map.insert("telemetry.macMachineId".to_string(), Value::String(new_ids.get("telemetry.macMachineId").unwrap().clone()));
        map.insert("telemetry.machineId".to_string(), Value::String(new_ids.get("telemetry.machineId").unwrap().clone()));
        map.insert("telemetry.sqmId".to_string(), Value::String(new_ids.get("telemetry.sqmId").unwrap().clone()));
    }

    // 使用 safe_write 代替 fs::write
    let storage_content_str = match serde_json::to_string_pretty(&storage_content) {
        Ok(s) => s,
        Err(e) => {
            let err = format!("序列化 storage.json 失败: {}", e);
            ErrorReporter::report_error(
                client.clone(),
                "reset_machine_id",
                &err,
                None,
                Some("low".to_string())
            ).await;
            return Err(err);
        }
    };
    
    if let Err(e) = safe_write(&paths.storage, &storage_content_str) {
        let err = format!("写入 storage.json 失败: {}", e);
        ErrorReporter::report_error(
            client.clone(),
            "reset_machine_id",
            &err,
            None,
            Some("low".to_string())
        ).await;
        return Err(err);
    }

    // 更新数据库
    if paths.db.exists() {
        let updates = vec![
            ("device_id", new_ids.get("telemetry.devDeviceId").unwrap()),
            ("mac_id", new_ids.get("telemetry.macMachineId").unwrap()),
            ("machineId", new_ids.get("telemetry.machineId").unwrap()),
            ("sqm_id", new_ids.get("telemetry.sqmId").unwrap())
        ];
        
        if let Err(e) = update_database(&paths.db, &updates) {
            ErrorReporter::report_error(
                client.clone(),
                "reset_machine_id",
                &e,
                None,
                Some("low".to_string())
            ).await;
            return Err(e);
        }
    }

    // 移除自动启动Cursor的代码
    Ok(true)
}

/// 切换用户账号
#[tauri::command]
pub async fn switch_account(
    email: String,
    token: String,
    force_kill: bool,
    db: tauri::State<'_, crate::database::Database>
) -> Result<bool, String> {
    let process_manager = ProcessManager::new();
    
    // 检查Cursor进程
    if !force_kill && process_manager.is_cursor_running() {
        return Err("Cursor进程正在运行, 请先关闭Cursor".to_string());
    }

    // 如果force_kill为true, 则强制终止Cursor进程
    if force_kill {
        process_manager.kill_cursor_processes()?;
    }

    let paths = AppPaths::new()?;

    let account_updates = vec![
        ("cursor.email", email.clone()),
        ("cursor.accessToken", token.clone()),
        ("cursorAuth/refreshToken", token.clone()),
        ("cursorAuth/accessToken", token.clone()),
        ("cursorAuth/cachedEmail", email.clone()),
    ];

    update_database(&paths.db, &account_updates)?;

    // 获取机器码
    let mut result = json!({
        "machineId": "",
        "currentAccount": ""
    });

    if paths.db.exists() {
        if let Ok(conn) = Connection::open(&paths.db) {
            // 读取机器码
            if let Ok(mut stmt) = conn.prepare("SELECT value FROM ItemTable WHERE key = 'telemetry.devDeviceId'") {
                if let Ok(mut rows) = stmt.query([]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let Ok(device_id) = row.get::<_, String>(0) {
                            result["machineId"] = json!(device_id);
                        }
                    }
                }
            }
        }
    }

    let machine_id = result["machineId"].as_str().unwrap_or_default().to_string();

    // 保存到历史记录
    if let Err(e) = crate::api::interceptor::save_cursor_token_to_history(
        &db, 
        &email, 
        &token,
        &machine_id
    ).await {
        eprintln!("保存Cursor token到历史记录失败: {}", e);
    }

    // 等待一段时间确保数据库更新完成
    std::thread::sleep(std::time::Duration::from_millis(500));

    Ok(true)
}

/// 获取设备标识符和当前账号信息
#[tauri::command]
pub fn get_machine_ids() -> Result<Value, String> {
    let paths = AppPaths::new()?;
    let mut result = json!({
        "machineId": "",
        "currentAccount": ""
    });

    // 从数据库读取机器码和 Cursor 邮箱
    if paths.db.exists() {
        if let Ok(conn) = Connection::open(&paths.db) {
            // 读取机器码
            if let Ok(mut stmt) = conn.prepare("SELECT value FROM ItemTable WHERE key = 'telemetry.devDeviceId'") {
                if let Ok(mut rows) = stmt.query([]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let Ok(device_id) = row.get::<_, String>(0) {
                            result["machineId"] = json!(device_id);
                        }
                    }
                }
            }

            // 读取 Cursor 邮箱
            if let Ok(mut stmt) = conn.prepare("SELECT value FROM ItemTable WHERE key = 'cursorAuth/cachedEmail'") {
                if let Ok(mut rows) = stmt.query([]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let Ok(email) = row.get::<_, String>(0) {
                            result["currentAccount"] = json!(email);
                        }
                    }
                }
            }

            // 读取cursor token
            if let Ok(mut stmt) = conn.prepare("SELECT value FROM ItemTable WHERE key = 'cursorAuth/refreshToken'") {
                if let Ok(mut rows) = stmt.query([]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let Ok(token) = row.get::<_, String>(0) {
                            result["cursorToken"] = json!(token);
                        }
                    }
                }
            }
        }
    }

    Ok(result)
}

/// 检查 Cursor 进程状态
#[tauri::command]
pub fn check_cursor_running() -> Result<bool, String> {
    let process_manager = ProcessManager::new();
    Ok(process_manager.is_cursor_running())
}

/// 检查管理员权限
#[tauri::command]
pub fn check_admin_privileges() -> Result<bool, String> {
    crate::utils::check_admin_privileges()
}

/// 请求管理员权限
#[tauri::command]
pub fn request_admin_privileges(exe_path: String) -> Result<bool, String> {
    crate::utils::privileges::request_admin_privileges(&exe_path)
}

/// 更新数据库键值对
fn update_database(db_path: &std::path::Path, updates: &[(impl AsRef<str>, impl AsRef<str>)]) -> Result<(), String> {
    let conn = Connection::open(db_path)
        .map_err(|e| format!("打开数据库失败: {}", e))?;

    for (key, value) in updates {
        let key = match key.as_ref() {
            "device_id" => "telemetry.devDeviceId",
            "mac_id" => "telemetry.macMachineId",
            "machineId" => "telemetry.machineId",
            "sqm_id" => "telemetry.sqmId",
            _ => key.as_ref(),
        };

        // 先尝试更新已存在的记录
        let result = conn.execute(
            "UPDATE ItemTable SET value = ?1 WHERE key = ?2",
            [value.as_ref(), key]
        );

        // 如果记录不存在（没有更新任何行）, 则插入新记录
        if let Ok(0) = result {
            conn.execute(
                "INSERT INTO ItemTable (key, value) VALUES (?1, ?2)",
                [key, value.as_ref()]
            ).map_err(|e| format!("插入数据失败: {}", e))?;
        } else {
            result.map_err(|e| format!("更新数据失败: {}", e))?;
        }
    }

    Ok(())
}

/// 检查 main.js 注入状态
#[tauri::command]
pub async fn is_hook() -> Result<bool, String> {
    let paths = AppPaths::new()?;
    let content = fs::read_to_string(&paths.main_js)
        .map_err(|e| format!("读取 main.js 失败: {}", e))?;

    // 检查正则匹配
    let machine_id_matches = Hook::machine_id_regex().find_iter(&content).count();
    let mac_machine_id_matches = Hook::mac_machine_id_regex().find_iter(&content).count();

    // 如果找不到匹配，说明已经被 hook 了
    if machine_id_matches == 0 || mac_machine_id_matches == 0 {
        return Ok(true);
    }

    Ok(false)
}

/// 注入 main.js 文件
#[tauri::command]
pub async fn hook_main_js(
    client: State<'_, ApiClient>,
    force_kill: bool
) -> Result<(), String> {
    let process_manager = ProcessManager::new();
    
    // 检查 Cursor 进程
    if !force_kill && process_manager.is_cursor_running() {
        return Err("Cursor进程正在运行, 请先关闭Cursor".to_string());
    }

    // 如果 force_kill 为 true, 则强制终止 Cursor 进程
    if force_kill {
        match process_manager.kill_cursor_processes() {
            Ok(_) => {},
            Err(e) => {
                // 上报错误
                ErrorReporter::report_error(
                    client.clone(),
                    "hook_main_js",
                    &e,
                    None,
                    Some("medium".to_string())
                ).await;
                return Err(e);
            }
        }
    }

    // 执行 hook 操作，传递 client 用于错误上报
    Hook::update_main_js_content(Some(client)).await
}

/// 恢复 main.js 原始内容
#[tauri::command]
pub async fn restore_hook(
    client: State<'_, ApiClient>,
    force_kill: bool
) -> Result<(), String> {
    let process_manager = ProcessManager::new();
    
    // 检查 Cursor 进程
    if !force_kill && process_manager.is_cursor_running() {
        return Err("Cursor进程正在运行, 请先关闭Cursor".to_string());
    }

    // 如果 force_kill 为 true, 则强制终止 Cursor 进程
    if force_kill {
        match process_manager.kill_cursor_processes() {
            Ok(_) => {},
            Err(e) => {
                // 上报错误
                ErrorReporter::report_error(
                    client.clone(),
                    "restore_hook",
                    &e,
                    None,
                    Some("medium".to_string())
                ).await;
                return Err(e);
            }
        }
    }

    // 执行恢复操作，传递 client 用于错误上报
    Hook::restore_from_backup(Some(client)).await
}

/// 检查操作系统是否为 Windows
#[tauri::command]
pub fn check_is_windows() -> bool {
    crate::utils::privileges::is_windows()
}