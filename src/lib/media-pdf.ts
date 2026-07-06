import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { format } from 'date-fns';
import { MediaRecommendation } from '@/types/media';
import { PLATFORM_CONFIG } from '@/components/media/platformConfig';

// ─── Colour Palette ────────────────────────────────────────────────────────
const P = {
  bg:      [11, 15, 23]   as [number,number,number], // near-black
  surface: [20, 25, 36]   as [number,number,number],
  card:    [28, 34, 48]   as [number,number,number],
  border:  [45, 54, 72]   as [number,number,number],
  white:   [255,255,255]  as [number,number,number],
  muted:   [130,140,162]  as [number,number,number],
  accent:  [139,92,246]   as [number,number,number], // violet-500
  emerald: [52,211,153]   as [number,number,number],
  amber:   [251,191,36]   as [number,number,number],
  cyan:    [34,211,238]   as [number,number,number],
  purple:  [168,85,247]   as [number,number,number],
};

const sf  = (pdf: jsPDF, c: [number,number,number]) => pdf.setFillColor(c[0], c[1], c[2]);
const st  = (pdf: jsPDF, c: [number,number,number]) => pdf.setTextColor(c[0], c[1], c[2]);
const sd  = (pdf: jsPDF, c: [number,number,number]) => pdf.setDrawColor(c[0], c[1], c[2]);

function stars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

/**
 * Generate and download a cinematic watchlist PDF
 */
