export const MetricCard = ({ label, value, subtext }: { label: string; value: string; subtext?: string }) => (
  <div className="panel">
    <p className="metric-label">{label}</p>
    <p className="metric-value">{value}</p>
    {subtext && <p className="mt-2 text-sm text-slate-500">{subtext}</p>}
  </div>
);
