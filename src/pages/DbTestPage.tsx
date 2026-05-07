import React, { useState } from 'react';
import { useTransactions, useCategories, useDatabase } from '../db/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, RefreshCw, Download, Upload } from 'lucide-react';
import { MigrationManager } from '../db/MigrationManager';
import { DataExporter } from '../db/DataExporter';
import { toast } from 'sonner';

export default function DbTestPage() {
  const { isLoading: dbLoading, error: dbError } = useDatabase();
  const { transactions, addTransaction, deleteTransaction, refreshTransactions, isLoading: txLoading } = useTransactions();
  const { categories, addCategory, refreshCategories } = useCategories();
  
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');

  const handleAddTransaction = async () => {
    if (!amount) return;
    
    try {
      await addTransaction({
        id: crypto.randomUUID(),
        amount: parseFloat(amount),
        merchant,
        type: 'expense',
        timestamp: new Date().toISOString(),
        status: 'completed'
      });
      setAmount('');
      setMerchant('');
      toast.success('Transaction added to SQLite');
    } catch (e) {
      toast.error('Failed to add transaction');
    }
  };

  const handleMigrate = async () => {
    try {
      await MigrationManager.backupBeforeMigration();
      await MigrationManager.migrateAll();
      await refreshTransactions();
      await refreshCategories();
      toast.success('Migration successful');
    } catch (e) {
      toast.error('Migration failed');
    }
  };

  if (dbLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">SQLite Architecture</h1>
        <p className="text-muted-foreground text-sm">Offline-first production-grade database system.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={handleMigrate} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Run Migration
        </Button>
        <Button onClick={() => DataExporter.exportToJSON()} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Transaction (SQLite)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input 
              type="number" 
              placeholder="Amount" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
            />
            <Input 
              placeholder="Merchant" 
              value={merchant} 
              onChange={e => setMerchant(e.target.value)} 
            />
          </div>
          <Button onClick={handleAddTransaction} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Save to Database
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <span className="text-xs text-muted-foreground">{transactions.length} items in SQLite</span>
        </div>
        
        {txLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
            No transactions found in SQLite.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
                <div>
                  <div className="font-medium">₹{tx.amount}</div>
                  <div className="text-xs text-muted-foreground">{tx.merchant || 'Unknown Merchant'} • {new Date(tx.timestamp).toLocaleDateString()}</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => deleteTransaction(tx.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
