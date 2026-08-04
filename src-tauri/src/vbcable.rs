use std::env;
use std::fs;
use std::io::Cursor;
use std::process::Command;

/// Comprueba si VB-Cable está presente en los dispositivos de sonido de Windows usando PowerShell.
#[tauri::command]
pub fn check_vbcable_powershell() -> bool {
    if !cfg!(target_os = "windows") {
        return false;
    }

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-CimInstance Win32_SoundDevice | Where-Object { $_.Name -like '*VB-Audio*' }",
        ])
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            !stdout.trim().is_empty()
        }
        Err(_) => false,
    }
}

/// Parsea el HTML de vb-audio.com para obtener la URL dinámica del ZIP.
// fn extract_zip_link(html: &str) -> Option<String> {
//     html.split("href=\"")
//         .find(|s| s.contains("VBCABLE_Driver_Pack45") && s.contains(".zip"))
//         .and_then(|s| s.split('"').next())
//         .map(|link| {
//             if link.starts_with("https") {
//                 link.to_string()
//             } else {
//                 format!("https://vb-audio.com/Cable/{}", link)
//             }
//         })
// }

/// Descarga el ZIP oficial de VB-Cable, lo descomprime en TEMP y lo instala con permisos de Administrador (UAC).
#[tauri::command]
pub async fn install_virtual_cable() -> Result<String, String> {
    let temp_dir = env::temp_dir();
    let extract_dir = temp_dir.join("vbcable_extracted");

    // Enlace directo estático del controlador oficial de VB-Cable
    let download_url = "https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip";

    // 1. Cliente HTTP con User-Agent para evitar bloqueos del servidor
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .build()
        .map_err(|e| format!("Error al crear cliente HTTP: {}", e))?;

    let response = client
        .get(download_url)
        .send()
        .await
        .map_err(|e| format!("Error al conectar con VB-Audio: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "El servidor de VB-Audio respondió con estado HTTP {}",
            response.status()
        ));
    }

    // 2. Obtener bytes completos en memoria
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Error al descargar los datos del ZIP: {}", e))?;

    // Validar firma del archivo ZIP (los archivos ZIP comienzan con los bytes PK\x03\x04)
    if bytes.len() < 4 || &bytes[0..2] != b"PK" {
        return Err("El archivo descargado no es un paquete ZIP válido (posible bloqueo de red).".to_string());
    }

    // 3. Descomprimir desde el buffer de memoria usando Cursor
    let reader = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(reader)
        .map_err(|e| format!("Error al leer estructura del ZIP: {}", e))?;

    // Limpiar directorio anterior si existía
    let _ = fs::remove_dir_all(&extract_dir);
    fs::create_dir_all(&extract_dir)
        .map_err(|e| format!("Error al crear directorio temporal: {}", e))?;

    archive
        .extract(&extract_dir)
        .map_err(|e| format!("Error al descomprimir archivos en disco: {}", e))?;

    // 4. Ejecutar el instalador x64 con elevación UAC en Windows
    let setup_exe = extract_dir.join("VBCABLE_Setup_x64.exe");

    if !setup_exe.exists() {
        return Err("No se encontró VBCABLE_Setup_x64.exe dentro del ZIP descomprimido.".to_string());
    }

    let status = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "Start-Process -FilePath '{}' -ArgumentList '-i','-h' -Verb RunAs -Wait",
                setup_exe.display()
            ),
        ])
        .status()
        .map_err(|e| format!("Error al ejecutar la instalación vía PowerShell: {}", e))?;

    if status.success() {
        Ok("Instalación completada correctamente.".to_string())
    } else {
        Err("La instalación falló o el permiso de Administrador fue cancelado.".to_string())
    }
}