/** Sana: ISO -> "DD.MM.YYYY" */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Sana+vaqt: ISO -> "DD.MM.YYYY, HH:MM" */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(iso)}, ${hh}:${mm}`;
}

/** Pul: 1500000 -> "1 500 000 so'm" */
export function formatMoney(amount?: number | null, currency = 'UZS'): string {
  if (amount == null) return '—';
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const suffix = currency === 'UZS' ? "so'm" : currency;
  return `${grouped} ${suffix}`;
}

/** Hafta kuni tartib raqami (dushanba=0) — jadval guruhlash uchun */
export const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
