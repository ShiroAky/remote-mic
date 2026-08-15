import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast, removeToastGlobal } from '../components/ui/Toaster';

/**
 * Función para comprobar y aplicar actualizaciones de la aplicación.
 * @param manualIfNoUpdate Si es true, muestra un toast cuando no hay actualizaciones disponibles.
 */
export const checkForUpdates = async (manualIfNoUpdate = false) => {
  try {
    const update = await check();

    if (update) {
      console.log(`Nueva versión encontrada: ${update.version}`);
      console.log(`Notas del parche:\n ${update.body}`);

      const updateMessage = update.body 
        ? `Novedades v${update.version}:\n${update.body}` 
        : `La versión ${update.version} ya está disponible para instalar.`;

      // Mostrar toast interactivo pidiendo confirmación
      toast(updateMessage, {
        type: "info",
        title: `Actualización v${update.version}`,
        actions: [
          {
            label: "Luego",
            variant: "secondary",
            onClick: () => {
              console.log("El usuario pospuso la actualización.");
            },
          },
          {
            label: "Actualizar ahora",
            variant: "primary",
            onClick: async () => {
              const loadingToastId = toast(
                "Descargando e instalando actualización...", 
                "loading"
              );

              try {
                // Descarga e instala el binario
                await update.downloadAndInstall();
                removeToastGlobal(loadingToastId);
                
                toast("Actualización lista. Reiniciando aplicación...", "success", 3000);
                
                // Reinicia la app para aplicar la nueva versión
                await relaunch();
              } catch (err) {
                removeToastGlobal(loadingToastId);
                console.error("Error durante la instalación:", err);
                toast("Error al instalar la actualización.", "error", 4000);
              }
            },
          },
        ],
      });
    } else {
      if (manualIfNoUpdate) {
        toast("Ya estás en la versión más reciente.", "success", 4000);
      }
    }
  } catch (error) {
    console.error("Error al comprobar actualizaciones:", error);
    if (manualIfNoUpdate) {
      toast("Error al comprobar actualizaciones.", "error", 4000);
    }
  }
};