import { useState } from 'react';
import { X, ExternalLink, Download, Copy, Check, Crown, Zap, Heart, Eye, Target, Flame, Rocket, Star } from 'lucide-react';
import type { InstagramMediaItem } from '../../../shared/types/instagram';
import type { ItemPerformanceData } from '../../../shared/utils/performanceRanker';
import { BADGE_METADATA, type BadgeType } from '../../../shared/utils/performanceRanker';
import { formatCompact, formatDate } from '../../../shared/utils/format';
import { buildDownloadEntries } from '../../../shared/utils/mediaDownloader';
import { sendToInstagramTab } from '../../../shared/utils/tabMessaging';
import type { MediaStoreApi } from '../store/useMediaStore';

interface MediaDetailsModalProps {
  item: InstagramMediaItem;
  rankData?: ItemPerformanceData;
  store: MediaStoreApi;
  onClose: () => void;
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

export function MediaDetailsModal({ item, rankData, store, onClose }: MediaDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const postUrl = `https://www.instagram.com/p/${item.code}`;
  const thumb = item.imgB64 || item.imgOrigin || item.imgSmall || '';

  const mainBadge = rankData?.badge;
  const BadgeIcon = mainBadge ? BADGE_ICONS[mainBadge.iconName] ?? Star : Star;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      store.flashToast('Post URL copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      store.flashToast('Failed to copy URL');
    }
  };

