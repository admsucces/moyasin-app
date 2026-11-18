export const formatCurrency = (val) => {
  if (val === null || val === undefined) {
    return 'Rp 0';
  }
  const num = Number(val) || 0;
  const absVal = Math.abs(num);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);
  if (num < 0) return `(${formatted})`;
  return formatted;
};

export const formatNumber = (val) => {
  if (val === null || val === undefined) {
    return '0';
  }
  const num = Number(val) || 0;
  const absVal = Math.abs(num);
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);
  if (num < 0) return `(${formatted})`;
  return formatted;
};

export default {
  formatCurrency,
  formatNumber,
};
