import { XIcon, Minus } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'

type WindowEventType = 'minimize' | 'close'

// Titlebar component
export default function TitleBarComponent() {

    // Manejo de la ventana de la aplicación para minimizar y cerrar la ventana.
    const appWindow = getCurrentWindow();

    function WindowManager(type: WindowEventType) {
        type === 'minimize' ? appWindow.minimize() : appWindow.close()
    }

    return (
        <nav className='flex flex-row justify-between items-center absolute top-0 left-0 z-999 w-full py-2 px-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 select-none drag-region'>

            <h1>Remote Mic</h1>

            <div className='flex gap-2 z-50 no-drag-region'>
                <button className='text-white text-base py-1 px-1 cursor-pointer pointer-events-auto' onClick={() => WindowManager('minimize')}><Minus /></button>
                <button className='text-white text-base py-1 px-1 cursor-pointer pointer-events-auto' onClick={() => WindowManager('close')}><XIcon /></button>
            </div>

      </nav>
    )
}