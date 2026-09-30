import React, { useMemo, useState } from 'react';
import { Settings, Home, Camera, ChevronDown, ChevronUp, CheckSquare, Play } from 'lucide-react';
import { hasRecordedFlight, sendBack } from './pitraxBridge';

// Numeric value for averaging; curve labels like "5L" / "8R" become signed yards.
function numeric(shot, metric) {
  const raw = metric.value(shot);
  if (raw == null || raw === '—' || raw === '') return null;
  if (metric.key === 'curve') {
    const match = String(raw).match(/^([\d.]+)\s*([LR])?$/i);
    if (!match) return null;
    const magnitude = parseFloat(match[1]);
    return match[2]?.toUpperCase() === 'L' ? -magnitude : magnitude;
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function formatSide(feet) {
  if (feet == null || !Number.isFinite(feet)) return '—';
  const abs = Math.abs(feet);
  const ft = Math.floor(abs);
  const inches = Math.round((abs - ft) * 12);
  return `${ft}' ${inches}"${feet < 0 ? 'L' : feet > 0 ? 'R' : ''}`;
}

const SECTIONS = [
  {
    title: 'Club',
    metrics: [
      { key: 'clubSpeed', label: 'Club Speed', unit: 'mph', digits: 1, value: (s) => s.clubSpeed },
      { key: 'attack', label: 'Attack Ang', unit: 'deg', digits: 1, value: (s) => s.attack },
      { key: 'path', label: 'Club Path', unit: 'deg', digits: 1, value: (s) => s.path },
      { key: 'faceAngle', label: 'Face Ang', unit: 'deg', digits: 1, value: (s) => s.faceAngle },
      { key: 'faceToPath', label: 'Face To Pth', unit: 'deg', digits: 1, value: (s) => s.faceToPath },
    ],
  },
  {
    title: 'Launch',
    metrics: [
      { key: 'ballSpeed', label: 'Ball Speed', unit: 'mph', digits: 1, value: (s) => s.ballSpeed },
      { key: 'smash', label: 'Smash Fac.', unit: '', digits: 2, value: (s) => s.smash },
      { key: 'launch', label: 'Launch Ang.', unit: 'deg', digits: 1, value: (s) => s.launch },
      { key: 'spin', label: 'Spin Rate', unit: 'rpm', digits: 0, value: (s) => s.spin },
    ],
  },
  {
    title: 'Flight',
    metrics: [
      { key: 'curve', label: 'Curve', unit: 'yds', digits: 0, value: (s) => s.curve },
      {
        key: 'height',
        label: 'Height',
        unit: 'ft',
        digits: 0,
        value: (s) => (Number.isFinite(Number(s.apexYds)) ? (Number(s.apexYds) * 3).toFixed(0) : '—'),
      },
      { key: 'carry', label: 'Carry', unit: 'yds', digits: 1, value: (s) => s.carry },
      { key: 'total', label: 'Total', unit: 'yds', digits: 1, value: (s) => s.total },
      {
        key: 'side',
        label: 'Side',
        unit: 'ft',
        digits: 0,
        value: (s) => (Number.isFinite(Number(s.offlineFt)) ? String(s.offlineFt) : '—'),
        display: (s) => formatSide(Number(s.offlineFt)),
      },
    ],
  },
];

const DEFAULT_SELECTED = ['clubSpeed', 'attack', 'path', 'faceAngle', 'faceToPath', 'ballSpeed', 'smash', 'launch', 'spin', 'carry', 'total'];
const SELECTION_KEY = 'pitrax.visibleData.selected';

function loadSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(SELECTION_KEY));
    if (Array.isArray(saved)) return new Set(saved);
  } catch {
    // localStorage may be unavailable for file:// pages; fall back to defaults.
  }
  return new Set(DEFAULT_SELECTED);
}

function consistency(shots, metric) {
  const values = shots.map((s) => numeric(s, metric)).filter((v) => v != null);
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1));
  return { mean, sd };
}

function formatMean(metric, mean) {
  if (metric.key === 'curve') {
    const rounded = Math.round(Math.abs(mean));
    return rounded === 0 ? '0' : `${rounded}${mean < 0 ? 'L' : 'R'}`;
  }
  if (metric.key === 'side') return formatSide(mean);
  return mean.toFixed(metric.digits);
}

