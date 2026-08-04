use futures_util::{SinkExt, StreamExt};
use local_ip_address::local_ip;
use std::sync::{Arc, Mutex};
use tauri::State;
use tokio::net::TcpListener;
use tokio::sync::broadcast;

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

#[tauri::command]
pub async fn start_signaling_server(
    _app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let my_ip = local_ip()
        .map(|ip| ip.to_string())
        .map_err(|e| format!("Error al obtener la IP local para el servidor: {}", e))?;

    // Canal de comunicación para mensajería entre clientes WebSocket
    let (tx_ws, _rx_ws) = broadcast::channel(16);
    let tx_ws = Arc::new(tx_ws);

    // Canal de señalización para detener el servidor
    let (tx_shutdown, mut rx_shutdown) = broadcast::channel::<()>(1);

    // Guardar la señal de apagado en el estado de Tauri
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
                // Acepta nuevas conexiones de clientes
                res = listener.accept() => {
                    match res {
                        Ok((stream, _)) => {
                            let tx_ws = tx_ws.clone();
                            let mut rx_ws = tx_ws.subscribe();
                            let mut rx_close = tx_shutdown.subscribe();

                            let ws_stream = match tokio_tungstenite::accept_async(stream).await {
                                Ok(ws) => ws,
                                Err(e) => {
                                    eprintln!("Error al aceptar handshake WS: {}", e);
                                    continue;
                                }
                            };

                            let (mut write, mut read) = ws_stream.split();

                            // Tarea para leer mensajes del socket y retransmitirlos
                            tokio::spawn(async move {
                                while let Some(msg) = read.next().await {
                                    if let Ok(msg) = msg {
                                        let _ = tx_ws.send(msg);
                                    }
                                }
                            });

                            // Tarea para enviar mensajes al socket o cerrar en shutdown
                            tokio::spawn(async move {
                                loop {
                                    tokio::select! {
                                        Ok(msg) = rx_ws.recv() => {
                                            if write.send(msg).await.is_err() {
                                                break;
                                            }
                                        }
                                        _ = rx_close.recv() => {
                                            let _ = write.close().await;
                                            break;
                                        }
                                    }
                                }
                            });
                        }
                        Err(e) => eprintln!("Error al aceptar conexión TCP: {}", e),
                    }
                }
                // Se detiene el listener principal cuando llega la señal de apagado
                _ = rx_shutdown.recv() => {
                    println!("Servidor WebSocket detenido correctamente.");
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
