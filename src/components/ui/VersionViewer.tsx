import { getVersion } from '@tauri-apps/api/app'
import { GitCompareArrowsIcon } from 'lucide-react'

// Numero de versión de la aplicación:
const version = await getVersion()

// Componente de retorno de versión:
export default function VersionViewer() {
    return <p className='w-screen fixed left-0 bottom-0 py-2.5 px-3.5 flex flex-row items-center justify-center gap-1.5 text-gray-600 select-none'><GitCompareArrowsIcon /> Version {version}</p>
}