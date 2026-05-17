import { createWorker } from 'tesseract.js';
import { localIntelligence } from './intelligence';
import { format } from 'date-fns';

export interface ParsedOCRData {
  vendor?: string;
  amount?: number;
  date?: string;
  category?: string;
  taxAmount?: number;
  rawText: string;
}

export const ocrService = {
  /**
   * Scans a receipt base64 image completely offline via WebWorker and WebAssembly.
   */
  async scanReceipt(
    base64Image: string, 
    onStatus?: (status: string, progress: number) => void
  ): Promise<ParsedOCRData> {
    let worker: any = null;
    try {
      if (onStatus) onStatus('Initializing local Wasm worker...', 0.15);
      
      // Initialize Tesseract.js worker using modern v5 syntax:
      // createWorker(language, oem, options)
      worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m && m.status === 'recognizing' && onStatus) {
            const pct = Math.floor(m.progress * 100);
            onStatus(`Reading text... ${pct}%`, 0.3 + m.progress * 0.6);
          }
        }
      });
      
      if (onStatus) onStatus('Analyzing pixels...', 0.3);
      const { data: { text } } = await worker.recognize(base64Image);
      
      if (onStatus) onStatus('Categorizing details...', 0.95);
      const parsed = this.parseRawText(text);
      
      await worker.terminate();
      return parsed;
    } catch (error) {
      console.error('OCR Offline processing error:', error);
      if (worker) {
        try { await worker.terminate(); } catch {}
      }
      throw error;
    }
  },

  /**
   * Applies rigorous heuristic analysis to OCR text to isolate key finance entities.
   */
  parseRawText(text: string): ParsedOCRData {
    const rawText = text || '';
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const data: ParsedOCRData = { rawText };
    const lowerText = rawText.toLowerCase();

    // 1. EXTRACT VENDOR NAME
    // Usually the very first lines contain the brand/store name
    const ignoredVendorWords = [
      'tax', 'invoice', 'receipt', 'bill', 'tel', 'phone', 'date', 'gst', 'order',
      'welcome', 'cashier', 'store', 'terminal', 'card', 'payment', 'cash', 'original',
      'copy', 'duplicate', 'customer', 'retail', 'pos', 'pax', 'total', 'grand'
    ];

    let foundVendor = '';
    for (const line of lines) {
      const isHeaderLine = line.length > 2 && line.length < 40 && !line.includes('/') && !line.includes(':');
      if (isHeaderLine) {
        const containsIgnored = ignoredVendorWords.some(w => line.toLowerCase().includes(w));
        // Also avoid pure number lines (like zip codes or phone numbers)
        const isPureNumber = /^\d+$/.test(line.replace(/[\s\-\(\)\+]+/g, ''));
        
        if (!containsIgnored && !isPureNumber) {
          foundVendor = line;
          break;
        }
      }
    }

    if (foundVendor) {
      // Capitalise and clean
      data.vendor = foundVendor.replace(/[^a-zA-Z0-9\s'&]/g, '').trim();
    } else {
      data.vendor = 'Offline Merchant';
    }

    // 2. EXTRACT TRANSACTION DATE
    // Match common date patterns: DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, DD MMM YYYY
    const dateRegexes = [
      /\b(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})\b/, // 15/05/2026
      /\b(\d{4})[\/\.-](\d{2})[\/\.-](\d{2})\b/, // 2026-05-15
      /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i, // 15 May 2026
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\s*,\s*(\d{4})\b/i // May 15, 2026
    ];

    let parsedDate: Date | null = null;

    for (const regex of dateRegexes) {
      const match = rawText.match(regex);
      if (match) {
        try {
          if (regex === dateRegexes[0]) {
            // DD/MM/YYYY
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            const year = parseInt(match[3]);
            parsedDate = new Date(year, month, day);
          } else if (regex === dateRegexes[1]) {
            // YYYY/MM/DD
            const year = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            const day = parseInt(match[3]);
            parsedDate = new Date(year, month, day);
          } else {
            // Month words
            const day = parseInt(match[1] || match[2]);
            const monthStr = (match[2] || match[1]).toLowerCase().substring(0, 3);
            const year = parseInt(match[3]);
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const month = months.indexOf(monthStr);
            if (month !== -1) {
              parsedDate = new Date(year, month, day);
            }
          }
          if (parsedDate && !isNaN(parsedDate.getTime())) break;
        } catch (e) {}
      }
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      data.date = format(parsedDate, 'yyyy-MM-dd');
    } else {
      data.date = format(new Date(), 'yyyy-MM-dd'); // Default to today
    }

    // 3. EXTRACT TOTAL AMOUNT
    // Find lines containing words like: TOTAL, GRAND, NET, DUE, PAID, AMOUNT followed by decimal
    const totalLines = lines.filter(line => {
      const l = line.toLowerCase();
      return (l.includes('total') || l.includes('grand') || l.includes('net') || l.includes('due') || l.includes('paid') || l.includes('amount')) && 
             (l.includes('rs') || l.includes('inr') || l.includes('₹') || l.includes('$') || /\d+\.\d{2}/.test(l));
    });

    let foundAmount = 0;

    for (const line of totalLines) {
      // Find all numbers with decimals
      const matches = line.match(/\d+[\.,]\d{2}/g) || line.match(/\d+[\.,]\d{1,2}/g) || line.match(/\d+/g);
      if (matches) {
        // Parse floats and clean commas (European format or comma decimals)
        const vals = matches.map(m => parseFloat(m.replace(',', '.')));
        const maxVal = Math.max(...vals);
        if (maxVal > foundAmount) {
          foundAmount = maxVal;
        }
      }
    }

    // Fallback: If no dedicated "Total" line parsed, find the largest float on the receipt.
    // Often receipts have card numbers or timestamps, so we filter out numbers > 100,000 (usually account numbers)
    // and numbers matching date patterns.
    if (foundAmount === 0) {
      const allFloats = rawText.match(/\b\d+[\.,]\d{2}\b/g);
      if (allFloats) {
        const cleanedFloats = allFloats
          .map(f => parseFloat(f.replace(',', '.')))
          .filter(val => val > 1 && val < 50000); // realistic boundaries for expense limits
        if (cleanedFloats.length > 0) {
          foundAmount = Math.max(...cleanedFloats);
        }
      }
    }

    if (foundAmount > 0) {
      data.amount = foundAmount;
    } else {
      data.amount = 0;
    }

    // 4. EXTRACT TAX / GST AMOUNT
    // Search for CGST, SGST, IGST, VAT, TAX
    const taxLines = lines.filter(line => {
      const l = line.toLowerCase();
      return l.includes('gst') || l.includes('cgst') || l.includes('sgst') || l.includes('vat') || l.includes('tax') || l.includes('service charge');
    });

    let maxTax = 0;
    for (const line of taxLines) {
      const matches = line.match(/\d+[\.,]\d{2}/g) || line.match(/\d+/g);
      if (matches) {
        const vals = matches.map(m => parseFloat(m.replace(',', '.'))).filter(v => v < (data.amount || 100000));
        if (vals.length > 0) {
          const mTax = Math.max(...vals);
          if (mTax > maxTax) maxTax = mTax;
        }
      }
    }
    if (maxTax > 0) {
      data.taxAmount = maxTax;
    }

    // 5. RUN AUTO-CATEGORIZATION PREDICTION
    data.category = localIntelligence.predictCategory(data.vendor || '', data.amount || 0);

    return data;
  }
};