  const handleDownloadSingle = async () => {
    const entries = buildDownloadEntries(item);
    if (entries.length === 0) {
      store.flashToast('No downloadable media found');
      return;
    }
    let successCount = 0;
    for (const entry of entries) {
      const res = await sendToInstagramTab({
        type: 'ndy_content_down',
        url: entry.url,
        prefix: entry.prefix,
      });
      if (res.ok) {
        successCount++;
      } else {
        store.flashToast(res.error || 'Failed to trigger download');
      }
    }
    if (successCount > 0) {
      store.flashToast(`Download started (${successCount} files)`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex w-[340px] max-w-full flex-col max-h-[90vh] overflow-y-auto rounded-lg border border-[#E6E8EC] bg-white p-4 shadow-xl text-[#171A21]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E8EC] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-semibold">
              {item.username ? `@${item.username}` : item.code}
            </span>
            {item.mediaType && (
              <span className="rounded bg-[#F4F5F7] px-1.5 py-0.5 text-[10px] uppercase font-medium text-[#667085]">
                {item.mediaType}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-[#667085] hover:bg-[#F4F5F7] hover:text-[#171A21]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thumbnail Preview */}
        <div className="mt-3 relative aspect-video w-full overflow-hidden rounded-md bg-[#F4F5F7] border border-[#E6E8EC]">
          {thumb ? (
            <img src={thumb} alt={item.code} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[#667085]">
              No Image Preview
            </div>
          )}
          {mainBadge && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm shadow">
              <BadgeIcon className="h-3.5 w-3.5 text-amber-400" />
              <span>{mainBadge.label}</span>
            </div>
          )}
        </div>

        {/* Main Performance Badge Card */}
        {mainBadge && (
          <div className="mt-3 rounded-md border border-[#6558E8]/20 bg-[#6558E8]/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-[13px] text-[#171A21]">
                <BadgeIcon className="h-4 w-4 text-[#6558E8]" />
                <span>{mainBadge.label}</span>
              </div>
              {rankData && (
                <span className="rounded-full bg-[#6558E8] px-2 py-0.5 text-[10px] font-bold text-white">
                  Score {rankData.overallScore}/100
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#667085]">
              {mainBadge.description}
            </p>
          </div>
        )}

        {/* Relative Ranks Breakdown */}
        {rankData && (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="text-[12px] font-medium text-[#171A21]">Performance Rankings</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center justify-between rounded border border-[#E6E8EC] bg-[#F8F9FC] px-2.5 py-1.5">
                <span className="text-[#667085]">Overall Rank</span>
                <span className="font-semibold text-[#171A21]">#{rankData.overallRank} of {store.counts.base}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-[#E6E8EC] bg-[#F8F9FC] px-2.5 py-1.5">
                <span className="text-[#667085]">ER Rank</span>
                <span className="font-semibold text-[#6558E8]">#{rankData.erRank}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-[#E6E8EC] bg-[#F8F9FC] px-2.5 py-1.5">
                <span className="text-[#667085]">Likes Rank</span>
                <span className="font-semibold text-[#171A21]">#{rankData.likesRank}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-[#E6E8EC] bg-[#F8F9FC] px-2.5 py-1.5">
                <span className="text-[#667085]">Comments Rank</span>
                <span className="font-semibold text-[#171A21]">#{rankData.commentsRank}</span>
              </div>
              {item.playCount != null && (
                <div className="flex items-center justify-between rounded border border-[#E6E8EC] bg-[#F8F9FC] px-2.5 py-1.5 col-span-2">
                  <span className="text-[#667085]">Views Rank</span>
                  <span className="font-semibold text-[#171A21]">#{rankData.viewsRank}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Secondary Achievements */}
        {rankData && rankData.secondaryBadges.length > 1 && (
          <div className="mt-3 flex flex-col gap-1">
            <div className="text-[11px] font-medium text-[#667085]">Category Achievements</div>
            <div className="flex flex-wrap gap-1">
              {rankData.secondaryBadges.map((bKey) => {
                const b = BADGE_METADATA[bKey as BadgeType];
                if (!b) return null;
                return (
                  <span key={bKey} className="inline-flex items-center gap-1 rounded bg-[#F4F5F7] px-2 py-0.5 text-[10px] font-medium text-[#171A21]">
                    • {b.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Raw Metric Metrics */}
        <div className="mt-3 flex flex-col gap-1.5 border-t border-[#E6E8EC] pt-3">
          <div className="text-[12px] font-medium text-[#171A21]">Raw Metrics</div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex justify-between border-b border-[#E6E8EC] pb-1">
              <span className="text-[#667085]">Engagement Rate</span>
              <span className="font-semibold text-[#6558E8]">
                {item.engagementRate != null ? `${(item.engagementRate * 100).toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#E6E8EC] pb-1">
              <span className="text-[#667085]">Likes</span>
              <span className="font-semibold">{item.likeCount != null ? formatCompact(item.likeCount) : 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-[#E6E8EC] pb-1">
              <span className="text-[#667085]">Comments</span>
              <span className="font-semibold">{item.commentCount != null ? formatCompact(item.commentCount) : 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-[#E6E8EC] pb-1">
              <span className="text-[#667085]">Views</span>
              <span className="font-semibold">{item.playCount != null ? formatCompact(item.playCount) : 'N/A'}</span>
            </div>
          </div>
          {item.createdAt != null && (
            <div className="text-[11px] text-[#667085] mt-0.5">
              Published: {formatDate(item.createdAt)}
            </div>
          )}
          {item.captionText && (
            <p className="mt-1 text-[11px] text-[#667085] italic line-clamp-2">
              "{item.captionText}"
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#E6E8EC] pt-3">
          <button
            onClick={handleCopyLink}
            className="flex h-8 items-center justify-center gap-1 flex-1 rounded border border-[#E6E8EC] bg-white text-[11px] font-medium text-[#171A21] hover:bg-[#F4F5F7]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy link'}</span>
          </button>
          <button
            onClick={handleDownloadSingle}
            className="flex h-8 items-center justify-center gap-1 flex-1 rounded border border-[#E6E8EC] bg-white text-[11px] font-medium text-[#171A21] hover:bg-[#F4F5F7]"
          >
            <Download className="h-3.5 w-3.5 text-[#6558E8]" />
            <span>Download</span>
          </button>
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center justify-center gap-1 flex-1 rounded bg-[#6558E8] text-[11px] font-medium text-white hover:bg-[#5548D8]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open IG</span>
          </a>
        </div>
      </div>
    </div>
  );
}
