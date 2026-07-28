import { useDraggable } from '@dnd-kit/core'
import { ComponentType, useReportStore } from '../../store/reportStore'

interface Props {
  type: ComponentType
  icon: string
  label: string
  desc: string
}

export default function DraggablePaletteItem({ type, icon, label, desc }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type },
  })

  const addItem = useReportStore(s => s.addItem)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => addItem(type)}
      className={`glass-card-interactive p-3 cursor-grab flex items-start gap-3 print:hidden ${
        isDragging ? 'opacity-50 ring-2 ring-[var(--color-accent-primary)]' : ''
      }`}
    >
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
      </div>
    </div>
  )
}
