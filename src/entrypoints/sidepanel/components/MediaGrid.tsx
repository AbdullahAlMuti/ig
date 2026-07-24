import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Heart,
  MessageCircle,
  Eye,
  Film,
  Images,
  Image as ImageIcon,
  ExternalLink,
  Crown,
  Zap,
  Target,
  Flame,
  Rocket,
  Star,
  Info,
  Sparkles,
} from 'lucide-react';
import type { InstagramMediaItem, BadgeDisplayMode } from '../../../shared/types/instagram';
import { formatCompact, formatDate } from '../../../shared/utils/format';
import { formatEngagementRate } from '../../../shared/utils/engagementCalculator';
import type { ItemPerformanceData } from '../../../shared/utils/performanceRanker';
import type { MediaStoreApi } from '../store/useMediaStore';
import { MediaDetailsModal } from './MediaDetailsModal';

interface MediaGridProps {
  store: MediaStoreApi;
  viewMode: 'grid' | 'list';
}

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Zap,
  Heart,
  Eye,
  Target,
  Flame,
  Rocket,
  Star,
};

function PerformanceBadgeTag({
  rankData,
  displayMode,
  item,
}: {
  rankData?: ItemPerformanceData;
  displayMode: BadgeDisplayMode;
  item: InstagramMediaItem;
}) {
  if (displayMode === 'none') return null;

  if (displayMode === 'er') {
    if (item.engagementRate == null) return null;
    return (
      <span className="rounded bg-black/65 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white backdrop-blur-xs">
        {formatEngagementRate(item)}
      </span>
    );
  }

  const badge = rankData?.badge;

  // Build comprehensive hover tooltip
  const tooltipLines: string[] = [];
  if (badge) {
    tooltipLines.push(badge.label);
    tooltipLines.push(badge.description);
    tooltipLines.push(`Overall Rank: #${rankData.overallRank}`);
  }
  if (item.engagementRate != null) {
    tooltipLines.push(`Engagement Rate: ${(item.engagementRate * 100).toFixed(2)}%`);
  }
  if (item.likeCount != null) {
    tooltipLines.push(`Likes: ${formatCompact(item.likeCount)}`);
  }
  if (item.playCount != null) {
    tooltipLines.push(`Views: ${formatCompact(item.playCount)}`);
  }

  const tooltipText = tooltipLines.join('\n');

  if (!badge) {
    // If no main badge assigned (selective system), show ER percentage if displayMode is hover
    if (displayMode === 'hover' && item.engagementRate != null) {
      return (
        <span
          className="rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-xs"
          title={tooltipText}
        >
          {formatEngagementRate(item)}
        </span>
      );
    }
    return null;
  }

  const IconComp = BADGE_ICONS[badge.iconName] ?? Star;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-tight shadow-xs backdrop-blur-sm cursor-help transition-transform hover:scale-105 ${badge.bgClass} ${badge.borderClass} ${badge.textClass}`}
      title={tooltipText}
      aria-label={`${badge.label}. ${badge.description} Overall rank ${rankData?.overallRank}.`}
    >
      <IconComp className="h-3 w-3 shrink-0" />
      <span className="truncate">{badge.shortLabel}</span>
      {displayMode === 'hover' && item.engagementRate != null && (
        <span className="ml-0.5 border-l border-white/30 pl-1 font-mono text-[8.5px] font-normal opacity-90">
          {formatEngagementRate(item)}
        </span>
      )}
    </span>
  );
}

function MediaCard({
  item,
  selected,
  onToggleSelect,
  viewMode,
  store,
  onOpenDetails,
}: {
  item: InstagramMediaItem;
  selected: boolean;
  onToggleSelect: (code: string) => void;
  viewMode: 'grid' | 'list';
  store: MediaStoreApi;
  onOpenDetails: (item: InstagramMediaItem) => void;
}) {
  const thumb = item.imgB64 || item.imgSmall || item.imgOrigin || '';
  const href = `https://www.instagram.com/p/${item.code}`;
  const isVideo = item.mediaType === 'video' || (item.playCount != null && item.playCount > 0);
  const isCarousel = item.mediaType === 'carousel';

  const rankData = store.rankings.byCode.get(item.code);

  if (viewMode === 'list') {
    return (
      <div
        className={`group relative flex items-center gap-3 rounded-lg border p-2 transition-all ${
          selected
            ? 'border-[#6558E8] bg-[#6558E8]/5'
            : 'border-[#E6E8EC] bg-white hover:border-[#D1D5DB] hover:bg-[#F8F9FC]'
        }`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.code)}
          className="h-4 w-4 rounded border-[#D1D5DB] text-[#6558E8] focus:ring-[#6558E8] cursor-pointer shrink-0"
        />

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[#F4F5F7]"
        >
          {thumb ? (
            <img src={thumb} alt={item.code} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-[9px] text-[#667085]">
              {item.code}
            </div>
          )}
          {isVideo && (
            <div className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white">
              <Film className="h-2.5 w-2.5" />
            </div>
          )}
          {isCarousel && (
            <div className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white">
              <Images className="h-2.5 w-2.5" />
            </div>
          )}
        </a>

        <div className="flex flex-1 flex-col min-w-0 justify-between gap-1 leading-tight">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11px] font-semibold text-[#171A21] truncate">
              {item.username ? `@${item.username}` : item.code}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <PerformanceBadgeTag
                rankData={rankData}
                displayMode={store.badgeDisplayMode}
                item={item}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onOpenDetails(item);
                }}
                className="flex h-5 w-5 items-center justify-center rounded text-[#667085] hover:bg-[#E6E8EC] hover:text-[#171A21]"
                title="View details & performance breakdown"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#667085]">
            {item.likeCount != null && (
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3 w-3 text-rose-500" />
                {formatCompact(item.likeCount)}
              </span>
            )}
            {item.commentCount != null && (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3 w-3 text-blue-500" />
                {formatCompact(item.commentCount)}
              </span>
            )}
            {item.playCount != null && (
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3 text-purple-500" />
                {formatCompact(item.playCount)}
              </span>
            )}
            {item.createdAt != null && <span className="ml-auto text-[10px]">{formatDate(item.createdAt)}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border transition-all duration-150 ${
        selected ? 'border-[#6558E8] ring-2 ring-[#6558E8]/20' : 'border-[#E6E8EC] bg-[#F4F5F7] hover:border-[#D1D5DB]'
      }`}
    >
      {/* Checkbox Overlay Top-Left */}
      <div className="absolute left-2 top-2 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.code)}
          className="h-4 w-4 rounded border-white/60 bg-black/40 text-[#6558E8] focus:ring-[#6558E8] cursor-pointer shadow-sm"
        />
      </div>

      {/* Media Type & Badge Top-Right */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <PerformanceBadgeTag
          rankData={rankData}
          displayMode={store.badgeDisplayMode}
          item={item}
        />
        {isVideo && (
          <span className="rounded bg-black/60 p-1 text-white backdrop-blur-xs">
            <Film className="h-3 w-3" />
          </span>
        )}
        {isCarousel && (
          <span className="rounded bg-black/60 p-1 text-white backdrop-blur-xs">
            <Images className="h-3 w-3" />
          </span>
        )}
      </div>

      {/* Info Details Icon Hover Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onOpenDetails(item);
        }}
        className="absolute left-2 bottom-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-xs"
        title="View details & performance breakdown"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {/* Image Thumbnail Link */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-square w-full overflow-hidden bg-[#E6E8EC]"
        title={item.captionText ?? item.code}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={item.code}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-[#667085]">
            {item.code}
          </div>
        )}

        {/* Bottom Dark Gradient Metrics Overlay */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 text-[10px] text-white">
          <div className="flex items-center gap-2.5 font-medium pl-6">
            {item.likeCount != null && (
              <span className="inline-flex items-center gap-0.5">
                <Heart className="h-3 w-3 fill-white/30" />
                {formatCompact(item.likeCount)}
              </span>
            )}
            {item.commentCount != null && (
              <span className="inline-flex items-center gap-0.5">
                <MessageCircle className="h-3 w-3 fill-white/30" />
                {formatCompact(item.commentCount)}
              </span>
            )}
            {item.playCount != null && (
              <span className="inline-flex items-center gap-0.5">
                <Eye className="h-3 w-3" />
                {formatCompact(item.playCount)}
              </span>
            )}
          </div>
          {item.createdAt != null && (
            <div className="text-[9px] text-white/75 truncate pl-6">{formatDate(item.createdAt)}</div>
          )}
        </div>
      </a>
    </div>
  );
}

export function MediaGrid({ store, viewMode }: MediaGridProps) {
  const items = store.filtered;
  const parentRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(2);
  const [activeItem, setActiveItem] = useState<InstagramMediaItem | null>(null);

  // Recompute responsive columns for grid mode (default 2 cols for popup width)
  useLayoutEffect(() => {
    if (viewMode === 'list') return;
    const el = parentRef.current;
    if (!el) return;
    const recompute = () => {
      const width = el.clientWidth;
      const nextCols = width > 420 ? 3 : 2;
      setCols(nextCols);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);

  const rowCount = viewMode === 'list' ? items.length : Math.ceil(items.length / cols);
  const estimatedRowHeight = viewMode === 'list' ? 68 : 170;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [cols, viewMode, virtualizer]);

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto p-3 min-h-[220px]">
      {items.length === 0 ? (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-6 text-center">
          {store.isPerformanceFiltered ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 mb-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#171A21]">No matching posts</h3>
              <p className="mt-1 max-w-[260px] text-[12px] leading-normal text-[#667085]">
                No posts match the selected performance filters.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={store.clearPerformanceFilters}
                  className="rounded-md border border-[#E6E8EC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#6558E8] hover:bg-[#F8F9FC] transition-colors"
                >
                  Clear performance filters
                </button>
                <button
                  onClick={() => {
                    store.clearPerformanceFilters();
                    store.setDayIndex(0);
                  }}
                  className="rounded-md bg-[#6558E8] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#5548D8] transition-colors"
                >
                  Reset all filters
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6558E8]/10 text-[#6558E8] mb-3">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#171A21]">No posts captured yet</h3>
              <p className="mt-1 max-w-[240px] text-[12px] leading-normal text-[#667085]">
                Open Instagram and scroll down or click <strong className="font-medium text-[#171A21]">Start scrolling</strong> to collect media.
              </p>
              {!store.connected && (
                <button
                  onClick={store.gotoInstagram}
                  className="mt-4 flex items-center gap-1.5 rounded-md bg-[#6558E8] px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:bg-[#5548D8] active:scale-95 shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Instagram</span>
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            if (viewMode === 'list') {
              const item = items[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '8px',
                  }}
                >
                  <MediaCard
                    item={item}
                    selected={store.selectedCodes.has(item.code)}
                    onToggleSelect={store.toggleSelect}
                    viewMode="list"
                    store={store}
                    onOpenDetails={setActiveItem}
                  />
                </div>
              );
            }

            const start = virtualRow.index * cols;
            const rowItems = items.slice(start, start + cols);
            return (
              <div
                key={virtualRow.key}
                className="absolute left-0 top-0 grid w-full gap-2"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                }}
              >
                {rowItems.map((item) => (
                  <MediaCard
                    key={item.code}
                    item={item}
                    selected={store.selectedCodes.has(item.code)}
                    onToggleSelect={store.toggleSelect}
                    viewMode="grid"
                    store={store}
                    onOpenDetails={setActiveItem}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {activeItem && (
        <MediaDetailsModal
          item={activeItem}
          rankData={store.rankings.byCode.get(activeItem.code)}
          store={store}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}
