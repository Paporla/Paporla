export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return '$0.00';
  const dollars = price / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(dollars);
};