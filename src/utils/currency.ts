/**
 * Formats a number into Indian Rupee format (e.g. ₹1,74,350 or ₹18,000)
 */
export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }
  const num = Math.round(Number(amount));
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Formats a number with +/- sign for deductions/bonuses
 */
export function formatINRAmountSigned(amount: number, type: 'deduction' | 'bonus' | 'neutral'): string {
  const formatted = formatINR(Math.abs(amount));
  if (amount === 0) return '₹0';
  if (type === 'deduction') return `−${formatted}`;
  if (type === 'bonus') return `+${formatted}`;
  return formatted;
}
