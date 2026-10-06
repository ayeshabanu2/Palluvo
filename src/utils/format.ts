export function formatINR(amount: number | string | null | undefined): string {
  const num = Number(amount);
  const valid = isNaN(num) || amount === null || amount === undefined ? 0 : num;
  return '₹' + valid.toLocaleString('en-IN');
}
