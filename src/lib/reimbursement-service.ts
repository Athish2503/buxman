import { ReimbursementReport } from '@/types/expense';
import { storageEngine } from '@/lib/storage-engine';
import { storageService } from '@/lib/storage';

const REPORT_STORAGE_KEY = 'reimburse_reports_v1';

export const reimbursementService = {
  getReports(): ReimbursementReport[] {
    try {
      const stored = localStorage.getItem(REPORT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveReports(reports: ReimbursementReport[]): void {
    storageEngine.set(REPORT_STORAGE_KEY, JSON.stringify(reports));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('reimburse-reports-updated'));
    }
  },

  addReport(report: Omit<ReimbursementReport, 'id' | 'status' | 'date'>): ReimbursementReport {
    const reports = this.getReports();
    const newReport: ReimbursementReport = {
      ...report,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      status: 'pending',
    };
    reports.unshift(newReport);
    this.saveReports(reports);
    return newReport;
  },

  markAsReimbursed(reportId: string): void {
    const reports = this.getReports();
    const index = reports.findIndex(r => r.id === reportId);
    if (index !== -1 && reports[index].status !== 'reimbursed') {
      reports[index].status = 'reimbursed';
      // Mark all containing expenses as reimbursed
      storageService.batchUpdateStatus(reports[index].expenseIds, 'reimbursed');
      this.saveReports(reports);
    }
  },

  deleteReport(reportId: string): void {
    const reports = this.getReports();
    const filtered = reports.filter(r => r.id !== reportId);
    this.saveReports(filtered);
  }
};
