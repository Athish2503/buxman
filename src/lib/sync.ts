import { storageEngine } from './storage-engine';

const QUEUE_KEY = 'reimburse_sync_queue';

interface SyncAction {
  id: string;
  type: 'add' | 'update' | 'delete';
  payload: any;
  timestamp: string;
}

class SyncService {
  private queue: SyncAction[] = [];

  constructor() {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (stored) this.queue = JSON.parse(stored);
    
    // Periodically check connection and "sync"
    window.addEventListener('online', () => this.processQueue());
    setInterval(() => this.processQueue(), 30000); // Every 30s
  }

  private saveQueue() {
    storageEngine.set(QUEUE_KEY, JSON.stringify(this.queue));
  }

  enqueue(type: SyncAction['type'], id: string, payload: any) {
    this.queue.push({
      id,
      type,
      payload,
      timestamp: new Date().toISOString()
    });
    this.saveQueue();
    this.processQueue();
  }

  async processQueue() {
    if (!navigator.onLine || this.queue.length === 0) return;

    console.log(`[SyncService] Processing ${this.queue.length} actions...`);
    
    // In a real app, you'd send these to an API.
    // Here we simulate a successful sync.
    const actionsToSync = [...this.queue];
    
    for (const action of actionsToSync) {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[SyncService] Successfully synced ${action.type} for ${action.id}`);
        
        // Remove from queue
        this.queue = this.queue.filter(a => a !== action);
        this.saveQueue();
      } catch (e) {
        console.error(`[SyncService] Failed to sync ${action.id}`, e);
        break; // Stop processing if one fails
      }
    }
  }

  getPendingCount() {
    return this.queue.length;
  }
}

export const syncService = new SyncService();
