import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useReportStore, ComponentType } from '../../store/reportStore'

import DraggablePaletteItem from './DraggablePaletteItem'
import PlayerAutocomplete from './components/PlayerAutocomplete'
import DroppableCanvas from './DroppableCanvas'
import ComponentConfigModal from './components/ComponentConfigModal'

const PALETTE_ITEMS: { type: ComponentType, icon: string, label: string, desc: string }[] = [
  { type: 'PlayerCard', icon: '👤', label: 'Player Card', desc: 'Photo, Name, Team, Position' },
  { type: 'RadarChart', icon: '📊', label: 'Radar Chart', desc: 'Percentile Radar Comparison' },
  { type: 'ScatterPlot', icon: '📈', label: 'Scatter Plot', desc: 'Stats (X) vs Stats (Y) League Comparison' },
  { type: 'StatsTable', icon: '📋', label: 'Stats Table', desc: 'Key Season Statistics Grid' },
  { type: 'PitchMap', icon: '🔥', label: 'Heatmap', desc: 'Player Positional Heatmap' },
  { type: 'PercentileBars', icon: '📶', label: 'Percentile Bars', desc: 'Metric Percentile Progress' },
  { type: 'HeadToHead', icon: '⚖️', label: 'Head-to-Head', desc: 'Diverging Percentile Comparison' },
  { type: 'ImageBlock', icon: '🖼️', label: 'Image', desc: 'Upload Custom Image' },
  { type: 'TextBlock', icon: '📝', label: 'Text Block', desc: 'Custom Text or Notes' },
]

export default function ReportBuilderPage() {
  const { playerId, setPlayerId, addItem, moveItem, items, orientation, setOrientation, configuringItemId, setConfiguringItem, updateItemConfig } = useReportStore()
  const [activeDragType, setActiveDragType] = useState<ComponentType | null>(null)
  const [pendingAddItem, setPendingAddItem] = useState<{ type: ComponentType } | null>(null)

  // Listen for custom event from DraggablePaletteItem
  useEffect(() => {
    const handleRequestAdd = (e: CustomEvent<ComponentType>) => {
      const type = e.detail
      if (['RadarChart', 'ScatterPlot', 'StatsTable', 'PercentileBars', 'HeadToHead'].includes(type)) {
        setPendingAddItem({ type })
      } else {
        addItem(type)
      }
    }
    window.addEventListener('request-add-item' as any, handleRequestAdd)
    return () => window.removeEventListener('request-add-item' as any, handleRequestAdd)
  }, [addItem])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const handleDragStart = (event: any) => {
    if (event.active.id.toString().startsWith('palette-')) {
      setActiveDragType(event.active.data.current?.type)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragType(null)
    const { active, over } = event

    if (!over) return

    // Dropping a palette item onto the canvas
    if (active.id.toString().startsWith('palette-') && over.id === 'canvas') {
      const type = active.data.current?.type as ComponentType
      if (type) {
        if (['RadarChart', 'ScatterPlot', 'StatsTable', 'PercentileBars', 'HeadToHead'].includes(type)) {
          setPendingAddItem({ type })
        } else {
          addItem(type)
        }
      }
      return
    }

    // Reordering items on the canvas
    if (!active.id.toString().startsWith('palette-') && items.some(i => i.id === over.id)) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        moveItem(oldIndex, newIndex)
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} modifiers={[restrictToWindowEdges]}>
      <div className="h-full flex flex-col gap-5 animate-fade-in print:p-0 print:h-auto print:block">

        {/* Header - Hidden on print */}
        <div className="flex justify-between items-center print:hidden w-full">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Report Builder</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Drag & drop components to build PDF scouting reports
            </p>
          </div>

          {/* Orientation Toggle */}
          <div className="flex justify-center">
            <div className="flex bg-[var(--color-surface-900)] rounded-lg p-1 border border-[var(--color-border)] shadow-inner">
              <button
                onClick={() => setOrientation('Vertical')}
                className={`px-4 py-2 w-28 text-center text-sm font-medium rounded-md transition-all duration-200 ${orientation === 'Vertical' ? 'bg-[var(--color-accent-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-700)]'}`}
              >
                Vertical
              </button>
              <button
                onClick={() => setOrientation('Horizontal')}
                className={`px-4 py-2 w-28 text-center text-sm font-medium rounded-md transition-all duration-200 ${orientation === 'Horizontal' ? 'bg-[var(--color-accent-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-700)]'}`}
              >
                Horizontal
              </button>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Target Player:</label>
              <PlayerAutocomplete playerId={playerId} onChange={setPlayerId} />
            </div>

            <button
              className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
              onClick={() => window.print()}
              disabled={items.length === 0}
            >
              🖨️ Export PDF
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-[280px_1fr] gap-5 min-h-0 print:block print:h-auto">

          {/* Component Palette - Hidden on print */}
          <div className="glass-card p-4 flex flex-col gap-3 overflow-auto print:hidden">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Components
            </h3>
            {PALETTE_ITEMS.map((comp) => (
              <DraggablePaletteItem key={comp.type} {...comp} />
            ))}
          </div>

          {/* A4 Canvas */}
          <div className="overflow-auto print:overflow-visible flex items-start justify-center pb-8 print:pb-0 print:block print:h-auto">
            <DroppableCanvas />
          </div>

        </div>
      </div>

      {configuringItemId && (
        <ComponentConfigModal
          item={items.find(i => i.id === configuringItemId)!}
          onClose={() => setConfiguringItem(null)}
          onSave={(config) => {
            updateItemConfig(configuringItemId, config)
            setConfiguringItem(null)
          }}
        />
      )}

      {pendingAddItem && (
        <ComponentConfigModal
          item={{ type: pendingAddItem.type, config: {} } as any}
          onClose={() => setPendingAddItem(null)}
          onSave={(config) => {
            const newId = addItem(pendingAddItem.type)
            updateItemConfig(newId, config)
            setPendingAddItem(null)
          }}
        />
      )}

      <DragOverlay>
        {activeDragType ? (
          <div className="glass-card-interactive p-3 flex items-start gap-3 opacity-80 cursor-grabbing bg-[var(--color-surface-800)] rounded-lg shadow-xl w-[250px]">
            <span className="text-xl">{PALETTE_ITEMS.find(p => p.type === activeDragType)?.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{PALETTE_ITEMS.find(p => p.type === activeDragType)?.label}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
