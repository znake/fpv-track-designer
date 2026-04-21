import { useAppStore } from '../../store'
import type { GateType } from '../../types'

const GATE_TYPES: { type: GateType; label: string }[] = [
  { type: 'start-finish', label: 'Start/Ziel Gate' },
  { type: 'standard', label: 'Standard Gate' },
  { type: 'h-gate', label: 'H-Gate' },
  { type: 'huerdel', label: 'Hürdel' },
  { type: 'doppelgate', label: 'Doppelgate' },
  { type: 'ladder', label: 'Ladder' },
  { type: 'flag', label: 'Flag' },
]

export function GateConfigPanel() {
  const config = useAppStore((state) => state.config)
  const setGateQuantity = useAppStore((state) => state.setGateQuantity)
  const setFieldSize = useAppStore((state) => state.setFieldSize)
  const setGateSize = useAppStore((state) => state.setGateSize)
  const resetToDefault = useAppStore((state) => state.resetToDefault)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Gate Configuration</h2>
      
      {/* Gate Quantities */}
      <div className="space-y-2">
        {GATE_TYPES.map(({ type, label }) => (
          <div key={type} className="flex items-center justify-between">
            <label className="text-sm text-gray-300">{label}</label>
            <input
              type="number"
              min="0"
              value={config.gateQuantities[type]}
              onChange={(e) => setGateQuantity(type, Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-center transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        ))}
      </div>

      {/* Field Size */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Field Size (m)</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-400">Width</label>
            <input
              type="number"
              min="10"
              value={config.fieldSize.width}
              onChange={(e) => setFieldSize(Math.max(10, parseInt(e.target.value) || 10), config.fieldSize.height)}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400">Height</label>
            <input
              type="number"
              min="10"
              value={config.fieldSize.height}
              onChange={(e) => setFieldSize(config.fieldSize.width, Math.max(10, parseInt(e.target.value) || 10))}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Gate Size */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Gate Size</h3>
        <div className="flex gap-1">
          {([0.75, 1, 1.5] as const).map((size) => (
            <button
              key={size}
              onClick={() => setGateSize(size)}
              className={`flex-1 px-2 py-1 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                config.gateSize === size
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {size === 0.75 ? '75cm' : size === 1 ? '1m' : '1.5m'}
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetToDefault}
        className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        Reset to Default
      </button>
    </div>
  )
}
