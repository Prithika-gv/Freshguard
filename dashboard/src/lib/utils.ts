import clsx from 'clsx';

export const cn = (...inputs: Array<string | false | null | undefined>) => clsx(inputs);

export const statusClasses = (status: string) => ({
  Running: 'bg-emerald-100 text-emerald-800',
  Warehouse: 'bg-amber-100 text-amber-800',
  Maintenance: 'bg-rose-100 text-rose-800',
  SAFE: 'bg-emerald-100 text-emerald-800',
  WARNING: 'bg-amber-100 text-amber-800',
  'CRITICAL ALERT': 'bg-rose-100 text-rose-800',
}[status] || 'bg-slate-100 text-slate-700');

export const formatTimestamp = () => new Date().toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});
