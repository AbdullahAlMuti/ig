/**
 * Excel (.xlsx) export via ExcelJS.
 *
 * Produces a single "Posts" worksheet with a frozen header row and the columns
 * required by the spec — Shortcode, Post URL, Username, Likes, Comments,
 * Reposts, Views, Engagement Rate %, Date, Caption, Media Type — plus an
 * embedded thumbnail (from the captured base64) and blue hyperlinks on the
 * shortcode / post URL / username cells, preserving the original's polish.
 */
import ExcelJS from 'exceljs';
import type { InstagramMediaItem } from '../types/instagram';
import { fileTimestamp, formatDate } from './format';

const IG = 'https://www.instagram.com';
const LINK_FONT = { color: { argb: 'FF0000FF' }, underline: true } as const;
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface ColumnDef {
  header: string;
  key: string;
  width: number;
}

const COLUMNS: ColumnDef[] = [
  { header: 'Image', key: 'image', width: 16 },
  { header: 'Shortcode', key: 'code', width: 14 },
  { header: 'Post URL', key: 'url', width: 40 },
  { header: 'Username', key: 'username', width: 18 },
  { header: 'Likes', key: 'likes', width: 12 },
  { header: 'Comments', key: 'comments', width: 12 },
  { header: 'Reposts', key: 'reposts', width: 12 },
  { header: 'Views', key: 'views', width: 12 },
  { header: 'Engagement Rate %', key: 'er', width: 18 },
  { header: 'Date', key: 'date', width: 14 },
  { header: 'Caption', key: 'caption', width: 50 },
  { header: 'Media Type', key: 'mediaType', width: 14 },
];

function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Build and download an .xlsx for the given (already filtered/sorted) posts.
 * Returns the generated filename. Throws if the list is empty.
 */
export async function exportPostsToExcel(
  items: InstagramMediaItem[],
  filename?: string,
): Promise<string> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('empty list');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IG Sorter & Analytics';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Posts');
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const postUrl = `${IG}/p/${item.code}`;
    const row = sheet.addRow({
      image: '',
      code: item.code,
      url: postUrl,
      username: item.username ?? '',
      likes: item.likeCount ?? '',
      comments: item.commentCount ?? '',
      reposts: item.mediaRepostCount ?? '',
      views: item.playCount ?? '',
      er: item.engagementRate != null ? Number((100 * item.engagementRate).toFixed(2)) : '',
      date: formatDate(item.createdAt),
      caption: item.captionText ?? '',
      mediaType: item.mediaType ?? '',
    });
    row.height = 78;
    row.alignment = { vertical: 'middle', wrapText: true };

    const codeCell = row.getCell('code');
    codeCell.value = { text: item.code, hyperlink: postUrl };
    codeCell.font = { ...LINK_FONT };

    const urlCell = row.getCell('url');
    urlCell.value = { text: postUrl, hyperlink: postUrl };
    urlCell.font = { ...LINK_FONT };

    if (item.username) {
      const userCell = row.getCell('username');
      userCell.value = { text: item.username, hyperlink: `${IG}/${item.username}` };
      userCell.font = { ...LINK_FONT };
    }

    // Embed the thumbnail (scaled to 100px tall, aspect preserved).
    if (item.imgB64 && item.imgB64.startsWith('data:image')) {
      try {
        const { width, height } = await loadImageSize(item.imgB64);
        const displayHeight = 100;
        const displayWidth = height ? displayHeight * (width / height) : 100;
        const imageId = workbook.addImage({
          base64: item.imgB64,
          extension: item.imgB64.includes('image/png') ? 'png' : 'jpeg',
        });
        sheet.addImage(imageId, {
          tl: { col: 0, row: i + 1 },
          ext: { width: displayWidth, height: displayHeight },
          hyperlinks: { hyperlink: postUrl, tooltip: 'View on Instagram' },
        });
      } catch {
        /* skip image on failure */
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const name = filename ?? `ig-sorter-${fileTimestamp()}.xlsx`;
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
  return name;
}
