import { create } from 'zustand'

export type ComponentType = 'RadarChart' | 'ScatterPlot' | 'PlayerCard' | 'TextBlock' | 'StatsTable' | 'PitchMap'

export interface DroppedItem {
  id: string
  type: ComponentType
  content?: string // For TextBlock
}

interface ReportState {
  playerId: number | null
  items: DroppedItem[]
  
  setPlayerId: (id: number | null) => void
  addItem: (type: ComponentType) => void
  removeItem: (id: string) => void
  moveItem: (oldIndex: number, newIndex: number) => void
  updateItemContent: (id: string, content: string) => void
  clearReport: () => void
}

export const useReportStore = create<ReportState>((set) => ({
  playerId: null,
  items: [],

  setPlayerId: (id) => set({ playerId: id }),
  
  addItem: (type) => set((state) => ({
    items: [...state.items, { id: `${type}-${Date.now()}`, type, content: '' }]
  })),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),
  
  moveItem: (oldIndex, newIndex) => set((state) => {
    const newItems = [...state.items]
    const [moved] = newItems.splice(oldIndex, 1)
    newItems.splice(newIndex, 0, moved)
    return { items: newItems }
  }),
  
  updateItemContent: (id, content) => set((state) => ({
    items: state.items.map(item => item.id === id ? { ...item, content } : item)
  })),
  
  clearReport: () => set({ items: [] })
}))
