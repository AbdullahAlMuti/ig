import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Heart, MessageCircle, Eye } from 'lucide-react';
import type { InstagramMediaItem } from '../../../shared/types/instagram';
import { formatCompact, formatDate } from '../../../shared/utils/format';
import { formatEngagementRate } from '../../../shared/utils/engagementCalculator';
import type { MediaStoreApi } from '../store/useMediaStore';

const MIN_CARD = 130;
const GAP = 4;

function MediaCard({ item, size }: { item: InstagramMediaItem; size: number }) {
  const thumb = item.imgB64 || item.imgSmall || item.imgOrigin || '';
  const href = `https://www.instagram.com/p/${item.code}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-md bg-slate-200"
      style={{ width: size, height: size }}
      title={item.captionText ?? item.code}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={item.code}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
          {item.code}
        </div>
      )}

      {item.engagementRate != null && (
        <span className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">
          {formatEngagementRate(item)}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-black/55 px-1.5 py-1 text-[10px] text-white">
        <div className="flex items-center gap-2">
          {item.likeCount != null && (
            <span className="inline-flex items-center gap-0.5">
              <Heart className="h-3 w-3" />
              {formatCompact(item.likeCount)}
            </span>
          )}
          {item.commentCount != null && (
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
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
        {item.createdAt != null && <div className="opacity-80">{formatDate(item.createdAt)}</div>}
      </div>
    </a>
  );
}

export function MediaGrid({ store }: { store: MediaStoreApi }) {
  const items = store.filtered;
  const parentRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);
  const [cardSize, setCardSize] = useState(MIN_CARD);

  // Responsive column count based on the panel width.
  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const recompute = () => {
      const width = el.clientWidth;
      const nextCols = Math.max(1, Math.floor(width / MIN_CARD));
      const nextCard = Math.floor((width - (nextCols - 1) * GAP) / nextCols);
      setCols(nextCols);
      setCardSize(nextCard > 0 ? nextCard : MIN_CARD);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowCount = Math.ceil(items.length / cols);
  const rowHeight = cardSize + GAP;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 6,
  });

  // Remeasure when the row height changes (width / column recalcs).
  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);

  return (
    <div ref={parentRef} className="h-[420px] overflow-auto rounded-lg bg-slate-50 p-0.5">
      {items.length === 0 ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-400">
          No posts captured yet. Open Instagram and scroll (or use the swipe buttons) to collect
          posts.
        </div>
      ) : (
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const start = virtualRow.index * cols;
            const rowItems = items.slice(start, start + cols);
            return (
              <div
                key={virtualRow.key}
                className="absolute left-0 top-0 grid w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gap: GAP,
                }}
              >
                {rowItems.map((item) => (
                  <MediaCard key={item.code} item={item} size={cardSize} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
