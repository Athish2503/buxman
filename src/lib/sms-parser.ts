import { ExpenseCategory } from '@/types/expense';

interface ParsedSMS {
  amount: number;
  vendor: string;
  date: string;
}

export const smsParser = {
  /**
   * Parses common bank/transaction SMS patterns
   * Examples:
   * "HDFC Bank: Rs. 500.00 spent at AMAZON on 01-MAY-26. Info: POS"
   * "You have spent Rs 1,200.00 on your SBI Card at STARBUCKS"
   * "Transaction of Rs.250.00 made on ICICI Bank Card at SWIGGY"
   */
  parse(text: string): ParsedSMS | null {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    
    // Check if it looks like a transaction message
    const transactionKeywords = ['rs.', 'inr', 'amt', 'debited', 'spent', 'paid', 'withdrawal', 'transaction', 'vpa', 'upi', 'merchant', 'credited'];
    const hasKeyword = transactionKeywords.some(kw => lowerText.includes(kw));
    if (!hasKeyword) return null;

    // 1. Amount detection (Rs, INR, Amount)
    // Supports: "Rs 500", "Rs. 500", "INR 500", "500.00 spent", "debited for 500"
    const amountMatch = text.match(/(?:rs\.?|inr|amt|debited|purchased|spent|paid|withdrawal|for)\s*(?:of)?\s*([\d,]+\.?\d*)/i) ||
                        text.match(/([\d,]+\.?\d*)\s*(?:rs\.?|inr|amt|debited|purchased|spent|paid|withdrawal)/i) ||
                        text.match(/vpa\s*[\d,]+\.?\d*/i); // Fallback for some UPI formats

    if (!amountMatch) return null;
    
    // Extract number from match
    const amountStr = amountMatch[1] || amountMatch[0].match(/[\d,]+\.?\d*/)?.[0];
    if (!amountStr) return null;

    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(amount) || amount === 0) return null;

    // 2. Vendor detection
    // Patterns: "at [VENDOR]", "to [VENDOR]", "spent on [VENDOR]", "vpa [VENDOR]", "towards [VENDOR]"
    const vendorMatch = text.match(/(?:at|to|spent on|vpa|into|merchant|towards|transfer to|paid to)\s+([A-Z0-9\s\.\*\-]+?)(?=\s+(?:on|using|info|ref|at|dated|for|balance|from|$))/i);
    
    let vendor = vendorMatch ? vendorMatch[1].trim() : '';
    
    // Fallback vendor detection
    if (!vendor) {
        // Try to find uppercase words that look like a vendor
        const upperMatch = text.match(/(?:spent|paid|to)\s+([A-Z][A-Z\s]+)(?=\s|$)/);
        if (upperMatch) vendor = upperMatch[1].trim();
    }

    // Clean up vendor
    vendor = vendor.replace(/\b(the|a|an|is|your|for)\b/gi, '').replace(/\*+$/, '').trim();
    if (vendor.length > 40) vendor = vendor.substring(0, 37) + '...';

    return {
      amount,
      vendor: vendor || 'Unknown Merchant',
      date: new Date().toISOString().split('T')[0]
    };
  }
};
