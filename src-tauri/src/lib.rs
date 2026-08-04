mod network;
mod vbcable;

#[tauri::command]
fn get_device_type() -> &'static str {
    if cfg!(mobile) {
        "mobile"
    } else {
        "desktop"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_websocket::init());

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .invoke_handler(tauri::generate_handler![
            network::get_local_ip,
            network::start_signaling_server,
            vbcable::check_vbcable_powershell,
            vbcable::install_virtual_cable,
            get_device_type
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}