import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useReportStore, DroppedItem } from '../../store/reportStore'

import ReportPlayerCard from './components/ReportPlayerCard'
import ReportRadarChart from './components/ReportRadarChart'
import ReportTextBlock from './components/ReportTextBlock'

function SortableItem({ item, playerId }: { item: DroppedItem, playerId: number | null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const removeItem = useReportStore(s => s.removeItem)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  }

  const renderComponent = () => {
    switch (item.type) {
      case 'PlayerCard':
        return playerId ? <ReportPlayerCard playerId={playerId} /> : <div className="p-4 border border-dashed rounded text-center">Please select a player first</div>
      case 'RadarChart':
        return playerId ? <ReportRadarChart playerId={playerId} /> : <div className="p-4 border border-dashed rounded text-center">Please select a player first</div>
      case 'TextBlock':
        return <ReportTextBlock id={item.id} content={item.content || ''} />
      default:
        return <div className="p-4 border border-dashed rounded text-center">{item.type} Placeholder</div>
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group mb-4 print:mb-2 print:page-break-inside-avoid">
      {renderComponent()}
      
      {/* Controls (hidden on print) */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
        <button
          {...attributes}
          {...listeners}
          className="p-1 bg-[var(--color-surface-700)] rounded hover:bg-[var(--color-surface-600)] text-xs cursor-grab"
        >
          ↕️
        </button>
        <button
          onClick={() => removeItem(item.id)}
          className="p-1 bg-red-900/80 rounded hover:bg-red-800 text-xs text-white"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default function DroppableCanvas() {
  const { isOver, setNodeRef } = useDroppable({ id: 'canvas' })
  const { items, playerId } = useReportStore()

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-lg flex flex-col mx-auto bg-[var(--color-surface-900)] print:bg-white print:m-0 print:p-0 transition-colors ${
        isOver ? 'ring-2 ring-[var(--color-accent-primary)] bg-[var(--color-surface-800)]' : ''
      }`}
      style={{
        width: '595px',
        minHeight: '842px', // A4 aspect
        maxWidth: '100%',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
      }}
    >
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white !important; }
        }
      `}</style>
      
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--color-text-muted)] print:hidden">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-sm font-medium">Drop components here</p>
          <p className="text-xs mt-1">A4 canvas (595 × 842px)</p>
        </div>
      ) : (
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableItem key={item.id} item={item} playerId={playerId} />
          ))}
        </SortableContext>
      )}
    </div>
  )
}
