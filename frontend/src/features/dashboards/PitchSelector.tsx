interface Props {
  selected: string[]
  onSelect: (position: string[]) => void
}

const positions = [
  { id: 'ST', label: 'ST', x: 20, y: 50 },
  { id: 'LW', label: 'LW', x: 30, y: 18 },
  { id: 'RW', label: 'RW', x: 30, y: 82 },
  { id: 'AM', label: 'AM', x: 40, y: 50 },
  { id: 'MC', label: 'MC', x: 60, y: 50 },
  { id: 'DM', label: 'DM', x: 80, y: 50 },
  { id: 'ML', label: 'ML', x: 60, y: 15 },
  { id: 'MR', label: 'MR', x: 60, y: 85 },
  { id: 'DL', label: 'DL', x: 95, y: 15 },
  { id: 'DC', label: 'DC', x: 102, y: 38 },
  { id: 'DC', label: 'DC', x: 102, y: 62 },
  { id: 'DR', label: 'DR', x: 95, y: 85 },
  { id: 'GK', label: 'GK', x: 123, y: 50 },
]

export default function PitchSelector({ selected, onSelect }: Props) {
  return (
    <div className="w-full flex items-center justify-center my-1">
      <div className="relative w-full max-w-[320px] mx-auto" style={{ aspectRatio: '130 / 100' }}>
        <svg
          viewBox="0 0 130 100"
          className="absolute inset-0 w-full h-full"
          style={{ fill: 'none', stroke: 'var(--color-surface-500)', strokeWidth: 0.5 }}
        >
        {/* Pitch outline */}
        <rect x="2" y="2" width="126" height="96" rx="2" />
        {/* Center line */}
        <line x1="65" y1="2" x2="65" y2="98" />
        {/* Center circle */}
        <circle cx="65" cy="50" r="12" />
        <circle cx="65" cy="50" r="1" style={{ fill: 'var(--color-surface-500)' }} />
        {/* Penalty boxes */}
        <rect x="2" y="20" width="22" height="60" />
        <rect x="106" y="20" width="22" height="60" />
        {/* Goal boxes */}
        <rect x="2" y="32" width="10" height="36" />
        <rect x="118" y="32" width="10" height="36" />
        {/* Penalty spots */}
        <circle cx="17" cy="50" r="0.8" style={{ fill: 'var(--color-surface-500)' }} />
        <circle cx="113" cy="50" r="0.8" style={{ fill: 'var(--color-surface-500)' }} />
      </svg>

      {/* Position dots */}
      {positions.map((pos, i) => {
        const isSelected = selected.includes(pos.id) || selected.includes(pos.label)
        return (
          <button
            key={`${pos.label}-${i}`}
            onClick={() => {
              const next = isSelected 
                ? selected.filter(x => x !== pos.id && x !== pos.label)
                : [...selected, pos.id]
              onSelect(next)
            }}
            className="absolute flex flex-col items-center gap-0.5 transition-all duration-200"
            style={{
              left: `${(pos.x / 130) * 100}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            <div
              className="rounded-full transition-all duration-200 flex items-center justify-center"
              style={{
                width: isSelected ? 26 : 20,
                height: isSelected ? 26 : 20,
                background: isSelected ? 'var(--color-accent-primary)' : 'var(--color-surface-600)',
                border: `2px solid ${isSelected ? 'var(--color-accent-hover)' : 'var(--color-surface-400)'}`,
                boxShadow: isSelected ? '0 0 12px var(--color-accent-glow)' : 'none',
              }}
            >
              <span className="text-[8px] font-semibold" style={{
                color: isSelected ? 'white' : 'var(--color-text-muted)',
              }}>
                {pos.label}
              </span>
            </div>
          </button>
        )
      })}
    </div>
    </div>
  )
}
