use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::net::TcpListener;
use local_ip_address::local_ip;
use futures_util::{SinkExt, StreamExt};

#[tauri::command]
pub fn get_local_ip() -> Result<String, String> {
    local_ip()
        .map(|ip| ip.to_string())
        .map_err(|e| format!("No se pudo detectar la IP local: {}", e))
}

#[tauri::command]
pub async fn start_signaling_server(_app_handle: tauri::AppHandle) -> Result<String, String> {
    let my_ip = local_ip()
        .map(|ip| ip.to_string())
        .map_err(|e| format!("Error al obtener la IP local para el servidor: {}", e))?;

    let (tx, _rx) = broadcast::channel(16);
    let tx = Arc::new(tx);

    let bind_addr = "0.0.0.0:8080";
    let listener = TcpListener::bind(&bind_addr)
        .await
        .map_err(|e| format!("No se pudo iniciar el servidor en {}: {}", bind_addr, e))?;

    println!("Servidor WebSocket listo en ws://{}:8080", my_ip);

    tauri::async_runtime::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            let tx = tx.clone();
            let mut rx = tx.subscribe();

            let ws_stream = tokio_tungstenite::accept_async(stream)
                .await
                .expect("Error al aceptar handshake WS");
            let (mut write, mut read) = ws_stream.split();

            tokio::spawn(async move {
                while let Some(msg) = read.next().await {
                    if let Ok(msg) = msg {
                        let _ = tx.send(msg);
                    }
                }
            });

            tokio::spawn(async move {
                while let Ok(msg) = rx.recv().await {
                    let _ = write.send(msg).await;
                }
            });
        }
    });

    Ok(format!("{}:8080", my_ip))
}