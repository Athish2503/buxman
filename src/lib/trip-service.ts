import { Trip, SettleUpSummary } from '@/types/split';
import { Expense } from '@/types/expense';
import { storageEngine } from './storage-engine';
import { storageService } from './storage';

const TRIPS_KEY = 'reimburse_trips';

export const tripService = {
  getTrips(): Trip[] {
    try {
      const stored = localStorage.getItem(TRIPS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveTrips(trips: Trip[]): void {
    storageEngine.set(TRIPS_KEY, JSON.stringify(trips));
  },

  addTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'expenseIds'>): Trip {
    const trips = this.getTrips();
    const newTrip: Trip = {
      ...trip,
      id: crypto.randomUUID(),
      expenseIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    trips.unshift(newTrip);
    this.saveTrips(trips);
    return newTrip;
  },

  updateTrip(trip: Trip): void {
    const trips = this.getTrips();
    const index = trips.findIndex(t => t.id === trip.id);
    if (index !== -1) {
      trips[index] = { ...trip, updatedAt: new Date().toISOString() };
      this.saveTrips(trips);
    }
  },

  deleteTrip(id: string): void {
    const trips = this.getTrips();
    const filtered = trips.filter(t => t.id !== id);
    this.saveTrips(filtered);
  },

  getTripExpenses(tripId: string): Expense[] {
    const expenses = storageService.getExpenses();
    return expenses.filter(e => e.tripId === tripId);
  },

  addExpenseToTrip(tripId: string, expenseId: string): void {
    const trips = this.getTrips();
    const index = trips.findIndex(t => t.id === tripId);
    if (index !== -1) {
      if (!trips[index].expenseIds.includes(expenseId)) {
        trips[index].expenseIds.push(expenseId);
        trips[index].updatedAt = new Date().toISOString();
        this.saveTrips(trips);
      }
    }
  },

  calculateSettlement(tripId: string): SettleUpSummary[] {
    const trip = this.getTrips().find(t => t.id === tripId);
    if (!trip) return [];

    const tripExpenses = this.getTripExpenses(tripId);
    const summaries: Record<string, SettleUpSummary> = {};

    // Initialize summaries for all participants + current user
    const allPeople = [...trip.participants, 'user'];
    allPeople.forEach(pid => {
      summaries[pid] = {
        contactId: pid,
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0
      };
    });

    tripExpenses.forEach(expense => {
      const payerId = expense.paidBy || 'user';
      
      // Add to payer's totalPaid
      if (summaries[payerId]) {
        summaries[payerId].totalPaid += expense.amount;
      }

      if (expense.split) {
        expense.split.members.forEach(member => {
          if (summaries[member.contactId]) {
            summaries[member.contactId].totalOwed += member.amount;
          }
        });

        // The person missing from the split members is always the 'user'
        const sumOthers = expense.split.members.reduce((acc, m) => acc + m.amount, 0);
        const userShare = expense.amount - sumOthers;
        if (summaries['user']) {
          summaries['user'].totalOwed += userShare;
        }
      } else {
        // If no split, payer paid for themselves? 
        // For trips, usually we split. If no split, we assume payer paid 100% for themselves.
        if (summaries[payerId]) {
          summaries[payerId].totalOwed += expense.amount;
        }
      }
    });

    // Calculate net balances
    Object.values(summaries).forEach(s => {
      s.netBalance = s.totalPaid - s.totalOwed;
    });

    return Object.values(summaries);
  },

  getPeerToPeerDebts(tripId: string): { from: string, to: string, amount: number }[] {
    const summaries = this.calculateSettlement(tripId);
    const creditors = summaries.filter(s => s.netBalance > 0.01).sort((a, b) => b.netBalance - a.netBalance);
    const debtors = summaries.filter(s => s.netBalance < -0.01).sort((a, b) => a.netBalance - b.netBalance);

    const transactions: { from: string, to: string, amount: number }[] = [];
    
    let cIdx = 0;
    let dIdx = 0;

    const workingCreditors = creditors.map(c => ({ ...c }));
    const workingDebtors = debtors.map(d => ({ ...d }));

    while (cIdx < workingCreditors.length && dIdx < workingDebtors.length) {
      const creditor = workingCreditors[cIdx];
      const debtor = workingDebtors[dIdx];
      
      const amount = Math.min(creditor.netBalance, Math.abs(debtor.netBalance));
      
      transactions.push({
        from: debtor.contactId,
        to: creditor.contactId,
        amount
      });

      creditor.netBalance -= amount;
      debtor.netBalance += amount;

      if (creditor.netBalance < 0.01) cIdx++;
      if (Math.abs(debtor.netBalance) < 0.01) dIdx++;
    }

    return transactions;
  }
};
