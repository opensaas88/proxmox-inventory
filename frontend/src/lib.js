// ── Shared constants & formatters ───────────────────────────

export const ACCENT = "#10b981";
export const COLORS = ["#10b981", "#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#64748b", "#84cc16"];

export const OS_MAP = {
  ubuntu: { color: "#E95420", icon: "🟠" },
  debian: { color: "#A80030", icon: "🌀" },
  centos: { color: "#932279", icon: "🔴" },
  rocky: { color: "#10B981", icon: "🪨" },
  alma: { color: "#1E3050", icon: "🟤" },
  alpine: { color: "#0D597F", icon: "🏔" },
  fedora: { color: "#51A2DA", icon: "🔵" },
  windows: { color: "#0078D4", icon: "🪟" },
  linux: { color: "#FCC624", icon: "🐧" },
};

export function getOsMeta(os) {
  if (!os) return { color: "#94a3b8", icon: "💻", family: "Inconnu" };
  const l = os.toLowerCase();
  for (const [k, v] of Object.entries(OS_MAP)) {
    if (l.includes(k)) return { ...v, family: k.charAt(0).toUpperCase() + k.slice(1) };
  }
  if (l.includes("win")) return { ...OS_MAP.windows, family: "Windows" };
  return { color: "#94a3b8", icon: "🐧", family: "Linux" };
}

export function formatBytes(b, dec = 1) {
  if (!b) return "0 B";
  const k = 1024;
  const s = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k, i)).toFixed(dec) + " " + s[i];
}
export function toGiB(b) { return +(b / 1073741824).toFixed(1); }
export function toTiB(b) { return +(b / 1099511627776).toFixed(2); }
export function formatUptime(s) {
  if (!s) return "—";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  return d > 0 ? `${d}j ${h}h` : `${h}h`;
}
export function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
