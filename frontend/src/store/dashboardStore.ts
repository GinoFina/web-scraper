import { create } from 'zustand'

interface DashboardState {
  metricX: string
  metricY: string
  position: string[]
  topN: number
  ageMin: number | undefined
  ageMax: number | undefined
  minutesMin: number | undefined
  minutesMax: number | undefined
  leagues: string[]
  team: string
  displayMode: string
  selectedPlayers: number[]
  radarMetrics: string[]

  setMetricX: (v: string) => void
  setMetricY: (v: string) => void
  setPosition: (v: string[]) => void
  setTopN: (v: number) => void
  setFilter: (key: string, value: unknown) => void
  togglePlayer: (id: number) => void
  clearPlayers: () => void
  setDisplayMode: (v: string) => void
  setRadarMetrics: (v: string[]) => void
  resetFilters: () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  metricX: 'goals',
  metricY: 'assists',
  position: [],
  topN: 50,
  ageMin: undefined,
  ageMax: undefined,
  minutesMin: undefined,
  minutesMax: undefined,
  leagues: [],
  team: '',
  displayMode: 'total',
  selectedPlayers: [],
  radarMetrics: [],

  setMetricX: (v) => set({ metricX: v }),
  setMetricY: (v) => set({ metricY: v }),
  setPosition: (v) => set({ position: v }),
  setTopN: (v) => set({ topN: v }),
  setFilter: (key, value) => set({ [key]: value }),
  togglePlayer: (id) =>
    set((state) => ({
      selectedPlayers: state.selectedPlayers.includes(id)
        ? state.selectedPlayers.filter((p) => p !== id)
        : [...state.selectedPlayers, id],
    })),
  clearPlayers: () => set({ selectedPlayers: [] }),
  setDisplayMode: (v) => set({ displayMode: v }),
  setRadarMetrics: (v) => set({ radarMetrics: v }),
  resetFilters: () => set({
    metricX: 'goals',
    metricY: 'assists',
    position: [],
    topN: 50,
    ageMin: undefined,
    ageMax: undefined,
    minutesMin: undefined,
    minutesMax: undefined,
    leagues: [],
    team: '',
    displayMode: 'total',
    selectedPlayers: [],
    radarMetrics: []
  }),
}))
