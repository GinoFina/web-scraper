import { create } from 'zustand';
import { api } from '../services/api';

export interface RoleConfig {
  valid_positions: string[];
  weights: Record<string, number>;
}

export type RolesConfigMap = Record<string, RoleConfig>;

export interface LeagueMultiplier {
  id: number;
  name: string;
  multiplier: number;
}

interface ConfigState {
  rolesConfig: RolesConfigMap;
  leagueMultipliers: LeagueMultiplier[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  updateConfig: (newConfig: RolesConfigMap) => Promise<void>;
  updateMultipliers: (newMultipliers: Record<string, number>) => Promise<void>;
  recalculateAll: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  rolesConfig: {},
  leagueMultipliers: [],
  isLoading: false,
  isSaving: false,
  error: null,
  
  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const [rolesRes, multsRes] = await Promise.all([
        api.get<RolesConfigMap>('/api/config/roles'),
        api.get<LeagueMultiplier[]>('/api/config/multipliers')
      ]);
      set({ 
        rolesConfig: rolesRes.data, 
        leagueMultipliers: multsRes.data, 
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'Error fetching config', isLoading: false });
    }
  },
  
  updateConfig: async (newConfig: RolesConfigMap) => {
    set({ isSaving: true, error: null });
    try {
      await api.put('/api/config/roles', newConfig);
      set({ rolesConfig: newConfig, isSaving: false });
    } catch (err: any) {
      set({ error: err.message || 'Error saving config', isSaving: false });
      throw err;
    }
  },

  updateMultipliers: async (newMultipliers: Record<string, number>) => {
    set({ isSaving: true, error: null });
    try {
      await api.put('/api/config/multipliers', newMultipliers);
      // update local state mapping
      set((state) => ({
        leagueMultipliers: state.leagueMultipliers.map(m => ({
          ...m,
          multiplier: newMultipliers[m.id.toString()] ?? m.multiplier
        })),
        isSaving: false
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error saving multipliers', isSaving: false });
      throw err;
    }
  },
  
  recalculateAll: async () => {
    try {
      await api.post('/api/config/recalculate');
    } catch (err: any) {
      throw err;
    }
  }
}));
