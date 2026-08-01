import { create } from 'zustand'

export type ComponentType = 'RadarChart' | 'ScatterPlot' | 'PlayerCard' | 'TextBlock' | 'StatsTable' | 'PitchMap' | 'ImageBlock' | 'PercentileBars' | 'HeadToHead'

export interface DroppedItem {
  id: string
  type: ComponentType
  content?: string // For TextBlock
  width?: number // In pixels
  height?: number // In pixels
  config?: any // Component specific configuration
}

interface ReportState {
  playerId: number | null
  items: DroppedItem[]
  orientation: 'Vertical' | 'Horizontal'
  configuringItemId: string | null

  setOrientation: (o: 'Vertical' | 'Horizontal') => void
  setPlayerId: (id: number | null) => void
  addItem: (type: ComponentType) => string
  removeItem: (id: string) => void
  moveItem: (oldIndex: number, newIndex: number) => void
  updateItemContent: (id: string, content: string) => void
  updateItemConfig: (id: string, config: any) => void
  resizeItem: (id: string, width: number, height: number) => void
  clearReport: () => void
  setConfiguringItem: (id: string | null) => void
}

export const useReportStore = create<ReportState>((set) => ({
  playerId: null,
  items: [],
  orientation: 'Vertical',
  configuringItemId: null,

  setOrientation: (o) => set({ orientation: o }),
  setPlayerId: (id) => set({ playerId: id }),

  addItem: (type) => {
    const newId = `${type}-${Date.now()}`
    set((state) => ({
      items: [...state.items, { id: newId, type, content: '' }]
    }))
    return newId
  },

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

  updateItemConfig: (id, config) => set((state) => ({
    items: state.items.map(item => item.id === id ? { ...item, config } : item)
  })),

  resizeItem: (id, width, height) => set((state) => ({
    items: state.items.map(item => item.id === id ? { ...item, width, height } : item)
  })),

  clearReport: () => set({ items: [] }),
  setConfiguringItem: (id) => set({ configuringItemId: id })
}))