function MetricTile({ label, value, subtitle, isSelected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 border-b border-r border-[#3a3c42] transition-colors min-w-0 ${
        isSelected ? 'bg-[#3b2a1a] border-b-2 border-b-orange-500' : 'bg-[#1e2025] active:bg-[#2a2c33]'
      }`}
    >
      {isSelected && (
        <div className="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-bl flex items-center justify-center">
          <CheckSquare size={8} className="text-white" strokeWidth={3} />
        </div>
      )}
      <span className={`text-[7.5px] font-bold tracking-wide uppercase whitespace-nowrap ${isSelected ? 'text-orange-400' : 'text-gray-400'}`}>
        {label}
      </span>
      <span className="text-lg font-medium tracking-tight text-white leading-tight mt-0.5 whitespace-nowrap">{value}</span>
      {subtitle && <span className="text-[7px] text-gray-500 whitespace-nowrap">{subtitle}</span>}
    </button>
  );
}

export function TopNav({ shots, shot, onSelectShot, onReplay }) {
  return (
    <div className="absolute top-0 left-0 right-0 h-10 bg-[#1e2025]/90 border-b border-gray-700 z-20 flex items-center gap-3 backdrop-blur-sm pl-[max(env(safe-area-inset-left),1rem)] pr-[max(env(safe-area-inset-right),1rem)]">
      <div className="flex items-center gap-4 text-gray-300 shrink-0">
        <button type="button" onClick={sendBack} className="flex items-center gap-1.5 active:text-white" aria-label="Back">
          <Home size={16} />
          <span className="text-[10px] font-bold tracking-widest">BACK</span>
        </button>
        <Settings size={16} className="text-gray-400" />
        <div className="w-px h-4 bg-gray-600" />
        <span className="text-xs font-bold tracking-widest uppercase">Shot Analysis</span>
      </div>

      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0 no-scrollbar">
        {shots.map((s) => {
          const selected = shot && s.id === shot.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectShot(s.id)}
              className={`shrink-0 px-2 py-0.5 rounded-sm border text-[10px] font-mono ${
                selected ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-white/5 border-gray-600 text-gray-300'
              }`}
            >
              #{s.id} <span className="font-bold">{s.carry}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-gray-300 shrink-0">
        {hasRecordedFlight(shot) && (
          <button type="button" onClick={onReplay} className="flex items-center gap-1 text-[10px] font-bold tracking-widest active:text-white">
            <Play size={12} className="fill-current" />
            REPLAY
          </button>
        )}
        <Camera size={16} className="text-gray-400" />
        <div className="w-px h-4 bg-gray-600" />
        <span className="text-orange-500 font-bold tracking-widest text-sm flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z" /></svg>
          TRACKMAN
        </span>
      </div>
    </div>
  );
}

export function VisibleDataPanel({ shots, shot }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showConsistency, setShowConsistency] = useState(true);
  const [selected, setSelected] = useState(loadSelection);

  const recorded = useMemo(() => shots.filter(hasRecordedFlight), [shots]);

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(SELECTION_KEY, JSON.stringify([...next]));
      } catch {
        // Selection just won't persist.
      }
      return next;
    });
  };

  return (
    <div className="absolute top-12 right-[max(env(safe-area-inset-right),0.75rem)] w-[340px] bg-[#1e2025]/95 border border-gray-700 shadow-2xl z-10 flex flex-col max-h-[calc(100%-4rem)] backdrop-blur-md rounded-sm">
      <div className="bg-[#15161a] px-2.5 py-2 flex justify-between items-center border-b border-gray-700">
        <span className="text-xs font-bold text-gray-200">Visible Data</span>
        <button type="button" onClick={() => setCollapsed((c) => !c)} className="text-gray-400 active:text-white" aria-label="Toggle panel">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="overflow-y-auto flex-1 no-scrollbar">
            {SECTIONS.map((section, i) => (
              <React.Fragment key={section.title}>
                <div className={`bg-[#15161a] text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider border-b border-[#3a3c42] ${i > 0 ? 'border-t' : ''}`}>
                  {section.title}
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${section.metrics.length}, minmax(0, 1fr))` }}>
                  {section.metrics.map((metric) => {
                    const stats = showConsistency ? consistency(recorded, metric) : null;
                    const value = shot ? (metric.display ? metric.display(shot) : metric.value(shot)) ?? '—' : '—';
                    const subtitle = stats
                      ? `${formatMean(metric, stats.mean)} ${metric.key === 'side' ? '' : metric.unit} ±${stats.sd.toFixed(metric.digits)}`.replace(/\s+/g, ' ')
                      : showConsistency
                        ? `--- ${metric.unit}`.trim()
                        : null;
                    return (
                      <MetricTile
                        key={metric.key}
                        label={metric.label}
                        value={value}
                        subtitle={subtitle}
                        isSelected={selected.has(metric.key)}
                        onToggle={() => toggle(metric.key)}
                      />
                    );
                  })}
                </div>
              </React.Fragment>
            ))}
          </div>

          <label className="p-2 bg-[#15161a] border-t border-gray-700 text-gray-400 text-[10px] flex items-center gap-2">
            <input
              type="checkbox"
              checked={showConsistency}
              onChange={(e) => setShowConsistency(e.target.checked)}
              className="accent-orange-500 w-3 h-3"
            />
            <span>Show average and consistency</span>
          </label>
        </>
      )}
    </div>
  );
}
