import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useReportStore, ComponentType } from '../../store/reportStore'

import DraggablePaletteItem from './DraggablePaletteItem'
import PlayerAutocomplete from './components/PlayerAutocomplete'
import DroppableCanvas from './DroppableCanvas'

const PALETTE_ITEMS: { type: ComponentType, icon: string, label: string, desc: string }[] = [
  { type: 'PlayerCard', icon: '👤', label: 'Player Card', desc: 'Photo, name, team, position' },
  { type: 'RadarChart', icon: '📊', label: 'Radar Chart', desc: 'Percentile radar comparison' },
  { type: 'ScatterPlot', icon: '📈', label: 'Scatter Plot', desc: 'Goals vs xG league comparison' },
  { type: 'StatsTable', icon: '📋', label: 'Stats Table', desc: 'Key season statistics grid' },
  { type: 'PitchMap', icon: '🔥', label: 'Heatmap', desc: 'Player positional heatmap' },
  { type: 'TextBlock', icon: '📝', label: 'Text Block', desc: 'Custom text or notes' },
]

export default function ReportBuilderPage() {
  const { playerId, setPlayerId, addItem, moveItem, items, orientation, setOrientation } = useReportStore()
  const [activeDragType, setActiveDragType] = useState<ComponentType | null>(null)

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
      if (type) addItem(type)
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
        <div className="flex justify-between items-center print:hidden relative">
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Report Builder</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Drag & drop components to build PDF scouting reports
            </p>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2">
            {/* Orientation Toggle */}
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

          <div className="flex gap-4 items-center flex-1 justify-end">
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
