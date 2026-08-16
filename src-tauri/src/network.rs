use tauri::State;
use std::sync::Mutex;
use std::process::Command;
use tokio::sync::broadcast;
use tokio::net::TcpListener;
use local_ip_address::local_ip;
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};

// Estado global para almacenar el canal de apagado del servidor
pub struct AppState {
    pub shutdown_tx: Mutex<Option<broadcast::Sender<()>>>,
}

#[tauri::command]
pub fn get_local_ip() -> Result<String, String> {
    local_ip()
        .map(|ip| ip.to_string())
        .map_err(|e| format!("No se pudo detectar la IP local: {}", e))
}

pub fn ensure_firewall_rule() {
    #[cfg(target_os = "windows")]
    {
        if let Ok(exe_path) = std::env::current_exe() {
            let exe_str = exe_path.to_string_lossy();

            // Comando PowerShell para crear o reemplazar la regla apuntando al ejecutable dinámicamente
            let script = format!(
                "Remove-NetFirewallRule -DisplayName 'Remote Mic Server' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'Remote Mic Server' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Program '{}' -Profile Any",
                exe_str
            );

            let _ = Command::new("powershell")
                .args(["-NoProfile", "-Command", &script])
                .output();
        }
    }
}

#[tauri::command]
pub async fn start_signaling_server(
    _app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {

    // Reglas de firewall para evitar inconvenientes de red:
    ensure_firewall_rule();

    let my_ip = local_ip()
        .map(|ip| ip.to_string())
        .map_err(|e| format!("Error al obtener la IP local para el servidor: {}", e))?;

    let (tx_ws, _) = broadcast::channel::<tokio_tungstenite::tungstenite::Message>(100);
    let (tx_shutdown, mut rx_shutdown) = broadcast::channel::<()>(1);

    {
        let mut lock = state.shutdown_tx.lock().map_err(|e| e.to_string())?;
        *lock = Some(tx_shutdown.clone());
    }

    let bind_addr = "0.0.0.0:8080";
    let listener = TcpListener::bind(&bind_addr)
        .await
        .map_err(|e| format!("No se pudo iniciar el servidor en {}: {}", bind_addr, e))?;

    println!("Servidor WebSocket listo en ws://{}:8080", my_ip);

    tauri::async_runtime::spawn(async move {
        loop {
            tokio::select! {
                res = listener.accept() => {
                    match res {
                        Ok((stream, addr)) => {
                            let tx_ws = tx_ws.clone();
                            let mut rx_ws = tx_ws.subscribe();
                            let mut rx_close = tx_shutdown.subscribe();

                            tauri::async_runtime::spawn(async move {
                                let ws_stream = match tokio_tungstenite::accept_hdr_async(
                                    stream,
                                    |_req: &Request, response: Response| Ok(response),
                                ).await {
                                    Ok(ws) => ws,
                                    Err(e) => {
                                        eprintln!("❌ Handshake WS fallido desde {}: {:?}", addr, e);
                                        return;
                                    }
                                };

                                println!("✅ Cliente conectado desde: {}", addr);

                                let (mut write, mut read) = ws_stream.split();

                                loop {
                                    tokio::select! {
                                        // Leer mensajes entrantes del cliente
                                        msg = read.next() => {
                                            match msg {
                                                Some(Ok(msg)) => {
                                                    // Evitar retransmitir Pings/Pongs/Closes manualmente
                                                    if msg.is_text() || msg.is_binary() {
                                                        let _ = tx_ws.send(msg);
                                                    }
                                                }
                                                _ => {
                                                    println!("🔌 Cliente desconectado: {}", addr);
                                                    break;
                                                }
                                            }
                                        }
                                        // Recibir mensajes del broadcast y enviarlos al cliente
                                        msg = rx_ws.recv() => {
                                            if let Ok(msg) = msg {
                                                if write.send(msg).await.is_err() {
                                                    break;
                                                }
                                            }
                                        }
                                        // Cerrar socket si se apaga el servidor
                                        _ = rx_close.recv() => {
                                            let _ = write.close().await;
                                            break;
                                        }
                                    }
                                }
                            });
                        }
                        Err(e) => eprintln!("Error TCP: {}", e),
                    }
                }
                _ = rx_shutdown.recv() => {
                    println!("Servidor WebSocket detenido.");
                    break;
                }
            }
        }
    });

    Ok(format!("{}:8080", my_ip))
}

#[tauri::command]
pub async fn stop_signaling_server(state: State<'_, AppState>) -> Result<(), String> {
    let mut lock = state.shutdown_tx.lock().map_err(|e| e.to_string())?;

    if let Some(tx) = lock.take() {
        let _ = tx.send(());
        Ok(())
    } else {
        Err("El servidor de señalización no está en ejecución".into())
    }
}