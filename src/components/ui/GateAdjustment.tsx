import { useAppStore } from '../../store'
import type { GateType } from '../../types'

const GATE_LABELS: Record<GateType, string> = {
  'standard': 'Standard',
  'h-gate': 'H-Gate',
  'huerdel': 'Hürdel',
  'doppelgate': 'Doppelgate',
  'ladder': 'Ladder',
  'start-finish': 'Start/Ziel',
  'flag': 'Flag',
}

export function GateAdjustment() {
  const currentTrack = useAppStore((state) => state.currentTrack)
  const selectedGateId = useAppStore((state) => state.selectedGateId)
  const rotateGate = useAppStore((state) => state.rotateGate)
  const moveGate = useAppStore((state) => state.moveGate)
  const selectGate = useAppStore((state) => state.selectGate)

  const gate = currentTrack?.gates.find((g) => g.id === selectedGateId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Gate Adjustment</h2>
        {gate && (
          <button
            onClick={() => selectGate(null)}
            className="text-gray-400 hover:text-white text-sm transition-colors focus:outline-none focus:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {!gate ? (
        <div className="text-gray-400 text-sm text-center py-4">
          Click a gate in the 3D scene to adjust it
        </div>
      ) : (
        <>
          {/* Gate Info */}
          <div className="bg-gray-700 rounded p-3 space-y-1">
            <div className="text-sm text-white font-medium">{GATE_LABELS[gate.type]}</div>
            <div className="text-xs text-gray-400">
              Position: ({gate.position.x.toFixed(1)}, {gate.position.y.toFixed(1)}, {gate.position.z.toFixed(1)})
            </div>
            <div className="text-xs text-gray-400">Rotation: {gate.rotation}°</div>
          </div>

          {/* Rotation Controls */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Rotation</h3>
            <div className="flex gap-2">
              <button
                onClick={() => rotateGate(gate.id, false)}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                ↺ -30°
              </button>
              <button
                onClick={() => rotateGate(gate.id, true)}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                ↻ +30°
              </button>
            </div>
          </div>

          {/* Position Controls */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Position</h3>
            <div className="grid grid-cols-3 gap-1 max-w-[120px] mx-auto">
              <div />
              <button
                onClick={() => moveGate(gate.id, 'N')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                N
              </button>
              <div />
              <button
                onClick={() => moveGate(gate.id, 'W')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                W
              </button>
              <div className="flex items-center justify-center text-gray-500 text-xs">1m</div>
              <button
                onClick={() => moveGate(gate.id, 'E')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                E
              </button>
              <div />
              <button
                onClick={() => moveGate(gate.id, 'S')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                S
              </button>
              <div />
            </div>
          </div>
        </>
      )}
    </div>
  )
}