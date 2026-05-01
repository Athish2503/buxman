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

export const generateExpensesPDF = async (
  expenses: Expense[],
  summary: ExpenseSummary,
  options: PDFOptions = {}
): Promise<void> => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 18;

  const invoiceNo = `INV-${format(new Date(), 'yyyyMMdd-HHmm')}`;
  const issueDate = format(new Date(), 'dd MMM yyyy');

  const billedTo = options.billedTo || { name: 'Company Name', line2: 'Accounts Payable Dept.' };
  const billedFrom = options.billedFrom || { name: 'Employee Name', line2: 'Reimbursement Claim' };

  // ===== HEADER =====
  // Thin accent bar at top
  setFill(pdf, C.accent);
  pdf.rect(0, 0, W, 2, 'F');

  let y = 18;

  // Brand mark (left)
  setDraw(pdf, C.ink);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(M, y - 4, 9, 9, 1.5, 1.5, 'S');
  setText(pdf, C.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('R', M + 4.5, y + 1.8, { align: 'center' });

  setText(pdf, C.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('REIMBURSE', M + 13, y - 0.5);
  setText(pdf, C.muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Expense reimbursement statement', M + 13, y + 3.5);

  // INVOICE block (right)
  setText(pdf, C.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text('INVOICE', W - M, y + 2, { align: 'right' });

  y += 12;
  setText(pdf, C.muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('INVOICE NO.', W - M - 38, y);
  pdf.text('ISSUE DATE', W - M, y, { align: 'right' });
  setText(pdf, C.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(invoiceNo, W - M - 38, y + 4.5);
  pdf.text(issueDate, W - M, y + 4.5, { align: 'right' });

  // Divider
  y += 12;
  setDraw(pdf, C.border);
  pdf.setLineWidth(0.3);
  pdf.line(M, y, W - M, y);

  // ===== BILL TO / FROM =====
  y += 8;
  const colW = (W - 2 * M) / 2;

  setText(pdf, C.muted);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('BILLED TO', M, y);
  pdf.text('FROM', M + colW, y);

  y += 5;
  setText(pdf, C.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(billedTo.name || '—', M, y);
  pdf.text(billedFrom.name || '—', M + colW, y);

  y += 5;
  setText(pdf, C.body);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  if (billedTo.line2) pdf.text(billedTo.line2, M, y);
  if (billedFrom.line2) pdf.text(billedFrom.line2, M + colW, y);

  if (billedFrom.email) {
    setText(pdf, C.muted);
    pdf.setFontSize(8.5);
    pdf.text(billedFrom.email, M + colW, y + 4.5);
  }

  // ===== SUMMARY (Total + Pending + Reimbursed only — NO Approved) =====
  y += 16;
  const cards = [
    { label: 'TOTAL', value: summary.total, color: C.ink },
    { label: 'PENDING', value: summary.pending, color: C.warning },
    { label: 'REIMBURSED', value: summary.reimbursed, color: C.info },
  ];
  const cardW = (W - 2 * M - 6) / 3;
  const cardH = 20;
  cards.forEach((c, i) => {
    const x = M + i * (cardW + 3);
    setDraw(pdf, C.border);
    setFill(pdf, C.white);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'FD');
    // tiny accent dot
    setFill(pdf, c.color);
    pdf.circle(x + 4, y + 6, 1, 'F');
    setText(pdf, C.muted);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(c.label, x + 7.5, y + 7);
    setText(pdf, C.ink);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(formatINR(c.value), x + 4, y + 15);
  });

  y += cardH + 12;

  // ===== TABLE =====
  setText(pdf, C.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Itemized Expenses', M, y);
  setText(pdf, C.muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`${summary.count} ${summary.count === 1 ? 'entry' : 'entries'}`, W - M, y, { align: 'right' });
  y += 4;

  const tableW = W - 2 * M;
  const cols = [
    { key: 'no', label: '#', x: M, w: 8, align: 'left' as const },
    { key: 'date', label: 'DATE', x: M + 8, w: 22, align: 'left' as const },
    { key: 'vendor', label: 'VENDOR', x: M + 30, w: 48, align: 'left' as const },
    { key: 'category', label: 'CATEGORY', x: M + 78, w: 32, align: 'left' as const },
    { key: 'status', label: 'STATUS', x: M + 110, w: 28, align: 'left' as const },
    { key: 'amount', label: 'AMOUNT', x: W - M, w: 30, align: 'right' as const },
  ];

  const drawHeader = () => {
    // Top + bottom hairline (no fill — minimalist)
    setDraw(pdf, C.ink);
    pdf.setLineWidth(0.4);
    pdf.line(M, y, W - M, y);
    y += 4.5;
    setText(pdf, C.muted);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    cols.forEach(c => {
      pdf.text(c.label, c.x + (c.align === 'right' ? 0 : 1), y);
    });
    y += 3;
    setDraw(pdf, C.border);
    pdf.setLineWidth(0.2);
    pdf.line(M, y, W - M, y);
    y += 1;
  };
  drawHeader();

  const rowH = 9;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  expenses.forEach((expense, index) => {
    if (y + rowH > H - 50) {
      pdf.addPage();
      y = 20;
      drawHeader();
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
    }

    if (index % 2 === 0) {
      setFill(pdf, C.surface);
      pdf.rect(M, y, tableW, rowH, 'F');
    }

    setText(pdf, C.muted);
    pdf.setFontSize(8);
    pdf.text(String(index + 1).padStart(2, '0'), cols[0].x + 1, y + 6);

    setText(pdf, C.body);
    pdf.setFontSize(9);
    pdf.text(format(new Date(expense.date), 'dd MMM yy'), cols[1].x + 1, y + 6);

    setText(pdf, C.ink);
    pdf.setFont('helvetica', 'bold');
    const vendor = expense.vendor.length > 26 ? expense.vendor.substring(0, 24) + '..' : expense.vendor;
    pdf.text(vendor, cols[2].x + 1, y + 6);
    pdf.setFont('helvetica', 'normal');

    setText(pdf, C.body);
    const cat = getCategoryConfig(expense.category).label;
    pdf.text(cat.length > 17 ? cat.substring(0, 15) + '..' : cat, cols[3].x + 1, y + 6);

    // Status — minimal outlined pill
    const statusColor =
      expense.status === 'approved' ? C.success :
      expense.status === 'pending' ? C.warning :
      expense.status === 'reimbursed' ? C.info :
      C.danger;
    const statusLabel = expense.status.charAt(0).toUpperCase() + expense.status.slice(1);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    const pillW = pdf.getTextWidth(statusLabel) + 5;
    setDraw(pdf, statusColor);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(cols[4].x + 1, y + 2.5, pillW, 4.5, 1, 1, 'S');
    setText(pdf, statusColor);
    pdf.text(statusLabel, cols[4].x + 1 + pillW / 2, y + 5.7, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    setText(pdf, C.ink);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatINR(expense.amount), cols[5].x, y + 6, { align: 'right' });
    pdf.setFont('helvetica', 'normal');

    setDraw(pdf, C.border);
    pdf.setLineWidth(0.15);
    pdf.line(M, y + rowH, W - M, y + rowH);

    y += rowH;
  });

  // Bold closing line under table
  setDraw(pdf, C.ink);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, W - M, y);

  // ===== TOTALS =====
  if (y + 40 > H - 30) {
    pdf.addPage();
    y = 20;
  }
  y += 8;

  const boxW = 78;
  const boxX = W - M - boxW;

  // Subtotal row
  setText(pdf, C.muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Subtotal', boxX, y);
  setText(pdf, C.body);
  pdf.text(formatINR(summary.total), boxX + boxW, y, { align: 'right' });
  y += 6;

  // Pending row
  setText(pdf, C.muted);
  pdf.text('Pending', boxX, y);
  setText(pdf, C.body);
  pdf.text(formatINR(summary.pending), boxX + boxW, y, { align: 'right' });
  y += 4;

  setDraw(pdf, C.border);
  pdf.setLineWidth(0.3);
  pdf.line(boxX, y, boxX + boxW, y);
  y += 6;

  // Total Due
  setFill(pdf, C.ink);
  pdf.rect(boxX, y - 5, boxW, 11, 'F');
  setText(pdf, C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('TOTAL DUE', boxX + 3, y + 1.5);
  pdf.setFontSize(11);
  pdf.text(formatINR(summary.total), boxX + boxW - 3, y + 1.5, { align: 'right' });

  // ===== FOOTER =====
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    setDraw(pdf, C.border);
    pdf.setLineWidth(0.3);
    pdf.line(M, H - 16, W - M, H - 16);

    setText(pdf, C.muted);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text('Thank you for your prompt review and processing of this reimbursement.', M, H - 10);
    pdf.text('Generated by Reimburse', M, H - 6);

    pdf.text(`Page ${i} of ${totalPages}`, W - M, H - 10, { align: 'right' });
    pdf.text(format(new Date(), "dd MMM yyyy 'at' HH:mm"), W - M, H - 6, { align: 'right' });
  }

  const fileName = `reimbursement-invoice-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      // Use a flat filename in the cache directory for maximum compatibility
      const data = pdf.output('datauristring').split(',')[1];
      
      const result = await Filesystem.writeFile({
        path: fileName,
        data,
        directory: Directory.Cache,
      });

      // Using 'files' array is more robust in newer Capacitor Share versions
      await Share.share({
        title: 'Expense Reimbursement Invoice',
        text: 'Here is your expense reimbursement invoice.',
        files: [result.uri],
        dialogTitle: 'Share Invoice',
      });
    } catch (e) {
      console.error('Failed to save or share PDF:', e);
      throw e; // Throw so the UI toast shows the error
    }
  } else {
    pdf.save(fileName);
  }
};