export async function generateWatchlistPDF(
  media: MediaRecommendation[],
  contactMap: Record<string, string> = {}
): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W   = pdf.internal.pageSize.getWidth();   // 210
  const H   = pdf.internal.pageSize.getHeight();  // 297
  const M   = 18;
  const IW  = W - 2 * M;

  // ── helpers ────────────────────────────────────────────────────────────
  const text = (
    t: string,
    x: number,
    y: number,
    sz: number,
    color: [number,number,number],
    style: 'normal'|'bold' = 'normal',
    align: 'left'|'right'|'center' = 'left'
  ) => {
    st(pdf, color);
    pdf.setFont('helvetica', style);
    pdf.setFontSize(sz);
    pdf.text(t, x, y, { align });
  };

  let y = 0;

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Header Banner
  // ════════════════════════════════════════════════════════════════════════
  sf(pdf, P.bg);
  pdf.rect(0, 0, W, H, 'F');

  // Gradient-look header bar
  sf(pdf, P.surface);
  pdf.roundedRect(M, 14, IW, 38, 4, 4, 'F');
  sd(pdf, P.accent);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(M, 14, IW, 38, 4, 4, 'S');

  // Accent vertical bar
  sf(pdf, P.accent);
  pdf.roundedRect(M, 14, 4, 38, 4, 4, 'F');

  text('🎬 Watchlist', M + 10, 27, 18, P.white, 'bold');
  text('PIXEL REIMBURSE', M + 10, 34, 7.5, P.muted, 'normal');
  text(`Exported ${format(new Date(), 'dd MMM yyyy, h:mm a')}`, M + 10, 41, 7.5, P.muted, 'normal');

  const total   = media.length;
  const toWatch = media.filter(m => m.status === 'to_watch').length;
  const watching= media.filter(m => m.status === 'watching').length;
  const watched = media.filter(m => m.status === 'watched').length;
  const rated   = media.filter(m => m.rating);
  const avgRating = rated.length
    ? (rated.reduce((s,m) => s + (m.rating ?? 0), 0) / rated.length).toFixed(1)
    : '—';

  // Stat chips on the right
  const statsX = W - M - 2;
  const statsY = 22;
  const statsItems = [
    { label: 'Total', value: String(total), color: P.white },
    { label: 'To Watch', value: String(toWatch), color: P.muted },
    { label: 'Watching', value: String(watching), color: P.cyan },
    { label: 'Watched', value: String(watched), color: P.emerald },
    { label: 'Avg ★', value: avgRating, color: P.amber },
  ];
  let sx = statsX;
  [...statsItems].reverse().forEach(stat => {
    const w = 28;
    sf(pdf, P.card);
    pdf.roundedRect(sx - w, statsY - 5, w, 20, 2, 2, 'F');
    text(stat.value, sx - w/2, statsY + 4, 10, stat.color, 'bold', 'center');
    text(stat.label, sx - w/2, statsY + 9, 5.5, P.muted, 'normal', 'center');
    sx -= w + 3;
  });

  y = 62;

  // ════════════════════════════════════════════════════════════════════════
  // Sections: To Watch → Watching → Watched
  // ════════════════════════════════════════════════════════════════════════
  const sections: Array<{
    key: MediaRecommendation['status'];
    label: string;
    color: [number,number,number];
  }> = [
    { key: 'to_watch',  label: 'TO WATCH',  color: P.muted   },
    { key: 'watching',  label: 'WATCHING',  color: P.cyan    },
    { key: 'watched',   label: 'WATCHED',   color: P.emerald },
  ];

  for (const section of sections) {
    const items = media.filter(m => m.status === section.key);
    if (items.length === 0) continue;

    // Section heading
    if (y + 24 > H - 12) { pdf.addPage(); sf(pdf, P.bg); pdf.rect(0,0,W,H,'F'); y = 16; }

    sf(pdf, P.surface);
    pdf.roundedRect(M, y, IW, 12, 2, 2, 'F');
    sf(pdf, section.color);
    pdf.roundedRect(M, y, 3, 12, 2, 2, 'F');
    text(section.label, M + 8, y + 8, 8, section.color, 'bold');
    text(`${items.length} item${items.length !== 1 ? 's' : ''}`, W - M - 2, y + 8, 7, P.muted, 'normal', 'right');

    y += 16;

    for (const item of items) {
      const ROW_H = item.notes ? 22 : 16;
      if (y + ROW_H + 4 > H - 12) {
        pdf.addPage();
        sf(pdf, P.bg);
        pdf.rect(0,0,W,H,'F');
        y = 16;
      }

      // Row card
      sf(pdf, P.card);
      pdf.roundedRect(M, y, IW, ROW_H, 2, 2, 'F');

      // Pin indicator
      if (item.pinned) {
        sf(pdf, P.accent);
        pdf.circle(M + 3, y + ROW_H/2, 1.2, 'F');
      }

      // Poster thumbnail (if available)
      let textStartX = M + 8;
      // Note: loading external images in jsPDF on web is tricky without CORS proxy,
      // so we skip poster rendering and just show a placeholder box
      sf(pdf, P.surface);
      pdf.roundedRect(M + 6, y + 2, 9, 12, 1, 1, 'F');
      text(item.type === 'movie' ? '🎬' : '📺', M + 7, y + 10, 7, P.muted, 'normal');
      textStartX = M + 18;

      // Title + year
      const titleText = item.releaseYear ? `${item.title} (${item.releaseYear})` : item.title;
      const truncTitle = titleText.length > 55 ? titleText.substring(0, 53) + '…' : titleText;
      text(truncTitle, textStartX, y + 7, 8.5, P.white, 'bold');

      // Genre chips (text only)
      const genreStr = item.genres.slice(0, 3).join(' · ');
      if (genreStr) text(genreStr, textStartX, y + 12, 6.5, P.muted, 'normal');

      // Platform
      const platformLabel = item.platform
        ? PLATFORM_CONFIG[item.platform]?.label ?? item.platform
        : null;
      if (platformLabel) {
        const plW = pdf.getStringUnitWidth(platformLabel) * 6.5 * 0.352 + 4;
        sf(pdf, P.surface);
        pdf.roundedRect(W - M - plW - 2, y + 2, plW + 2, 7, 1, 1, 'F');
        text(platformLabel, W - M - plW/2 - 2, y + 7, 5.5, P.muted, 'normal', 'center');
      }

      // Recommender
      const rec = item.recommendedBy ? (contactMap[item.recommendedBy] || 'Friend') : 'Self';
      text(`From: ${rec}`, W - M - 2, y + 13, 6, P.muted, 'normal', 'right');

      // Rating stars
      if (item.rating) {
        text(stars(item.rating), textStartX, y + 17, 7, P.amber, 'normal');
      }

      // Notes
      if (item.notes && ROW_H > 16) {
        const truncNotes = item.notes.length > 80 ? item.notes.substring(0, 78) + '…' : item.notes;
        text(`"${truncNotes}"`, textStartX, y + 19.5, 6, P.muted, 'normal');
      }

      y += ROW_H + 3;
    }

    y += 6;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Footer on all pages
  // ════════════════════════════════════════════════════════════════════════
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    sd(pdf, P.border);
    pdf.setLineWidth(0.2);
    pdf.line(M, H - 10, W - M, H - 10);
    text('Generated by Pixel Reimburse · Watchlist Export', M, H - 5.5, 5.5, P.muted, 'normal');
    text(`Page ${i} of ${totalPages}`, W - M, H - 5.5, 5.5, P.muted, 'normal', 'right');
  }

  // ════════════════════════════════════════════════════════════════════════
  // Save / Share
  // ════════════════════════════════════════════════════════════════════════
  const fileName = `watchlist-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const data = pdf.output('datauristring').split(',')[1];
    const res  = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
    await Share.share({ title: 'My Watchlist', files: [res.uri] });
  } else {
    pdf.save(fileName);
  }
}
