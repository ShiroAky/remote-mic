import type { MouseEventHandler } from 'react'
import { Power, MicOff } from 'lucide-react'

export default function StartServerComponent({ startServerHandler }: { startServerHandler: MouseEventHandler }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">

          <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-mono"><MicOff /></div>

          <div>
            <h3 className="text-base font-semibold text-zinc-100">Servidor Apagado</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Inicia el servidor local para generar la IP que ingresarás en la app móvil.
            </p>
          </div>

          <button
            onClick={startServerHandler}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 mx-auto">
            <Power /> Iniciar Servidor
          </button>

        </div>
    )
}