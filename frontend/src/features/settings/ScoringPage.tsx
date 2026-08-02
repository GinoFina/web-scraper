import React, { useEffect, useState } from 'react';
import { useConfigStore, RolesConfigMap, RoleConfig } from '../../store/configStore';
import {
  Save,
  RefreshCw,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Settings2,
  Edit2
} from 'lucide-react';
import { api, getPositions } from '../../services/api';

const AVAILABLE_METRICS = [
  "appearances", "minutes_played", "goals", "assists", "expected_goals",
  "expected_assists", "rating", "accurate_passes", "accurate_passes_pct",
  "key_passes", "big_chances_created", "accurate_long_balls",
  "accurate_long_balls_pct", "accurate_crosses", "accurate_crosses_pct",
  "total_shots", "shots_on_target", "shots_off_target", "big_chances_missed",
  "dribbles_won", "dribbles_won_pct", "aerial_duels_won", "aerial_duels_won_pct",
  "ground_duels_won", "ground_duels_won_pct", "tackles", "interceptions",
  "clearances", "blocked_shots", "dispossessed", "offsides", "possession_lost",
  "total_duels_won", "total_duels_won_pct", "saves", "clean_sheets",
  "saves_inside_box", "saves_outside_box", "goals_conceded",
  "goals_conceded_inside_box", "goals_conceded_outside_box", "penalties_saved",
  "punches", "high_claims", "runs_out", "successful_runs_out",
  "distance_covered", "sprints", "max_speed"
];

const AVAILABLE_POSITIONS = [
  "GK", "RB", "CB", "LB", "RWB", "LWB", "CDM", "CM", "RM", "LM", "CAM", "RW", "LW", "CF", "ST"
];

