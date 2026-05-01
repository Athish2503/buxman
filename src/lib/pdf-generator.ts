import jsPDF from 'jspdf';
import { Expense, ExpenseSummary } from '@/types/expense';
import { getCategoryConfig } from '@/lib/categories';
import { format } from 'date-fns';

interface PDFOptions {
  userInfo?: {
    name?: string;
    company?: string;
    email?: string;
  };
  title?: string;
}

// Brand palette (matches index.css design tokens)
const COLORS = {
  primary: [99, 78, 240] as [number, number, number],      // hsl(252 83% 60%)
  primaryDark: [70, 50, 200] as [number, number, number],
  accent: [161, 92, 230] as [number, number, number],      // violet
  text: [25, 25, 38] as [number, number, number],
  textMuted: [110, 110, 130] as [number, number, number],
  border: [228, 228, 235] as [number, number, number],
  surface: [248, 248, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [34, 178, 122] as [number, number, number],
  warning: [240, 158, 40] as [number, number, number],
  danger: [232, 70, 70] as [number, number, number],
  info: [99, 78, 240] as [number, number, number],
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
  const M = 15; // margin

  const invoiceNo = `INV-${format(new Date(), 'yyyyMMdd-HHmm')}`;
  const issueDate = format(new Date(), 'dd MMM yyyy');

  // ===== HEADER BAND =====
  setFill(pdf, COLORS.primary);
  pdf.rect(0, 0, W, 55, 'F');

  // Subtle accent bar
  setFill(pdf, COLORS.accent);
  pdf.rect(0, 52, W, 3, 'F');

  // Logo mark
  setFill(pdf, COLORS.white);
  pdf.roundedRect(M, 14, 12, 12, 2.5, 2.5, 'F');
  setText(pdf, COLORS.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('R', M + 6, 22, { align: 'center' });

  // Brand name
  setText(pdf, COLORS.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('REIMBURSE', M + 16, 22);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Premium Expense Reimbursement', M + 16, 27);

  // Right side: INVOICE label
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.text('INVOICE', W - M, 24, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`#${invoiceNo}`, W - M, 31, { align: 'right' });
  pdf.text(`Issued: ${issueDate}`, W - M, 36, { align: 'right' });

  // ===== BILL TO / FROM =====
  let y = 68;
  setText(pdf, COLORS.textMuted);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('BILLED TO', M, y);
  pdf.text('FROM', W / 2 + 5, y);

  y += 5;
  setText(pdf, COLORS.text);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(options.userInfo?.company || 'Company Name', M, y);
  pdf.text(options.userInfo?.name || 'Employee Name', W / 2 + 5, y);

  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  setText(pdf, COLORS.textMuted);
  pdf.text('Accounts Payable Dept.', M, y);
  if (options.userInfo?.email) {
    pdf.text(options.userInfo.email, W / 2 + 5, y);
  } else {
    pdf.text('Reimbursement Claim', W / 2 + 5, y);
  }

  // ===== SUMMARY CARDS =====
  y += 12;
  const cardW = (W - 2 * M - 9) / 4;
  const cardH = 22;
  const cards = [
    { label: 'TOTAL', value: summary.total, color: COLORS.primary },
    { label: 'PENDING', value: summary.pending, color: COLORS.warning },
    { label: 'APPROVED', value: summary.approved, color: COLORS.success },
    { label: 'REIMBURSED', value: summary.reimbursed, color: COLORS.info },
  ];
  cards.forEach((c, i) => {
    const x = M + i * (cardW + 3);
    setFill(pdf, COLORS.surface);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
    setFill(pdf, c.color);
    pdf.rect(x, y, 1.5, cardH, 'F');
    setText(pdf, COLORS.textMuted);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(c.label, x + 5, y + 7);
    setText(pdf, COLORS.text);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(formatINR(c.value), x + 5, y + 15);
    setText(pdf, COLORS.textMuted);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(`${summary.count} entries`, x + 5, y + 19);
  });

  y += cardH + 12;

  // ===== TABLE =====
  // Section title
  setText(pdf, COLORS.text);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Expense Details', M, y);
  y += 6;

  // Column layout (mm)
  const cols = [
    { key: 'no', label: '#', x: M, w: 10, align: 'left' as const },
    { key: 'date', label: 'DATE', x: M + 10, w: 22, align: 'left' as const },
    { key: 'vendor', label: 'VENDOR', x: M + 32, w: 45, align: 'left' as const },
    { key: 'category', label: 'CATEGORY', x: M + 77, w: 35, align: 'left' as const },
    { key: 'status', label: 'STATUS', x: M + 112, w: 28, align: 'left' as const },
    { key: 'amount', label: 'AMOUNT', x: W - M, w: 30, align: 'right' as const },
  ];
  const tableW = W - 2 * M;

  // Header row
  setFill(pdf, COLORS.text);
  pdf.roundedRect(M, y, tableW, 9, 1.5, 1.5, 'F');
  setText(pdf, COLORS.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  cols.forEach(c => {
    pdf.text(c.label, c.x + (c.align === 'right' ? 0 : 2), y + 6, { align: c.align });
  });
  y += 9;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const rowH = 10;

  expenses.forEach((expense, index) => {
    if (y + rowH > H - 40) {
      pdf.addPage();
      y = 20;
      // Repeat header
      setFill(pdf, COLORS.text);
      pdf.roundedRect(M, y, tableW, 9, 1.5, 1.5, 'F');
      setText(pdf, COLORS.white);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      cols.forEach(c => {
        pdf.text(c.label, c.x + (c.align === 'right' ? 0 : 2), y + 6, { align: c.align });
      });
      y += 9;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
    }

    // Zebra
    if (index % 2 === 0) {
      setFill(pdf, COLORS.surface);
      pdf.rect(M, y, tableW, rowH, 'F');
    }

    setText(pdf, COLORS.textMuted);
    pdf.text(String(index + 1).padStart(2, '0'), cols[0].x + 2, y + 6.5);

    setText(pdf, COLORS.text);
    pdf.text(format(new Date(expense.date), 'dd MMM yy'), cols[1].x + 2, y + 6.5);

    pdf.setFont('helvetica', 'bold');
    const vendor = expense.vendor.length > 24 ? expense.vendor.substring(0, 22) + '..' : expense.vendor;
    pdf.text(vendor, cols[2].x + 2, y + 6.5);
    pdf.setFont('helvetica', 'normal');

    setText(pdf, COLORS.textMuted);
    const cat = getCategoryConfig(expense.category).label;
    pdf.text(cat.length > 18 ? cat.substring(0, 16) + '..' : cat, cols[3].x + 2, y + 6.5);

    // Status pill
    const statusColor =
      expense.status === 'approved' ? COLORS.success :
      expense.status === 'pending' ? COLORS.warning :
      expense.status === 'reimbursed' ? COLORS.info :
      COLORS.danger;
    const statusLabel = expense.status.charAt(0).toUpperCase() + expense.status.slice(1);
    const pillW = pdf.getTextWidth(statusLabel) + 5;
    setFill(pdf, statusColor);
    pdf.roundedRect(cols[4].x + 1, y + 2.5, pillW, 5, 1.2, 1.2, 'F');
    setText(pdf, COLORS.white);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(statusLabel, cols[4].x + 1 + pillW / 2, y + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    // Amount
    setText(pdf, COLORS.text);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatINR(expense.amount), cols[5].x, y + 6.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');

    // Row separator
    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.1);
    pdf.line(M, y + rowH, W - M, y + rowH);

    y += rowH;
  });

  // ===== TOTALS BOX =====
  if (y + 50 > H - 30) {
    pdf.addPage();
    y = 20;
  }
  y += 6;

  const boxW = 80;
  const boxX = W - M - boxW;
  const lines = [
    { label: 'Subtotal', value: summary.total, bold: false },
    { label: 'Pending', value: summary.pending, bold: false },
    { label: 'Approved', value: summary.approved, bold: false },
  ];

  lines.forEach((l) => {
    setText(pdf, COLORS.textMuted);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(l.label, boxX + 4, y + 5);
    setText(pdf, COLORS.text);
    pdf.text(formatINR(l.value), boxX + boxW - 4, y + 5, { align: 'right' });
    y += 7;
  });

  // Grand total
  setFill(pdf, COLORS.primary);
  pdf.roundedRect(boxX, y, boxW, 12, 2, 2, 'F');
  setText(pdf, COLORS.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('TOTAL DUE', boxX + 4, y + 7.5);
  pdf.setFontSize(12);
  pdf.text(formatINR(summary.total), boxX + boxW - 4, y + 7.5, { align: 'right' });

  // ===== FOOTER =====
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.line(M, H - 18, W - M, H - 18);

    setText(pdf, COLORS.textMuted);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Thank you for your business.', M, H - 12);
    pdf.text('Generated by Reimburse · Premium Expense Tracker', M, H - 7);

    pdf.text(`Page ${i} of ${totalPages}`, W - M, H - 12, { align: 'right' });
    pdf.text(format(new Date(), "dd MMM yyyy 'at' HH:mm"), W - M, H - 7, { align: 'right' });
  }

  pdf.save(`reimbursement-invoice-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
