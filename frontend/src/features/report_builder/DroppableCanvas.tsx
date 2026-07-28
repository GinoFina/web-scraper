import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useReportStore, DroppedItem } from '../../store/reportStore'

import ReportPlayerCard from './components/ReportPlayerCard'
import ReportRadarChart from './components/ReportRadarChart'
import ReportTextBlock from './components/ReportTextBlock'
import ReportStatsTable from './components/ReportStatsTable'
import ReportScatterPlot from './components/ReportScatterPlot'
import ReportHeatmap from './components/ReportHeatmap'

function SortableItem({ item, playerId }: { item: DroppedItem, playerId: number | null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const removeItem = useReportStore(s => s.removeItem)
  const resizeItem = useReportStore(s => s.resizeItem)

  const [localWidth, setLocalWidth] = useState<number | null>(null)
  const [localHeight, setLocalHeight] = useState<number | null>(null)
  
  const currentWidth = localWidth !== null ? localWidth : item.width
  const currentHeight = localHeight !== null ? localHeight : item.height
  const isHorizontal = useReportStore(s => s.orientation) === 'Horizontal'
  const canvasMaxW = isHorizontal ? 842 - 48 : 595 - 48 // Minus padding 24px * 2

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault() // Prevent text selection
    
    // Disable global text selection while dragging
    document.body.style.userSelect = 'none'

    const startX = e.clientX
    const startY = e.clientY
    const rect = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect()
    const startWidth = rect?.width || 400
    const startHeight = rect?.height || 300

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      setLocalWidth(Math.min(canvasMaxW, Math.max(250, startWidth + deltaX)))
      setLocalHeight(Math.max(100, startHeight + deltaY))
    }

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      
      // Re-enable text selection
      document.body.style.userSelect = ''
      
      const finalWidth = Math.min(canvasMaxW, Math.max(250, startWidth + (upEvent.clientX - startX)))
      const finalHeight = Math.max(100, startHeight + (upEvent.clientY - startY))
      
      setLocalWidth(null)
      setLocalHeight(null)
      resizeItem(item.id, finalWidth, finalHeight)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
    width: currentWidth ? `${currentWidth}px` : '100%',
    height: currentHeight ? `${currentHeight}px` : 'auto',
    flexGrow: currentWidth ? 0 : 1,
    flexShrink: 0,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  }

  const renderComponent = () => {
    switch (item.type) {
      case 'PlayerCard':
        return playerId ? <ReportPlayerCard playerId={playerId} /> : <div className="p-4 border border-dashed rounded text-center flex-1">Please select a player first</div>
      case 'RadarChart':
        return playerId ? <ReportRadarChart playerId={playerId} /> : <div className="p-4 border border-dashed rounded text-center flex-1">Please select a player first</div>
      case 'ScatterPlot':
        return playerId ? <ReportScatterPlot playerId={playerId} /> : <div className="p-4 border border-dashed rounded text-center flex-1">Please select a player first</div>
      case 'StatsTable':
        return playerId ? <ReportStatsTable playerId={playerId} /> : <div className="p-4 border border-dashed rounded text-center flex-1">Please select a player first</div>
      case 'PitchMap':
        return playerId ? <ReportHeatmap playerId={playerId} /> : <div className="p-4 border border-dashed rounded text-center flex-1">Please select a player first</div>
      case 'TextBlock':
        return <ReportTextBlock id={item.id} content={item.content || ''} />
      default:
        return <div className="p-4 border border-dashed rounded text-center flex-1">{item.type} Placeholder</div>
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, pageBreakInside: 'avoid', breakInside: 'avoid' }}
      className="relative group cursor-grab active:cursor-grabbing hover:ring-2 ring-[var(--color-surface-600)] transition-all rounded-lg"
      {...attributes}
      {...listeners}
    >
      <div className="w-full h-full overflow-hidden flex flex-col rounded-lg">
        {renderComponent()}
      </div>

      {/* Controls (hidden on print) */}
      <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden z-20">
        <button
          onPointerDown={(e) => {
            e.stopPropagation() // prevent drag when clicking delete
            removeItem(item.id)
          }}
          className="p-1.5 bg-[var(--color-surface-800)] rounded-full hover:bg-red-600 text-[var(--color-text-muted)] hover:text-white shadow-lg border border-[var(--color-border)] transition-colors cursor-pointer"
          title="Remove Component"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>

      {/* Resize Handle (hidden on print) */}
      <div
        className="absolute -bottom-2 -right-2 w-4 h-4 bg-[var(--color-accent-primary)] rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity print:hidden z-30 shadow border border-[var(--color-surface-900)]"
        onPointerDown={handleResizeStart}
        title="Drag to resize"
      />
    </div>
  )
}

export default function DroppableCanvas() {
  const { isOver, setNodeRef } = useDroppable({ id: 'canvas' })
  const { items, playerId, orientation } = useReportStore()

  const isLandscape = orientation === 'landscape' || orientation === 'Horizontal'
  const canvasWidth = isLandscape ? '842px' : '595px'
  const canvasMinHeight = isLandscape ? '595px' : '842px'
  const pageOrientation = isLandscape ? 'landscape' : 'portrait'

  return (
    <div
      ref={setNodeRef}
      className={`canvas-container relative rounded-lg flex flex-row flex-wrap content-start gap-4 mx-auto bg-[var(--color-surface-800)] print:m-0 print:p-0 transition-colors ${
        isOver ? 'ring-2 ring-[var(--color-accent-primary)]' : ''
      }`}
      style={{
        width: canvasWidth,
        minHeight: canvasMinHeight,
        maxWidth: '100%',
        padding: '24px',
        boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.5)',
      }}
    >
      <style>{`
        @media print {
          @page { size: A4 ${pageOrientation}; margin: 0; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body { 
            background-color: var(--color-surface-900) !important;
            color: var(--color-text-primary) !important;
          }
          .canvas-container { 
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            width: ${canvasWidth} !important;
            min-height: ${canvasMinHeight} !important;
            max-width: none !important;
          }
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
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          {items.map(item => (
            <SortableItem key={item.id} item={item} playerId={playerId} />
          ))}
        </SortableContext>
      )}
    </div>
  )
}
