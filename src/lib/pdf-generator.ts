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
  includeImages?: boolean;
}

export const generateExpensesPDF = async (
  expenses: Expense[], 
  summary: ExpenseSummary,
  options: PDFOptions = {}
): Promise<void> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let currentY = 20;

  // Header Section
  pdf.setFillColor(59, 130, 246); // Primary blue
  pdf.rect(0, 0, pageWidth, 50, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(options.title || 'Expense Reimbursement Report', 20, 30);

  if (options.userInfo?.name || options.userInfo?.company) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const info = [
      options.userInfo.name,
      options.userInfo.company,
      options.userInfo.email
    ].filter(Boolean).join(' • ');
    pdf.text(info, 20, 42);
  }

  currentY = 70;
  pdf.setTextColor(0, 0, 0);

  // Summary Section
  pdf.setFillColor(248, 250, 252); // Light gray background
  pdf.rect(20, currentY - 5, pageWidth - 40, 50, 'F');
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary', 30, currentY + 10);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const summaryData = [
    `Total Expenses: ₹${summary.total.toLocaleString('en-IN')}`,
    `Total Items: ${summary.count}`,
    `Pending: ₹${summary.pending.toLocaleString('en-IN')}`,
    `Approved: ₹${summary.approved.toLocaleString('en-IN')}`,
    `Reimbursed: ₹${summary.reimbursed.toLocaleString('en-IN')}`
  ];

  summaryData.forEach((item, index) => {
    if (index < 3) {
      pdf.text(item, 30, currentY + 25 + (index * 8));
    } else {
      pdf.text(item, 120, currentY + 25 + ((index - 3) * 8));
    }
  });

  currentY += 70;

  // Expenses Table Header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Expense Details', 20, currentY);
  currentY += 15;

  // Table Headers
  pdf.setFillColor(59, 130, 246);
  pdf.rect(20, currentY - 5, pageWidth - 40, 12, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  
  const headers = ['Date', 'Vendor', 'Category', 'Amount (₹)', 'Status'];
  const colWidths = [25, 35, 30, 25, 25];
  let xPos = 25;
  
  headers.forEach((header, index) => {
    pdf.text(header, xPos, currentY + 5);
    xPos += colWidths[index];
  });

  currentY += 12;
  pdf.setTextColor(0, 0, 0);

  // Table Rows
  expenses.forEach((expense, index) => {
    if (currentY > pageHeight - 30) {
      pdf.addPage();
      currentY = 30;
    }

    // Alternate row colors
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, currentY - 2, pageWidth - 40, 10, 'F');
    }

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const rowData = [
      format(new Date(expense.date), 'dd/MM/yyyy'),
      expense.vendor.length > 20 ? expense.vendor.substring(0, 17) + '...' : expense.vendor,
      getCategoryConfig(expense.category).label,
      expense.amount.toLocaleString('en-IN'),
      expense.status.charAt(0).toUpperCase() + expense.status.slice(1)
    ];

    xPos = 25;
    rowData.forEach((data, colIndex) => {
      // Color coding for status
      if (colIndex === 4) {
        switch (expense.status) {
          case 'approved':
            pdf.setTextColor(34, 197, 94); // Green
            break;
          case 'pending':
            pdf.setTextColor(234, 179, 8); // Yellow
            break;
          case 'reimbursed':
            pdf.setTextColor(59, 130, 246); // Blue
            break;
          case 'rejected':
            pdf.setTextColor(239, 68, 68); // Red
            break;
          default:
            pdf.setTextColor(0, 0, 0);
        }
      } else {
        pdf.setTextColor(0, 0, 0);
      }
      
      pdf.text(data, xPos, currentY + 5);
      xPos += colWidths[colIndex];
    });

    currentY += 12;
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Page ${i} of ${totalPages}`,
      20,
      pageHeight - 10
    );
  }

  // Save the PDF
  const fileName = `expense-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(fileName);
};