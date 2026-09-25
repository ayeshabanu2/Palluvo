export function formatINR(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
  return '₹' + Number(amount).toLocaleString('en-IN');
}
