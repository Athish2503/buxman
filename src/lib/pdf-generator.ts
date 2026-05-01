import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Expense, ExpenseSummary } from '@/types/expense';
import { getCategoryConfig } from '@/lib/categories';
import { format } from 'date-fns';

interface PartyInfo {
  name: string;
  line2?: string;
  email?: string;
}

interface PDFOptions {
  title?: string;
  billedTo?: PartyInfo;
  billedFrom?: PartyInfo;
  shareMessage?: string;
}

// Refined professional palette — neutral with a single accent
const C = {
  ink: [22, 24, 32] as [number, number, number],          // near-black headings
  body: [55, 60, 72] as [number, number, number],         // body text
  muted: [120, 125, 140] as [number, number, number],     // labels
  faint: [180, 184, 196] as [number, number, number],     // dividers
  border: [228, 230, 236] as [number, number, number],
  surface: [249, 250, 252] as [number, number, number],   // zebra row
  panel: [243, 244, 248] as [number, number, number],     // totals box
  white: [255, 255, 255] as [number, number, number],
  accent: [79, 70, 229] as [number, number, number],      // indigo accent
  success: [22, 163, 110] as [number, number, number],
  warning: [202, 138, 4] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  info: [79, 70, 229] as [number, number, number],
};

const setFill = (pdf: jsPDF, c: [number, number, number]) => pdf.setFillColor(c[0], c[1], c[2]);
const setText = (pdf: jsPDF, c: [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);
const setDraw = (pdf: jsPDF, c: [number, number, number]) => pdf.setDrawColor(c[0], c[1], c[2]);

const formatINR = (n: number) =>
  'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * High-fidelity text renderer that supports Emojis by bridging to Canvas
 * when non-standard characters are detected.
 */
const renderText = (
  pdf: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  size: number, 
  color: [number, number, number], 
  fontStyle: 'normal' | 'bold' = 'normal',
  align: 'left' | 'right' | 'center' = 'left'
) => {
  // Regex to detect emojis and special symbols
  const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u.test(text);

  if (hasEmoji) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 4; // Higher scale for print quality
    ctx.font = `${fontStyle} ${size * scale}px sans-serif`;
    const metrics = ctx.measureText(text);
    
    canvas.width = metrics.width;
    canvas.height = size * scale * 1.5;

    ctx.font = `${fontStyle} ${size * scale}px sans-serif`;
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, canvas.height / 2);

    const imgData = canvas.toDataURL('image/png');
    // Convert canvas pixels to PDF mm (1px at 72dpi = 0.3527mm)
    // We scale down the high-res canvas to fit the target size
    const imgW = (canvas.width / scale) * 0.3527 * 0.8; 
    const imgH = (canvas.height / scale) * 0.3527 * 0.8;

    let drawX = x;
    if (align === 'right') drawX = x - imgW;
    else if (align === 'center') drawX = x - imgW / 2;

    pdf.addImage(imgData, 'PNG', drawX, y - (imgH / 1.5), imgW, imgH);
  } else {
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.setFont('helvetica', fontStyle);
    pdf.setFontSize(size);
    pdf.text(text, x, y, { align });
  }
};
export const generateExpensesPDF = async (
  expenses: Expense[],
  summary: ExpenseSummary,
  options: PDFOptions = {}
): Promise<void> => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 20; // 2cm margins for a balanced look

  const invoiceNo = `INV-${format(new Date(), 'yyyyMMdd-HHmm')}`;
  const issueDate = format(new Date(), 'dd MMM yyyy');

  const billedTo = options.billedTo || { name: 'Company Name', line2: 'Accounts Payable Dept.' };
  const billedFrom = options.billedFrom || { name: 'Employee Name', line2: 'Reimbursement Claim' };

  // Palette - Executive Slate & Sky
  const P = {
    accent: [14, 165, 233] as [number, number, number],      // Sky 600
    ink: [15, 23, 42] as [number, number, number],           // Slate 900
    body: [51, 65, 85] as [number, number, number],          // Slate 700
    muted: [100, 116, 139] as [number, number, number],      // Slate 500
    border: [226, 232, 240] as [number, number, number],     // Slate 200
    surface: [248, 250, 252] as [number, number, number],    // Slate 50
    white: [255, 255, 255] as [number, number, number],
  };

  let y = 0;

  // ===== TOP HEADER BANNER =====
  setFill(pdf, P.ink);
  pdf.rect(0, 0, W, 45, 'F');
  
  y = 20;
  // Logo / App Name (White on Dark)
  setText(pdf, P.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('PIXEL REIMBURSE', M, y);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setCharSpace(0.5);
  pdf.text('SECURE LOCAL FINANCIAL REPORTING', M, y + 5);
  pdf.setCharSpace(0);

  // Large "INVOICE" Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(32);
  pdf.text('INVOICE', W - M, y + 4, { align: 'right' });

  y = 55; // Move below banner

  // ===== BILLING INFO GRID =====
  const colW = (W - 2 * M) / 2;
  
  // Left: Billed To
  setText(pdf, P.muted);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BILLED TO', M, y);
  
  y += 5;
  renderText(pdf, billedTo.name, M, y, 12, P.ink, 'bold');
  y += 5;
  renderText(pdf, billedTo.line2 || '', M, y, 9, P.body, 'normal');

  // Right: Invoice Metadata (Floating right)
  const metaX = W - M - 50;
  let metaY = 55;
  
  setText(pdf, P.muted);
  pdf.setFontSize(8);
  pdf.text('INVOICE NO.', metaX, metaY);
  pdf.text('DATE OF ISSUE', W - M, metaY, { align: 'right' });
  
  metaY += 5;
  setText(pdf, P.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(invoiceNo, metaX, metaY);
  pdf.text(issueDate, W - M, metaY, { align: 'right' });

  // Divider
  y += 15;
  setDraw(pdf, P.border);
  pdf.setLineWidth(0.3);
  pdf.line(M, y, W - M, y);

  // ===== FROM SECTION =====
  y += 8;
  setText(pdf, P.muted);
  pdf.setFontSize(8);
  pdf.text('SUBMITTED BY', M, y);
  y += 5;
  renderText(pdf, billedFrom.name, M, y, 10, P.ink, 'bold');
  if (billedFrom.line2) {
    y += 4.5;
    renderText(pdf, billedFrom.line2, M, y, 8.5, P.body, 'normal');
  }

  // ===== SUMMARY TILES =====
  y += 15;
  const metrics = [
    { label: 'TOTAL EXPENSES', value: summary.total, icon: 'sum' },
    { label: 'PENDING CLAIM', value: summary.pending, icon: 'clock' },
    { label: 'REIMBURSED', value: summary.reimbursed, icon: 'check' },
  ];
  
  const tileW = (W - 2 * M - 8) / 3;
  metrics.forEach((m, i) => {
    const x = M + i * (tileW + 4);
    setFill(pdf, P.surface);
    pdf.roundedRect(x, y, tileW, 22, 1.5, 1.5, 'F');
    
    // Vertical Accent Line
    setFill(pdf, P.accent);
    pdf.rect(x, y + 4, 1.5, 14, 'F');
    
    setText(pdf, P.muted);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(m.label, x + 5, y + 7);
    
    setText(pdf, P.ink);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(formatINR(m.value), x + 5, y + 16);
  });

  y += 35;

  // ===== TABLE HEADER =====
  setText(pdf, P.ink);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Itemized Statement', M, y);
  
  y += 6;
  setFill(pdf, P.surface);
  pdf.rect(M, y, W - 2 * M, 8, 'F');
  
  setText(pdf, P.muted);
  pdf.setFontSize(7.5);
  const cols = [
    { label: 'DATE', x: M + 2, w: 25 },
    { label: 'VENDOR / DESCRIPTION', x: M + 30, w: 65 },
    { label: 'CATEGORY', x: M + 98, w: 30 },
    { label: 'STATUS', x: M + 130, w: 22 },
    { label: 'AMOUNT', x: W - M - 2, w: 20, align: 'right' as const },
  ];
  
  cols.forEach(c => {
    pdf.text(c.label, c.x, y + 5.5, { align: c.align });
  });

  y += 8;

  // ===== TABLE ROWS =====
  pdf.setFont('helvetica', 'normal');
  const rowH = 10;
  
  expenses.forEach((exp, i) => {
    if (y + rowH > H - 60) {
      pdf.addPage();
      y = 20;
      // Re-draw minimal header on new page
      setFill(pdf, P.surface);
      pdf.rect(M, y, W - 2 * M, 8, 'F');
      cols.forEach(c => pdf.text(c.label, c.x, y + 5.5, { align: c.align }));
      y += 8;
    }

    // Hairline divider
    setDraw(pdf, P.border);
    pdf.setLineWidth(0.1);
    pdf.line(M, y + rowH, W - M, y + rowH);

    // Date
    setText(pdf, P.body);
    pdf.setFontSize(8.5);
    pdf.text(format(new Date(exp.date), 'dd MMM yyyy'), cols[0].x, y + 6.5);

    // Vendor
    const vendor = exp.vendor.length > 32 ? exp.vendor.substring(0, 30) + '..' : exp.vendor;
    renderText(pdf, vendor, cols[1].x, y + 6.5, 9, P.ink, 'bold');

    // Category
    const cat = getCategoryConfig(exp.category).label;
    setText(pdf, P.body);
    pdf.text(cat, cols[2].x, y + 6.5);

    // Status Pill (Modern Small Dot)
    const statusColor = 
      exp.status === 'approved' ? [22, 163, 74] : 
      exp.status === 'pending' ? [234, 179, 8] : 
      exp.status === 'reimbursed' ? [124, 58, 237] : [220, 38, 38];
    
    setFill(pdf, statusColor as [number, number, number]);
    pdf.circle(cols[3].x + 1, y + 6, 0.8, 'F');
    setText(pdf, statusColor as [number, number, number]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(exp.status.toUpperCase(), cols[3].x + 4, y + 6.5);
    pdf.setFont('helvetica', 'normal');

    // Amount
    renderText(pdf, formatINR(exp.amount), cols[4].x, y + 6.5, 9, P.ink, 'bold', 'right');

    y += rowH;
  });

  // ===== GRAND TOTAL =====
  y += 15;
  const totalBoxW = 60;
  const totalBoxX = W - M - totalBoxW;
  
  // Total Label
  setText(pdf, P.muted);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('TOTAL REIMBURSEMENT DUE', totalBoxX, y);
  
  y += 6;
  renderText(pdf, formatINR(summary.total), W - M, y, 18, P.ink, 'bold', 'right');

  // Signature
  y += 20;
  setDraw(pdf, P.border);
  pdf.line(W - M - 50, y, W - M, y);
  setText(pdf, P.muted);
  pdf.setFontSize(7);
  pdf.text('AUTHORIZED SIGNATURE', W - M - 25, y + 4, { align: 'center' });

  // ===== PROOF OF EXPENSES =====
  const hasImages = expenses.filter(e => e.receiptImage);
  if (hasImages.length > 0) {
    pdf.addPage();
    y = 20;
    setText(pdf, P.ink);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Supporting Documents', M, y);
    pdf.setLineWidth(1);
    setDraw(pdf, P.accent);
    pdf.line(M, y + 2, M + 15, y + 2);
    
    y += 15;
    hasImages.forEach((exp, idx) => {
      if (y + 90 > H) {
        pdf.addPage();
        y = 20;
      }
      
      // Receipt Card
      setFill(pdf, P.surface);
      pdf.roundedRect(M, y, W - 2 * M, 85, 2, 2, 'F');
      
      setText(pdf, P.ink);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(`${idx + 1}. ${exp.vendor}`, M + 5, y + 8);
      setText(pdf, P.muted);
      pdf.text(formatINR(exp.amount), W - M - 5, y + 8, { align: 'right' });
      
      try {
        pdf.addImage(exp.receiptImage!, 'JPEG', M + 5, y + 12, 65, 65);
      } catch {}
      
      y += 95;
    });
  }

  // ===== FOOTER ON ALL PAGES =====
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    setText(pdf, P.muted);
    pdf.setFontSize(7);
    pdf.text('This is a computer generated document. No physical signature required unless specified.', W / 2, H - 10, { align: 'center' });
    pdf.text(`Page ${i} of ${totalPages}`, W - M, H - 10, { align: 'right' });
  }

  // ===== SAVE / SHARE =====
  const fileName = `reimburse-report-${format(new Date(), 'yyyyMMdd')}.pdf`;
  if (Capacitor.isNativePlatform()) {
    const data = pdf.output('datauristring').split(',')[1];
    const res = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
    await Share.share({
      title: 'Expense Report',
      text: options.shareMessage || 'Attached is my reimbursement report.',
      files: [res.uri]
    });
  } else {
    pdf.save(fileName);
  }
};
