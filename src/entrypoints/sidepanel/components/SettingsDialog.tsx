import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import {
  type EngagementWeights,
  type OverlayMode,
  type BadgeDisplayMode,
  OVERLAY_MODES,
  OVERLAY_MODE_LABELS,
  BADGE_DISPLAY_MODES,
  BADGE_DISPLAY_MODE_LABELS,
  DEFAULT_BADGE_DISPLAY_MODE,
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
import type { MediaStoreApi } from '../store/useMediaStore';

interface SettingsDialogProps {
  store?: MediaStoreApi;
  onClose: () => void;
  onSaved?: (message: string) => void;
  onGotoInstagram?: () => void;
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

export function SettingsDialog({ store, onClose, onSaved, onGotoInstagram }: SettingsDialogProps) {
  const [mode, setMode] = useState<OverlayMode>(DEFAULT_OVERLAY_MODE);
  const [badgeMode, setBadgeMode] = useState<BadgeDisplayMode>(
    store?.badgeDisplayMode ?? DEFAULT_BADGE_DISPLAY_MODE,
  );
  const [weights, setWeights] = useState<EngagementWeights>({ ...DEFAULT_ER_WEIGHTS });
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape key & focus management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    chrome.storage.local
      .get([STORAGE_KEYS.overlayMode, STORAGE_KEYS.erWeights, STORAGE_KEYS.badgeDisplayMode])
      .then((stored) => {
        if (!active) return;
        const rawMode = stored[STORAGE_KEYS.overlayMode] as OverlayMode | undefined;
        if (OVERLAY_MODES.includes(rawMode as OverlayMode)) setMode(rawMode as OverlayMode);
        const rawBadgeMode = stored[STORAGE_KEYS.badgeDisplayMode] as BadgeDisplayMode | undefined;
        if (BADGE_DISPLAY_MODES.includes(rawBadgeMode as BadgeDisplayMode)) {
          setBadgeMode(rawBadgeMode as BadgeDisplayMode);
        }
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
        [STORAGE_KEYS.badgeDisplayMode]: badgeMode,
      });
      if (store?.setBadgeDisplayMode) {
        store.setBadgeDisplayMode(badgeMode);
      }
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
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="flex w-[340px] max-w-full flex-col gap-3.5 rounded-lg border border-[#E6E8EC] bg-white p-4 shadow-lg text-[#171A21]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E6E8EC] pb-2.5">
          <h3 id="settings-dialog-title" className="text-[14px] font-semibold text-[#171A21]">Settings</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[#667085] hover:bg-[#F4F5F7] hover:text-[#171A21] focus-visible:ring-2 focus-visible:ring-[#6558E8]"
            aria-label="Close settings dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 1. Performance Badge Display Mode */}
        <label className="flex flex-col gap-1 text-[12px] font-medium text-[#171A21]">
          Performance badge display
          <select
            className="h-8 rounded-md border border-[#E6E8EC] bg-white px-2.5 text-[12px] text-[#171A21] focus:border-[#6558E8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6558E8]"
            value={badgeMode}
            onChange={(e) => setBadgeMode(e.target.value as BadgeDisplayMode)}
          >
            {BADGE_DISPLAY_MODES.map((b) => (
              <option key={b} value={b}>
                {BADGE_DISPLAY_MODE_LABELS[b]}
              </option>
            ))}
          </select>
        </label>

        {/* 2. Instagram On-Post Overlay Display Mode */}
        <label className="flex flex-col gap-1 text-[12px] font-medium text-[#171A21]">
          On-post overlay mode (on Instagram)
          <select
            className="h-8 rounded-md border border-[#E6E8EC] bg-white px-2.5 text-[12px] text-[#171A21] focus:border-[#6558E8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6558E8]"
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

        {/* 3. Engagement Rate Formula Weights */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[12px] font-medium text-[#171A21]">Engagement formula weights</div>
          <p className="text-[11px] text-[#667085]">
            Weights for likes, comments and reposts in ER math.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ER_WEIGHT_KEYS.map((key) => (
              <label key={key} className="flex flex-col gap-1 text-[10px] font-medium text-[#667085]">
                {WEIGHT_LABELS[key]}
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={Number.isFinite(weights[key]) ? weights[key] : ''}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [key]: e.currentTarget.valueAsNumber }))
                  }
                  className="h-7 rounded-md border border-[#E6E8EC] bg-white px-2 text-[11px] font-medium text-[#171A21] focus:border-[#6558E8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6558E8]"
                />
              </label>
            ))}
          </div>
          <div className="mt-1 rounded-md border border-[#E6E8EC] bg-[#F8F9FC] p-2 font-mono text-[10px] text-[#171A21]">
            {formatErFormula(weights)}
          </div>
        </div>

        {onGotoInstagram && (
          <div className="border-t border-[#E6E8EC] pt-2.5">
            <button
              onClick={() => {
                onGotoInstagram();
                onClose();
              }}
              className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#E6E8EC] bg-[#F8F9FC] text-[12px] font-medium text-[#6558E8] hover:bg-[#6558E8]/10 focus-visible:ring-2 focus-visible:ring-[#6558E8] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Instagram</span>
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[#E6E8EC] pt-2.5">
          <button
            onClick={onClose}
            className="flex h-8 items-center rounded-md border border-[#E6E8EC] bg-white px-3 text-[12px] font-medium text-[#171A21] hover:bg-[#F4F5F7] focus-visible:ring-2 focus-visible:ring-[#6558E8]"
          >
            Cancel
          </button>
          <button
            disabled={!valid || saving}
            onClick={() => void handleSave()}
            className="flex h-8 items-center rounded-md bg-[#6558E8] px-3 text-[12px] font-medium text-white hover:bg-[#5548D8] focus-visible:ring-2 focus-visible:ring-[#6558E8] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
