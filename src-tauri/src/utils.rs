use std::process::Command;

/// Agrega la regla en el Firewall de Windows si no existe o la actualiza para el ejecutable actual.
pub fn ensure_firewall_rule() {
    #[cfg(target_os = "windows")]
    {
        if let Ok(exe_path) = std::env::current_exe() {
            let exe_str = exe_path.to_string_lossy();

            // Comando PowerShell para crear o reemplazar la regla apuntando al ejecutable dinámicamente
            let script = format!(
                "Remove-NetFirewallRule -DisplayName 'Remote Mic Server' -ErrorAction SilentlyContinue; " +
                "New-NetFirewallRule -DisplayName 'Remote Mic Server' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Program '{}' -Profile Any",
                exe_str
            );

            let _ = Command::new("powershell")
                .args(["-NoProfile", "-Command", &script])
                .output();
        }
    }
}