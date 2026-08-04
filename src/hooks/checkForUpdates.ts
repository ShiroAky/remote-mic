import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from '../components/ui/Toaster';

/**
 * Función para comprobar y aplicar actualizaciones de la aplicación.
 * @param manualIfNoUpdate Si es true (e.g. cuando el usuario presiona un botón), muestra un toast notificando que ya está actualizado.
 */
export const checkForUpdates = async (manualIfNoUpdate = false) => {
  try {
    const update = await check();

    if (update) {
      console.log(`Nueva versión encontrada: ${update.version}`);
      console.log(`Notas del parche:\n ${update.body}`);

      // Notificar en la interfaz
      toast(`Nueva versión ${update.version} disponible`, 'info', 6000);

      // Confirmar con el usuario
      const confirm = window.confirm(
        `Nueva versión ${update.version} disponible.\n\n` +
        `Novedades:\n${update.body || 'Sin notas de versión.'}\n\n` +
        `¿Deseas descargar e instalar la actualización ahora?`
      );

      if (confirm) {
        toast('Descargando e instalando actualización...', 'loading', 15000);
        
        // Descarga e instala el binario
        await update.downloadAndInstall();
        
        toast('Actualización lista. Reiniciando aplicación...', 'success', 3000);
        
        // Reinicia la app para aplicar la nueva versión
        await relaunch();
      }
    } else {
      console.log('La aplicación ya está actualizada.');

      toast('Prueba realizada perfectamente', 'info', 10000)
      
      if (manualIfNoUpdate) {
        toast('Ya estás en la versión más reciente.', 'success', 4000);
      }
    }
  } catch (error) {
    console.error('Error al comprobar actualizaciones:', error);
    if (manualIfNoUpdate) {
      toast('Error al comprobar actualizaciones.', 'error', 4000);
    }
  }
};