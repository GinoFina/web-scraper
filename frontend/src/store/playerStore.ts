import { create } from 'zustand'

export type ColumnDef = { key: string, label: string }

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Player' },
  { key: 'age', label: 'Age' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'minutes_played', label: 'Minutes' },
  { key: 'specific_position', label: 'Position' },
  { key: 'team', label: 'Club' },
  { key: 'tournament_name', label: 'League' },
  { key: 'season_name', label: 'Season' },
  { key: 'goals', label: 'G' },
  { key: 'assists', label: 'A' },
  { key: 'rating', label: 'Rating' },
  { key: 'role', label: 'Role' },
  { key: 'role_score', label: 'Role Score' },
  { key: 'league_score', label: 'League Score' },
  { key: 'world_score', label: 'World Score' },
]

interface PlayerFiltersState {
  page: number
  pageSize: number
  name: string
  position: string
  specificPosition: string[]
  nationality: string[]
  team: string
  league: string[]
  season: string
  role: string
  ageMin: number | undefined
  ageMax: number | undefined
  minutesMin: number | undefined
  minutesMax: number | undefined
  sortBy: string
  sortDir: string
  displayMode: 'total' | 'perGame' | 'per90'
  columns: ColumnDef[]
  setFilter: (key: string, value: unknown) => void
  resetFilters: () => void
  setPage: (page: number) => void
}

const defaults = {
  page: 1,
  pageSize: 200,
  name: '',
  position: '',
  specificPosition: [],
  nationality: [],
  team: '',
  league: [],
  season: '',
  role: '',
  ageMin: undefined as number | undefined,
  ageMax: undefined as number | undefined,
  minutesMin: undefined as number | undefined,
  minutesMax: undefined as number | undefined,
  sortBy: 'name',
  sortDir: 'asc',
  displayMode: 'total' as const,
  columns: DEFAULT_COLUMNS,
}

export const usePlayerStore = create<PlayerFiltersState>((set) => ({
  ...defaults,
  setFilter: (key, value) => set({ [key]: value, page: 1 }),
  resetFilters: () => set({ ...defaults }),
  setPage: (page) => set({ page }),
}))
