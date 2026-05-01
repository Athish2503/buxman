import { Expense } from '@/types/expense';
import { getCategoryConfig } from '@/lib/categories';
import { format } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportCSV = (expenses: Expense[], filename?: string): void => {
  const headers = ['#', 'Date', 'Vendor', 'Category', 'Amount (INR)', 'Status', 'Description', 'Tags', 'Project Code', 'Created At'];

  const rows = expenses.map((e, i) => [
    i + 1,
    format(new Date(e.date), 'dd MMM yyyy'),
    `"${e.vendor.replace(/"/g, '""')}"`,
    getCategoryConfig(e.category).label,
    e.amount.toFixed(2),
    e.status,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    `"${(e.tags || []).join(', ')}"`,
    e.projectCode || '',
    format(new Date(e.createdAt), 'dd MMM yyyy HH:mm'),
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const actualFilename = filename || `reimburse-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;

  if (Capacitor.isNativePlatform()) {
    const saveAndShare = async () => {
      try {
        const result = await Filesystem.writeFile({
          path: `Documents/${actualFilename}`,
          data: csvContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'Expense Export',
          text: 'Here is your expense export in CSV format.',
          url: result.uri,
          dialogTitle: 'Share CSV',
        });
      } catch (e) {
        console.error('Failed to export CSV on native:', e);
      }
    };
    saveAndShare();
  } else {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = actualFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