export const ScoringPage: React.FC = () => {
  const { rolesConfig, leagueMultipliers, isLoading, isSaving, fetchConfig, updateConfig, updateMultipliers, recalculateAll } = useConfigStore();
  const [localConfig, setLocalConfig] = useState<RolesConfigMap | null>(null);
  const [localMultipliers, setLocalMultipliers] = useState<Record<string, number> | null>(null);
  const [activeTab, setActiveTab] = useState<'roles' | 'multipliers'>('roles');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [newPosInput, setNewPosInput] = useState("");
  const [newMetricSelect, setNewMetricSelect] = useState("");
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState("");
  const [apiPositions, setApiPositions] = useState<string[]>(AVAILABLE_POSITIONS);

  useEffect(() => {
    fetchConfig();
    getPositions().then(res => {
      if (res && res.specific) {
        setApiPositions(res.specific);
      }
    }).catch(console.error);
  }, [fetchConfig]);

  useEffect(() => {
    if (Object.keys(rolesConfig).length > 0 && !localConfig) {
      setLocalConfig(JSON.parse(JSON.stringify(rolesConfig))); // Deep copy
      if (!selectedRole) setSelectedRole(Object.keys(rolesConfig)[0]);
    }
  }, [rolesConfig, localConfig, selectedRole]);

  useEffect(() => {
    if (leagueMultipliers.length > 0 && !localMultipliers) {
      const initial: Record<string, number> = {};
      leagueMultipliers.forEach(m => initial[m.id.toString()] = m.multiplier);
      setLocalMultipliers(initial);
    }
  }, [leagueMultipliers, localMultipliers]);

  const handleSave = async () => {
    try {
      if (activeTab === 'roles' && localConfig) {
        await updateConfig(localConfig);
      } else if (activeTab === 'multipliers' && localMultipliers) {
        await updateMultipliers(localMultipliers);
      }
      setToast({ msg: 'Configuración guardada exitosamente', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast({ msg: 'Error al guardar la configuración', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleRecalculate = async () => {
    try {
      await recalculateAll();
      setToast({ msg: 'Recálculo iniciado', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast({ msg: 'Error al iniciar recálculo', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (isLoading || !localConfig) {
    return <div className="p-8 text-slate-400">Cargando configuración...</div>;
  }

  const roleData = selectedRole ? localConfig[selectedRole] : null;

  // Helpers for editing
  const updateRoleConfig = (role: string, data: RoleConfig) => {
    setLocalConfig(prev => prev ? { ...prev, [role]: data } : null);
  };

  const addPosition = () => {
    if (!selectedRole || !roleData || !newPosInput.trim()) return;
    const pos = newPosInput.trim().toUpperCase();
    if (!roleData.valid_positions.includes(pos)) {
      updateRoleConfig(selectedRole, {
        ...roleData,
        valid_positions: [...roleData.valid_positions, pos]
      });
    }
    setNewPosInput("");
  };

  const removePosition = (pos: string) => {
    if (!selectedRole || !roleData) return;
    updateRoleConfig(selectedRole, {
      ...roleData,
      valid_positions: roleData.valid_positions.filter(p => p !== pos)
    });
  };

  const updateWeight = (metric: string, val: number) => {
    if (!selectedRole || !roleData) return;
    updateRoleConfig(selectedRole, {
      ...roleData,
      weights: {
        ...roleData.weights,
        [metric]: val
      }
    });
  };

  const removeWeight = (metric: string) => {
    if (!selectedRole || !roleData) return;
    const newWeights = { ...roleData.weights };
    delete newWeights[metric];
    updateRoleConfig(selectedRole, {
      ...roleData,
      weights: newWeights
    });
  };

  const addMetric = () => {
    if (!selectedRole || !roleData || !newMetricSelect) return;
    if (!(newMetricSelect in roleData.weights)) {
      updateRoleConfig(selectedRole, {
        ...roleData,
        weights: {
          ...roleData.weights,
          [newMetricSelect]: 0.1
        }
      });
    }
    setNewMetricSelect("");
  };

  const currentTotalWeight = roleData
    ? Object.values(roleData.weights).reduce((a, b) => a + b, 0)
    : 0;

  const addNewRole = () => {
    let baseName = "New_Role";
    let name = baseName;
    let counter = 1;
    while (localConfig && name in localConfig) {
      name = `${baseName}_${counter}`;
      counter++;
    }

    const newConfig = { ...localConfig };
    newConfig[name] = { valid_positions: [], weights: {} };
    setLocalConfig(newConfig);
    setSelectedRole(name);
  };

  const handleRenameSave = () => {
    if (!selectedRole || !localConfig || !editNameInput.trim()) {
      setIsEditingName(false);
      return;
    }
    const newName = editNameInput.trim().replace(/\s+/g, '_');
    if (newName !== selectedRole) {
      if (newName in localConfig) {
        setToast({ msg: 'Ya existe un rol con ese nombre', type: 'error' });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      const newConfig = { ...localConfig };
      newConfig[newName] = newConfig[selectedRole];
      delete newConfig[selectedRole];
      setLocalConfig(newConfig);
      setSelectedRole(newName);
    }
    setIsEditingName(false);
  };

  const deleteRole = (roleToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!localConfig) return;
    // Don't delete if it's the last role
    if (Object.keys(localConfig).length <= 1) {
      setToast({ msg: 'Cannot delete the last role', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const newConfig = { ...localConfig };
    delete newConfig[roleToDelete];
    setLocalConfig(newConfig);
    if (selectedRole === roleToDelete) {
      setSelectedRole(Object.keys(newConfig)[0] || null);
    }
  };

  return (
    <div className="min-h-full flex flex-col gap-5 animate-fade-in overflow-hidden" style={{ paddingLeft: '14px', paddingRight: '14px', paddingBottom: '10px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            Scoring Parameters
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Modify weights, valid positions, and league multipliers.
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-surface-800 p-1 rounded-lg border border-surface-700 mx-auto">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'roles' ? 'bg-surface-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Roles Config
          </button>
          <button
            onClick={() => setActiveTab('multipliers')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'multipliers' ? 'bg-surface-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            League Multipliers
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRecalculate}
            className="btn-ghost flex items-center gap-2 text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Recalculate All
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-4 rounded-xl flex items-center gap-3 border" style={{
          backgroundColor: toast.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
          borderColor: toast.type === 'success' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)',
          color: toast.type === 'success' ? 'var(--color-accent-green)' : 'var(--color-accent-red)'
        }}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-5 min-h-0">
        
        {activeTab === 'multipliers' ? (
          <div className="flex-1 glass-card overflow-y-auto p-6">
            <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>League Multipliers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leagueMultipliers.map(league => (
                <div key={league.id} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-800)', border: '1px solid var(--color-border)' }}>
                  <div className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {league.name}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.0001"
                    value={localMultipliers?.[league.id.toString()] ?? league.multiplier}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setLocalMultipliers(prev => prev ? { ...prev, [league.id.toString()]: val } : null);
                      }
                    }}
                    className="input-dark w-24 text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
        {/* Roles Sidebar */}
        <div className="w-64 flex flex-col glass-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(15, 21, 32, 0.4)', paddingLeft: '4px', paddingRight: '4px' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Available Roles</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ paddingLeft: '4px', paddingRight: '4px' }}>
            {Object.keys(localConfig).map(role => (
              <div
                key={role}
                onClick={() => setSelectedRole(role)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between cursor-pointer group"
                style={{
                  backgroundColor: selectedRole === role ? 'var(--color-surface-600)' : 'transparent',
                  color: selectedRole === role ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontWeight: selectedRole === role ? 500 : 400
                }}
              >
                <span>{role.replace(/_/g, ' ')}</span>
                <button
                  onClick={(e) => deleteRole(role, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all"
                  title="Delete role"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(15, 21, 32, 0.4)', paddingLeft: '0px', paddingRight: '0px' }}>
            <button
              onClick={addNewRole}
              className="w-full btn-ghost text-xs py-2 flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Role
            </button>
          </div>
        </div>

        {/* Editor Panel */}
        {roleData && selectedRole && (
          <div className="flex-1 flex flex-col glass-card overflow-hidden">
            <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(15, 21, 32, 0.4)', paddingLeft: '10px', paddingRight: '10px' }}>
              {isEditingName ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={e => setEditNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRenameSave()}
                    className="input-dark font-bold text-lg"
                    autoFocus
                  />
                  <button onClick={handleRenameSave} className="btn-primary text-xs py-1 px-3">Save</button>
                  <button onClick={() => setIsEditingName(false)} className="btn-ghost text-xs py-1 px-3">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{selectedRole.replace(/_/g, ' ')}</h2>
                  <button
                    onClick={() => {
                      setEditNameInput(selectedRole);
                      setIsEditingName(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ paddingLeft: '10px', paddingRight: '10px' }}>

              {/* Posiciones Válidas & Añadir Métrica */}
              <div className="flex gap-4 items-start">
                <section className="flex-1 max-w-xl">
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Add Metrics and Positions</h3>

                  <div className="flex gap-4 mb-4">
                    {/* Position Input */}
                    <div className="flex gap-2 w-48 items-center">
                      <select
                        value={newPosInput}
                        onChange={e => setNewPosInput(e.target.value)}
                        className="input-dark flex-1 text-sm"
                      >
                        <option value="">All Positions</option>
                        {apiPositions.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <button
                        onClick={addPosition}
                        disabled={!newPosInput}
                        className="btn-ghost text-xs py-1 px-3 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>

                    {/* Metric Select */}
                    <div className="flex gap-2 w-64 items-center">
                      <select
                        value={newMetricSelect}
                        onChange={e => setNewMetricSelect(e.target.value)}
                        className="input-dark flex-1 text-sm"
                      >
                        <option value="">Select new metric...</option>
                        {AVAILABLE_METRICS.filter(m => !(m in roleData.weights)).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        onClick={addMetric}
                        disabled={!newMetricSelect}
                        className="btn-ghost text-xs py-1 px-3 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 mt-6" style={{ color: 'var(--color-text-muted)' }}>Valid Positions</h3>
                  <div className="flex flex-wrap gap-2">
                    {roleData.valid_positions.map(pos => (
                      <div key={pos} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs" style={{
                        backgroundColor: 'var(--color-surface-700)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {pos}
                        <button onClick={() => removePosition(pos)} className="transition-colors hover:text-red-400" style={{ color: 'var(--color-text-muted)' }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Pesos */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Metrics & Weights</h3>
                  <div className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                    backgroundColor: Math.abs(currentTotalWeight - 1) < 0.01 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    color: Math.abs(currentTotalWeight - 1) < 0.01 ? 'var(--color-accent-green)' : 'var(--color-accent-amber)'
                  }}>
                    Total Sum: {currentTotalWeight.toFixed(2)} (Ideal: 1.00)
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {Object.entries(roleData.weights).map(([metric, weight]) => (
                    <div key={metric} className="flex items-center gap-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-surface-800)', border: '1px solid var(--color-border)' }}>
                      <div className="w-48 text-sm font-medium truncate" style={{ color: 'var(--color-text-secondary)' }} title={metric}>
                        {metric}
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        value={weight}
                        onChange={e => updateWeight(metric, parseFloat(e.target.value))}
                        className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
                        style={{ backgroundColor: 'var(--color-surface-600)' }}
                      />
                      <input
                        type="number"
                        min="-1"
                        max="1"
                        step="0.01"
                        value={weight}
                        onChange={e => updateWeight(metric, parseFloat(e.target.value))}
                        className="input-dark w-20 text-center"
                      />
                      <button onClick={() => removeWeight(metric)} className="p-1.5 rounded-md transition-colors hover:bg-red-500/10 hover:text-red-400" style={{ color: 'var(--color-text-muted)' }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};
