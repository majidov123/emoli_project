export function formatMoney(value: string | null): string {
  if (value === null) return "—";

  const match = value.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return `${value} ₼`;

  const [, sign, whole, suppliedFraction = ""] = match;
  const fraction = `${suppliedFraction}00`.slice(0, 2);
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${groupedWhole},${fraction} ₼`;
}

export function formatDate(value: string | null): string {
  if (value === null) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
