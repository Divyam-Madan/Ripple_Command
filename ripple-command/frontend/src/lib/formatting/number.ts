export const formatCurrencyINR = (value: number): string => {
  if (Math.abs(value) >= 100000) return `\u20b9${(value / 100000).toFixed(1)}L`;
  return `\u20b9${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const formatUnits = (value: number): string => `${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })} units`;

export const formatHours = (value: number): string => (value < 1 ? `${Math.round(value * 60)}m` : `${value.toFixed(1)}h`);

export const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;
