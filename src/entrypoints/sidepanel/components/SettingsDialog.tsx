import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import {
  type EngagementWeights,
  type OverlayMode,
  OVERLAY_MODES,
  OVERLAY_MODE_LABELS,
  ER_WEIGHT_KEYS,
  DEFAULT_ER_WEIGHTS,
  DEFAULT_OVERLAY_MODE,
  STORAGE_KEYS,
} from '../../../shared/types/instagram';
import {
  areWeightsValid,
  normalizeWeights,
  formatErFormula,
} from '../../../shared/utils/engagementCalculator';
import { RUNTIME_MSG } from '../../../shared/types/messages';

interface SettingsDialogProps {
  onClose: () => void;
  onSaved?: (message: string) => void;
}

const WEIGHT_LABELS: Record<(typeof ER_WEIGHT_KEYS)[number], string> = {
  like: 'Like weight',
  comment: 'Comment weight',
  repost: 'Repost weight',
};

async function broadcast(mode: OverlayMode, weights: EngagementWeights): Promise<void> {
  const tabs = await chrome.tabs.query({ url: ['*://www.instagram.com/*'] });
  for (const tab of tabs) {
    if (tab.id == null) continue;
    chrome.tabs.sendMessage(
      tab.id,
      { type: RUNTIME_MSG.overlayModeChanged, value: mode },
      () => void chrome.runtime.lastError,
    );
    chrome.tabs.sendMessage(
      tab.id,
      { type: RUNTIME_MSG.erWeightsChanged, value: weights },
      () => void chrome.runtime.lastError,
    );
  }
}

export function SettingsDialog({ onClose, onSaved }: SettingsDialogProps) {
  const [mode, setMode] = useState<OverlayMode>(DEFAULT_OVERLAY_MODE);
  const [weights, setWeights] = useState<EngagementWeights>({ ...DEFAULT_ER_WEIGHTS });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    chrome.storage.local
      .get([STORAGE_KEYS.overlayMode, STORAGE_KEYS.erWeights])
      .then((stored) => {
        if (!active) return;
        const rawMode = stored[STORAGE_KEYS.overlayMode] as OverlayMode | undefined;
        if (OVERLAY_MODES.includes(rawMode as OverlayMode)) setMode(rawMode as OverlayMode);
        const rawWeights = stored[STORAGE_KEYS.erWeights];
        if (areWeightsValid(rawWeights)) setWeights(normalizeWeights(rawWeights));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const valid = useMemo(() => areWeightsValid(weights), [weights]);

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    const normalized = normalizeWeights(weights);
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.overlayMode]: mode,
        [STORAGE_KEYS.erWeights]: normalized,
      });
      await broadcast(mode, normalized);
      onSaved?.('Settings updated');
      onClose();
    } catch {
      onSaved?.('Failed to save, please retry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-80 max-w-full flex-col gap-4 rounded-lg bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Settings</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
          Overlay display
          <select
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal focus:border-brand focus:outline-none"
            value={mode}
            onChange={(e) => setMode(e.target.value as OverlayMode)}
          >
            {OVERLAY_MODES.map((m) => (
              <option key={m} value={m}>
                {OVERLAY_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-slate-700">Engagement formula</div>
          <p className="text-xs text-slate-500">
            Adjust how likes, comments and reposts contribute to ER.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ER_WEIGHT_KEYS.map((key) => (
              <label key={key} className="flex flex-col gap-1 text-[11px] text-slate-600">
                {WEIGHT_LABELS[key]}
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={Number.isFinite(weights[key]) ? weights[key] : ''}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [key]: e.currentTarget.valueAsNumber }))
                  }
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand focus:outline-none"
                />
              </label>
            ))}
          </div>
          <div className="rounded-md bg-slate-100 p-2 text-[11px] text-slate-700">
            {formatErFormula(weights)}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!valid || saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
