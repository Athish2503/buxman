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
    const lowerText = text.toLowerCase();
    
    // 1. Amount detection (Rs, INR, Amount)
    const amountMatch = text.match(/(?:rs\.?|inr|amt|debited|purchased|spent)\s*(?:of)?\s*([\d,]+\.?\d*)/i) ||
                        text.match(/([\d,]+\.?\d*)\s*(?:rs\.?|inr|amt|debited|purchased|spent)/i);
    if (!amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount === 0) return null;

    // 2. Vendor detection
    // Patterns: "at [VENDOR]", "to [VENDOR]", "spent on [VENDOR]", "vpa [VENDOR]"
    const vendorMatch = text.match(/(?:at|to|spent on|vpa|into|merchant|towards)\s+([A-Z0-9\s]+?)(?=\s+(?:on|using|info|ref|at|dated|for|$))/i) ||
                       text.match(/(?:paid to)\s+([A-Z0-9\s]+?)(?=\s+(?:on|using|$))/i);
    
    let vendor = vendorMatch ? vendorMatch[1].trim() : 'Unknown Merchant';
    // Clean up vendor (remove 'the', extra spaces)
    vendor = vendor.replace(/\b(the|a|an)\b/gi, '').trim();

    return {
      amount,
      vendor,
      date: new Date().toISOString().split('T')[0]
    };
  }
};
