import { create } from 'zustand'

interface PlayerFiltersState {
  page: number
  pageSize: number
  name: string
  position: string
  specificPosition: string
  nationality: string
  team: string
  league: string
  season: string
  ageMin: number | undefined
  ageMax: number | undefined
  minutesMin: number | undefined
  minutesMax: number | undefined
  sortBy: string
  sortDir: string

  setFilter: (key: string, value: unknown) => void
  resetFilters: () => void
  setPage: (page: number) => void
}

const defaults = {
  page: 1,
  pageSize: 10000,
  name: '',
  position: '',
  specificPosition: '',
  nationality: '',
  team: '',
  league: '',
  season: '',
  ageMin: undefined as number | undefined,
  ageMax: undefined as number | undefined,
  minutesMin: undefined as number | undefined,
  minutesMax: undefined as number | undefined,
  sortBy: 'name',
  sortDir: 'asc',
}

export const usePlayerStore = create<PlayerFiltersState>((set) => ({
  ...defaults,
  setFilter: (key, value) => set({ [key]: value, page: 1 }),
  resetFilters: () => set({ ...defaults }),
  setPage: (page) => set({ page }),
}))
