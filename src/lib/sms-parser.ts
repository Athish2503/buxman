import { ExpenseCategory } from '@/types/expense';

interface ParsedSMS {
  amount: number;
  vendor: string;
  date: string;
}

export const smsParser = {
  /**
   * Parses common bank/transaction SMS and notification patterns
   * Examples:
   * "Rs.500.00 debited from A/c **1234 on 16-Aug-26 via UPI ref no 6228xxxxxxxx to VPA merchant@paytm (Avl Bal: Rs.14,500.00). Call 18002586161 if not done. -HDFC Bank"
   * "Sent Rs. 500.00 to merchant@paytm via UPI"
   * "HDFC Bank: Rs. 500.00 spent at AMAZON on 01-MAY-26. Info: POS"
   * "You have spent Rs 1,200.00 on your SBI Card at STARBUCKS"
   */
  parse(text: string): ParsedSMS | null {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    
    const transactionKeywords = [
      'rs.', 'rs', 'inr', 'amt', 'debited', 'debit', 'spent', 'paid', 'sent', 
      'withdrawal', 'transaction', 'vpa', 'upi', 'merchant', 'credited', 'deducted', '₹', 're.'
    ];
    const hasKeyword = transactionKeywords.some(kw => lowerText.includes(kw));
    if (!hasKeyword) return null;

    // Strip available balance clauses so balance numbers aren't confused for transaction amount
    const cleanText = text.replace(/\(?\s*(?:avl|avail|available|net|total|clear|updated)?\s*bal(?:ance)?:?\s*(?:₹|rs\.?|inr|re\.?|rupees?)?\s*[\d,]+\.?\d*\)?/gi, '');

    let amount = 0;
    let vendor = '';

    // Pattern A: "debited for payee SOMASUNDARAM B for Rs. 1200.00"
    const payeeMatch = cleanText.match(/debited\s+for\s+payee\s*(.*?)\s*for\s+(?:rs\.?|inr|₹|re\.?)\s*([\d,]+\.?\d*)/i);
    if (payeeMatch) {
      vendor = payeeMatch[1].trim();
      amount = parseFloat(payeeMatch[2].replace(/,/g, ''));
    }

    // Pattern B: "INR 354 debited from HDFC Bank A/c XX277034 on 07-NOV-25. For: DEBIT CARD ANNUAL FEE-Oct-2025"
    if (!amount) {
      const forMatch = cleanText.match(/(?:inr|rs\.?|₹|re\.?)\s*([\d,]+\.?\d*)\s*debited\s+from.*?for:\s*(.+)/i);
      if (forMatch) {
        amount = parseFloat(forMatch[1].replace(/,/g, ''));
        vendor = forMatch[2].split(/\s+(?:on|ref|txn)/i)[0].trim();
      }
    }

    // Pattern C: Standard amount extraction from cleanText
    if (!amount) {
      const amountMatch = cleanText.match(/(?:rs\.?|inr|amt|debited|purchased|spent|paid|sent|withdrawal|re\.?|₹)\s*(?:of)?\s*([\d,]+\.?\d*)/i) ||
                          cleanText.match(/([\d,]+\.?\d*)\s*(?:rs\.?|inr|amt|debited|purchased|spent|paid|sent|withdrawal|re\.?|₹)/i);

      if (amountMatch) {
        const amountStr = amountMatch[1] || amountMatch[0].match(/[\d,]+\.?\d*/)?.[0];
        if (amountStr) {
          amount = parseFloat(amountStr.replace(/,/g, ''));
        }
      }
    }

    // Vendor / Payee / Merchant extraction if not yet found
    if (amount && !vendor) {
      const vendorMatch = cleanText.match(/(?:to\s+vpa|to\s+upi\s+id|to\s+upi|paid\s+to|sent\s+to|transfer\s+to|trf\s+to|towards|at|to|for)\s+([A-Z0-9\s\.\*\-\_\@]+?)(?=\s+(?:\(avl|\(bal|avl|bal:|call|ref|txn|on|via|using|upi:|a\/c|from|to|for|if\s+not|\-|\.|$))/i);
      if (vendorMatch) {
        vendor = vendorMatch[1].trim();
      } else {
        const upperMatch = cleanText.match(/(?:spent|paid|sent|to)\s+([A-Z][A-Z0-9\s\.\_\@]+)(?=\s|$)/);
        if (upperMatch) vendor = upperMatch[1].trim();
      }
    }

    if (!amount || isNaN(amount)) return null;

    // Clean vendor string
    vendor = vendor.replace(/^(?:vpa|upi\s+id)\s+/i, '').trim();
    vendor = vendor.replace(/\b(the|a|an|is|your|for)\b/gi, '').replace(/\*+$/, '').trim();
    
    if (!vendor || vendor.toLowerCase().includes('unknown')) {
      vendor = 'Unknown Merchant';
    } else if (vendor.length > 40) {
      vendor = vendor.substring(0, 37) + '...';
    }

    // Extract date if present (e.g. 16-Aug-26, 01-MAY-26, 2026-05-08)
    let dateStr = new Date().toISOString().split('T')[0];
    const dateMatch = text.match(/(\d{1,2}[-/](?:\d{1,2}|[a-zA-Z]{3})[-/]\d{2,4})/);
    if (dateMatch) {
      try {
        const parsedDate = new Date(dateMatch[1]);
        if (!isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {
        // Fallback to today
      }
    }

    return {
      amount,
      vendor: vendor.toUpperCase(),
      date: dateStr
    };
  }
};
