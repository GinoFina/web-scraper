interface Props {
  selected: string
  onSelect: (position: string) => void
}

const positions = [
  { id: 'F', label: 'CF', x: 110, y: 50 },
  { id: 'F', label: 'LW', x: 100, y: 18 },
  { id: 'F', label: 'RW', x: 100, y: 82 },
  { id: 'M', label: 'AMF', x: 90, y: 50 },
  { id: 'M', label: 'CMF', x: 70, y: 50 },
  { id: 'M', label: 'DMF', x: 55, y: 50 },
  { id: 'M', label: 'LM', x: 70, y: 15 },
  { id: 'M', label: 'RM', x: 70, y: 85 },
  { id: 'D', label: 'LB', x: 35, y: 15 },
  { id: 'D', label: 'CB', x: 35, y: 38 },
  { id: 'D', label: 'CB', x: 35, y: 62 },
  { id: 'D', label: 'RB', x: 35, y: 85 },
  { id: 'G', label: 'GK', x: 15, y: 50 },
]

export default function PitchSelector({ selected, onSelect }: Props) {
  return (
    <div className="relative w-full max-w-[350px] mx-auto" style={{ aspectRatio: '130 / 100' }}>
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
        const isSelected = selected === pos.id || selected === pos.label
        return (
          <button
            key={`${pos.label}-${i}`}
            onClick={() => onSelect(isSelected ? '' : pos.id)}
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
  )
}
