import { useCallback, useMemo } from 'react'
import type { RefObject } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { ArrowUpDown, Move, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { useFlightPathPointDrag } from '../../hooks/useFlightPathPointDrag'
import { useAppStore } from '../../store'
import type { FlightPathWithControlPoints } from '../../utils/flightPath'
import type { IdealLineHoverTarget } from '../../utils/idealLine'
import { GateIcon } from '../icons/GateIcon'
import type { FlightPathPointer } from './FlightPath'

interface FlightPathPointControlsProps {
  data: FlightPathWithControlPoints
  hover: IdealLineHoverTarget | null
  pointer: FlightPathPointer | null
  menuOpen: boolean
  controlsRef: RefObject<{ enabled: boolean } | null>
  fpvModeActive: boolean
  onInsertGate: () => void
  onInsertPoint: () => void
}

const CONTROL_CLEARANCE = 0.5
const POINT_BUTTON_CLASSNAME = 'pointer-events-auto relative flex size-8 items-center justify-center rounded-full border text-[10px] font-semibold shadow-md shadow-black/30 backdrop-blur transition-colors select-none touch-none before:absolute before:-inset-2 before:content[""]'
const DRAG_BUTTON_CLASSNAME = 'pointer-events-auto flex size-11 items-center justify-center rounded-full border shadow-lg shadow-black/30 backdrop-blur transition-colors select-none touch-none'
const MENU_BUTTON_CLASSNAME = 'pointer-events-auto flex size-10 items-center justify-center rounded-full border bg-surface-elevated/95 shadow-md shadow-black/30 backdrop-blur transition-colors select-none touch-none hover:bg-surface-hover'

export function FlightPathPointControls({ data, hover, pointer, menuOpen, controlsRef, fpvModeActive, onInsertGate, onInsertPoint }: FlightPathPointControlsProps) {
  const { t } = useTranslation()
  const gl = useThree((state) => state.gl)
  const { activeMode, startHandleDrag, startPressDrag } = useFlightPathPointDrag({ controlsRef, fpvModeActive })
  const selectedPointId = useAppStore((state) => state.selectedFlightPathPointId)
  const selectPoint = useAppStore((state) => state.selectFlightPathPoint)
  const deletePoint = useAppStore((state) => state.deleteFlightPathPoint)
  const selectedPoint = data.idealLinePoints.find((point) => point.id === selectedPointId) ?? null

  const stopHtmlInteraction = useCallback((event: React.PointerEvent | React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }, [])

  const startHandleDragFromEvent = useCallback((
    event: React.PointerEvent,
    point: FlightPathWithControlPoints['idealLinePoints'][number],
    mode: 'move' | 'elevate',
  ) => {
    stopHtmlInteraction(event)
    if (!event.isPrimary || event.button !== 0) return
    startHandleDrag(point, mode, event.pointerId, event.clientX, event.clientY)
  }, [startHandleDrag, stopHtmlInteraction])

  const startPointPressDrag = useCallback((
    event: React.PointerEvent,
    point: FlightPathWithControlPoints['idealLinePoints'][number],
  ) => {
    stopHtmlInteraction(event)
    if (!event.isPrimary || event.button !== 0 || event.nativeEvent.pointerType === 'touch') return
    startPressDrag(point, event.pointerId, event.clientX, event.clientY, { vertical: event.shiftKey })
  }, [startPressDrag, stopHtmlInteraction])

  const selectedHandlePosition = useMemo(() => selectedPoint
    ? [selectedPoint.position.x, selectedPoint.position.y + CONTROL_CLEARANCE, selectedPoint.position.z] as const
    : null, [selectedPoint])

  if (fpvModeActive) return null

  return (
    <>
      {hover && pointer && (
        <Html
          position={[hover.position.x, hover.position.y, hover.position.z]}
          calculatePosition={() => {
            const rect = gl.domElement.getBoundingClientRect()
            return [pointer.x - rect.left, pointer.y - rect.top]
          }}
          zIndexRange={[25, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div data-ideal-line-hover className="relative" style={{ width: 0, height: 0 }}>
            <div
              data-ideal-line-plus
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground shadow-md"
            >
              <Plus size={18} />
            </div>
            {menuOpen && (
              <div
                role="menu"
                aria-label={t('idealLineInsertMenu')}
                className="pointer-events-auto absolute left-0 top-[22px] flex -translate-x-1/2 items-start gap-1.5"
              >
                <button
                  type="button"
                  data-ideal-line-insert-gate
                  role="menuitem"
                  title={t('idealLineInsertGate')}
                  aria-label={t('idealLineInsertGate')}
                  className={`${MENU_BUTTON_CLASSNAME} border-primary/60 text-primary`}
                  onPointerDown={stopHtmlInteraction}
                  onClick={(event) => {
                    stopHtmlInteraction(event)
                    onInsertGate()
                  }}
                >
                  <GateIcon type="standard" className="size-5" />
                </button>
                <button
                  type="button"
                  data-ideal-line-insert-point
                  role="menuitem"
                  title={t('insertFlightPathPoint')}
                  aria-label={t('insertFlightPathPoint')}
                  className={`${MENU_BUTTON_CLASSNAME} border-yellow-300/70`}
                  onPointerDown={stopHtmlInteraction}
                  onClick={(event) => {
                    stopHtmlInteraction(event)
                    onInsertPoint()
                  }}
                >
                  <span className="size-3.5 rounded-full bg-yellow-400 ring-2 ring-yellow-200/70" />
                </button>
              </div>
            )}
            {menuOpen && (
              <span className="absolute left-0 top-[70px] -translate-x-1/2 whitespace-nowrap rounded bg-surface-elevated/95 px-2 py-1 text-xs text-foreground shadow-md">
                {t('idealLineInsertChoiceHint')}
              </span>
            )}
          </div>
        </Html>
      )}

      {data.idealLinePoints.map((point, index) => (
        <Html key={point.id} position={[point.position.x, point.position.y, point.position.z]} center distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pointer-events-auto">
            <button
              type="button"
              data-ideal-line-point={point.id}
              aria-label={t('selectFlightPathPoint', { index: index + 1 })}
              aria-pressed={selectedPointId === point.id}
              className={`${POINT_BUTTON_CLASSNAME} ${selectedPointId === point.id
                ? 'border-yellow-200 bg-yellow-300 ring-2 ring-yellow-200/70'
                : 'border-yellow-300/70 bg-yellow-400 hover:bg-yellow-300'}`}
              onPointerDown={(event) => startPointPressDrag(event, point)}
              onClick={(event) => {
                stopHtmlInteraction(event)
                selectPoint(point.id)
              }}
            />
          </div>
        </Html>
      ))}

      {selectedPoint && selectedHandlePosition && (
        <Html position={selectedHandlePosition} center distanceFactor={8} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              aria-label={t('moveFlightPathPoint')}
              className={`${DRAG_BUTTON_CLASSNAME} ${activeMode === 'move' ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/60 bg-surface-elevated/95 text-primary hover:bg-surface-hover'}`}
              onPointerDown={(event) => startHandleDragFromEvent(event, selectedPoint, 'move')}
              onClick={stopHtmlInteraction}
            >
              <Move size={22} />
            </button>
            <button
              type="button"
              aria-label={t('elevateFlightPathPoint')}
              className={`${DRAG_BUTTON_CLASSNAME} ${activeMode === 'elevate' ? 'border-accent bg-accent text-accent-foreground' : 'border-accent/60 bg-surface-elevated/95 text-accent-foreground hover:bg-surface-hover'}`}
              onPointerDown={(event) => startHandleDragFromEvent(event, selectedPoint, 'elevate')}
              onClick={stopHtmlInteraction}
            >
              <ArrowUpDown size={22} />
            </button>
            <button
              type="button"
              data-ideal-line-delete={selectedPoint.id}
              aria-label={t('delete')}
              className={`${DRAG_BUTTON_CLASSNAME} border-destructive/60 bg-destructive text-destructive-foreground hover:bg-destructive/90`}
              onPointerDown={stopHtmlInteraction}
              onClick={(event) => {
                stopHtmlInteraction(event)
                deletePoint(selectedPoint.id)
              }}
            >
              <Trash2 size={22} />
            </button>
          </div>
        </Html>
      )}
    </>
  )
}
