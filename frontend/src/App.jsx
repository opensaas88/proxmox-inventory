import { useState, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, Treemap,
} from "recharts";
import {
  Server, Cpu, HardDrive, MemoryStick, Monitor, Power,
  Search, Filter, Download, RefreshCw, LogOut, ChevronUp,
  ChevronDown, Activity, Box, Database, Network, Clock, Tag,
  AlertCircle, CheckCircle2, XCircle, LayoutGrid, BarChart3,
  Settings, Layers, ArrowUpDown,
} from "lucide-react";

// ── Palettes & Constants ────────────────────────────────────
const ACCENT = "#0e94ad";
const COLORS = ["#0ea5e9", "#06b6d4", "#14b8a6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b", "#84cc16"];
const OS_MAP = {
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

function getOsMeta(os) {
  if (!os) return { color: "#64748b", icon: "💻", family: "Inconnu" };
  const l = os.toLowerCase();
  for (const [k, v] of Object.entries(OS_MAP)) {
    if (l.includes(k)) return { ...v, family: k.charAt(0).toUpperCase() + k.slice(1) };
  }
  if (l.includes("win")) return { ...OS_MAP.windows, family: "Windows" };
  return { color: "#64748b", icon: "🐧", family: "Linux" };
}

function formatBytes(b, dec = 1) {
  if (!b) return "0 B";
  const k = 1024;
  const s = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k, i)).toFixed(dec) + " " + s[i];
}
function toGiB(b) { return +(b / 1073741824).toFixed(1); }
function toTiB(b) { return +(b / 1099511627776).toFixed(2); }
function formatUptime(s) {
  if (!s) return "—";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  return d > 0 ? `${d}j ${h}h` : `${h}h`;
}
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

// ── Demo Data ───────────────────────────────────────────────
const DEMO = {
  timestamp: new Date().toISOString(),
  nodes: [
    { node: "pve-node01", status: "online", maxcpu: 32, maxmem: 137438953472, mem: 109951162777, cpu: 0.42, uptime: 2592000, disk: 214748364800, maxdisk: 1099511627776 },
    { node: "pve-node02", status: "online", maxcpu: 24, maxmem: 68719476736, mem: 48103633715, cpu: 0.28, uptime: 1296000, disk: 161061273600, maxdisk: 549755813888 },
    { node: "pve-node03", status: "online", maxcpu: 16, maxmem: 34359738368, mem: 20615843020, cpu: 0.15, uptime: 864000, disk: 107374182400, maxdisk: 549755813888 },
  ],
  vms: [
    { vmid: 100, name: "web-prod-01", status: "running", node: "pve-node01", maxmem: 8589934592, maxdisk: 107374182400, cpus: 4, uptime: 2500000, ostype: "l26", template: 0, tags: "production,web", netin: 5368709120, netout: 2147483648, agent_os: "Ubuntu 22.04.3 LTS" },
    { vmid: 101, name: "db-prod-master", status: "running", node: "pve-node01", maxmem: 34359738368, maxdisk: 536870912000, cpus: 8, uptime: 2500000, ostype: "l26", template: 0, tags: "production,database", netin: 10737418240, netout: 8589934592, agent_os: "Debian 12 (Bookworm)" },
    { vmid: 102, name: "db-prod-replica", status: "running", node: "pve-node01", maxmem: 17179869184, maxdisk: 536870912000, cpus: 8, uptime: 2500000, ostype: "l26", template: 0, tags: "production,database", netin: 8589934592, netout: 4294967296, agent_os: "Debian 12 (Bookworm)" },
    { vmid: 103, name: "mail-server", status: "running", node: "pve-node01", maxmem: 4294967296, maxdisk: 214748364800, cpus: 2, uptime: 2400000, ostype: "l26", template: 0, tags: "production,mail", netin: 2147483648, netout: 1073741824, agent_os: "Rocky Linux 9.3" },
    { vmid: 200, name: "win-ad-dc01", status: "running", node: "pve-node02", maxmem: 8589934592, maxdisk: 107374182400, cpus: 4, uptime: 1200000, ostype: "win11", template: 0, tags: "production,ad", netin: 1073741824, netout: 536870912, agent_os: "Windows Server 2022" },
    { vmid: 201, name: "win-ad-dc02", status: "running", node: "pve-node02", maxmem: 8589934592, maxdisk: 107374182400, cpus: 4, uptime: 1200000, ostype: "win11", template: 0, tags: "production,ad", netin: 1073741824, netout: 536870912, agent_os: "Windows Server 2022" },
    { vmid: 202, name: "win-rds-01", status: "running", node: "pve-node02", maxmem: 17179869184, maxdisk: 268435456000, cpus: 8, uptime: 1100000, ostype: "win11", template: 0, tags: "production,rds", netin: 4294967296, netout: 2147483648, agent_os: "Windows Server 2019" },
    { vmid: 203, name: "monitoring", status: "running", node: "pve-node02", maxmem: 4294967296, maxdisk: 107374182400, cpus: 2, uptime: 1200000, ostype: "l26", template: 0, tags: "production,monitoring", netin: 3221225472, netout: 1073741824, agent_os: "Ubuntu 24.04 LTS" },
    { vmid: 300, name: "dev-api-01", status: "running", node: "pve-node03", maxmem: 4294967296, maxdisk: 53687091200, cpus: 2, uptime: 800000, ostype: "l26", template: 0, tags: "development,api", netin: 1073741824, netout: 536870912, agent_os: "Ubuntu 22.04.3 LTS" },
    { vmid: 301, name: "dev-frontend", status: "running", node: "pve-node03", maxmem: 2147483648, maxdisk: 32212254720, cpus: 2, uptime: 800000, ostype: "l26", template: 0, tags: "development,web", netin: 536870912, netout: 268435456, agent_os: "Alpine Linux 3.19" },
    { vmid: 302, name: "ci-runner-01", status: "running", node: "pve-node03", maxmem: 8589934592, maxdisk: 107374182400, cpus: 4, uptime: 700000, ostype: "l26", template: 0, tags: "ci,build", netin: 2147483648, netout: 4294967296, agent_os: "Ubuntu 22.04.3 LTS" },
    { vmid: 303, name: "test-env", status: "stopped", node: "pve-node03", maxmem: 4294967296, maxdisk: 53687091200, cpus: 2, uptime: 0, ostype: "l26", template: 0, tags: "test", netin: 0, netout: 0, agent_os: "CentOS Stream 9" },
    { vmid: 304, name: "backup-srv", status: "running", node: "pve-node03", maxmem: 2147483648, maxdisk: 1099511627776, cpus: 2, uptime: 800000, ostype: "l26", template: 0, tags: "production,backup", netin: 10737418240, netout: 536870912, agent_os: "Debian 11 (Bullseye)" },
    { vmid: 305, name: "vpn-gateway", status: "running", node: "pve-node03", maxmem: 1073741824, maxdisk: 21474836480, cpus: 1, uptime: 800000, ostype: "l26", template: 0, tags: "production,network", netin: 21474836480, netout: 21474836480, agent_os: "Alpine Linux 3.19" },
    { vmid: 999, name: "tpl-ubuntu-2204", status: "stopped", node: "pve-node01", maxmem: 2147483648, maxdisk: 32212254720, cpus: 2, uptime: 0, ostype: "l26", template: 1, tags: "template", netin: 0, netout: 0, agent_os: "Ubuntu 22.04.3 LTS" },
    { vmid: 998, name: "tpl-debian-12", status: "stopped", node: "pve-node01", maxmem: 2147483648, maxdisk: 32212254720, cpus: 2, uptime: 0, ostype: "l26", template: 1, tags: "template", netin: 0, netout: 0, agent_os: "Debian 12 (Bookworm)" },
  ],
  containers: [],
  storage: [],
};

// ── Reusable Components ─────────────────────────────────────

function StatusDot({ status, size = "sm" }) {
  const s = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const c = status === "running" || status === "online"
    ? "bg-emerald-400 shadow-emerald-400/40 shadow-sm"
    : status === "paused" ? "bg-amber-400" : "bg-slate-600";
  return <span className={`inline-block rounded-full ${s} ${c} ${status === "running" || status === "online" ? "animate-pulse-slow" : ""}`} />;
}

function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-slate-800 text-slate-400 border-slate-700/50",
    success: "bg-emerald-950/60 text-emerald-400 border-emerald-800/40",
    warning: "bg-amber-950/60 text-amber-400 border-amber-800/40",
    danger: "bg-red-950/60 text-red-400 border-red-800/40",
    info: "bg-pve-950/60 text-pve-300 border-pve-800/40",
    template: "bg-violet-950/60 text-violet-400 border-violet-800/40",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value, max, color = "bg-pve-500", height = "h-1.5" }) {
  const p = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`w-full ${height} rounded-full bg-slate-800/80 overflow-hidden`}>
      <div className={`${height} rounded-full ${color} transition-all duration-700`} style={{ width: `${p}%` }} />
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color = "text-pve-400", delay = "" }) {
  return (
    <div className={`glass-panel p-5 animate-slide-up ${delay}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-slate-800/80 ${color}`}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>
      <p className="metric-value text-slate-100">{value}</p>
      <p className="section-title mt-1">{label}</p>
      {sub && <p className="text-[11px] text-slate-600 mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-700/50 rounded-lg px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="text-slate-300 font-display font-semibold mb-1">{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color || p.fill }} />
          {p.dataKey}: <span className="text-slate-200 font-mono">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Export CSV ───────────────────────────────────────────────
function exportCsv(vms) {
  const header = "VMID;Nom;Etat;Noeud;OS;vCPU;RAM (GiB);Disque (GiB);Uptime;Tags\n";
  const rows = vms.map((v) =>
    [v.vmid, v.name, v.status, v.node, v.agent_os || "", v.cpus, toGiB(v.maxmem), toGiB(v.maxdisk), formatUptime(v.uptime), v.tags || ""].join(";")
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proxmox-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Connection Screen ───────────────────────────────────────

function ConnectionScreen({ onConnect, loading, error }) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8006");
  const [tokenId, setTokenId] = useState("");
  const [tokenSecret, setTokenSecret] = useState("");

  const canSubmit = host && tokenId && tokenSecret;

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pve-600/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pve-500 to-cyan-500 mb-5 shadow-lg shadow-pve-500/20">
            <Server size={28} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white">Proxmox <span className="text-gradient">Inventory</span></h1>
          <p className="text-slate-500 text-sm mt-2 font-display">Connectez-vous à votre cluster Proxmox VE</p>
        </div>

        {/* Form */}
        <div className="glass-panel p-6 space-y-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="section-title mb-1.5 block">Hôte / IP</label>
              <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.100"
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3.5 py-2.5 text-slate-200 placeholder-slate-700 text-sm font-mono focus:outline-none focus:border-pve-500/50 focus:ring-1 focus:ring-pve-500/20 transition-all" />
            </div>
            <div className="w-20">
              <label className="section-title mb-1.5 block">Port</label>
              <input type="text" value={port} onChange={(e) => setPort(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm font-mono text-center focus:outline-none focus:border-pve-500/50 focus:ring-1 focus:ring-pve-500/20 transition-all" />
            </div>
          </div>

          <div>
            <label className="section-title mb-1.5 block">API Token ID</label>
            <input type="text" value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="user@pam!mytoken"
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3.5 py-2.5 text-slate-200 placeholder-slate-700 text-sm font-mono focus:outline-none focus:border-pve-500/50 focus:ring-1 focus:ring-pve-500/20 transition-all" />
          </div>

          <div>
            <label className="section-title mb-1.5 block">Token Secret</label>
            <input type="password" value={tokenSecret} onChange={(e) => setTokenSecret(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3.5 py-2.5 text-slate-200 placeholder-slate-700 text-sm font-mono focus:outline-none focus:border-pve-500/50 focus:ring-1 focus:ring-pve-500/20 transition-all" />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-800/30">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={() => onConnect({ host, port, tokenId, tokenSecret })} disabled={!canSubmit || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-pve-600 to-pve-500 hover:from-pve-500 hover:to-pve-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-display font-semibold py-2.5 rounded-lg transition-all text-sm shadow-lg shadow-pve-600/20">
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Power size={16} />}
              {loading ? "Connexion…" : "Connecter"}
            </button>
            <button onClick={() => onConnect({ demo: true })}
              className="px-5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 font-display font-semibold py-2.5 rounded-lg transition-all text-sm">
              Démo
            </button>
          </div>
        </div>

        {/* Help */}
        <div className="mt-5 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <p className="text-slate-500 text-xs leading-relaxed font-display">
            <strong className="text-slate-400">Configuration requise</strong> — Créez un API Token dans Proxmox VE :
            <span className="font-mono text-pve-400"> Datacenter → Permissions → API Tokens</span>.
            Le token doit disposer des droits de lecture (<span className="font-mono text-slate-400">PVEAuditor</span>).
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────

function Dashboard({ data, onRefresh, onDisconnect, refreshing }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nodeFilter, setNodeFilter] = useState("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [sortKey, setSortKey] = useState("vmid");
  const [sortDir, setSortDir] = useState("asc");
  const [activeTab, setActiveTab] = useState("inventory");
  const [selectedVm, setSelectedVm] = useState(null);

  const { nodes, vms } = data;
  const realVms = useMemo(() => vms.filter((v) => !v.template), [vms]);
  const templates = useMemo(() => vms.filter((v) => v.template), [vms]);
  const running = useMemo(() => realVms.filter((v) => v.status === "running"), [realVms]);

  // Aggregates
  const totalCpu = useMemo(() => realVms.reduce((s, v) => s + (v.cpus || 0), 0), [realVms]);
  const totalRam = useMemo(() => realVms.reduce((s, v) => s + (v.maxmem || 0), 0), [realVms]);
  const totalDisk = useMemo(() => realVms.reduce((s, v) => s + (v.maxdisk || 0), 0), [realVms]);
  const hostCpu = useMemo(() => nodes.reduce((s, n) => s + (n.maxcpu || 0), 0), [nodes]);
  const hostRam = useMemo(() => nodes.reduce((s, n) => s + (n.maxmem || 0), 0), [nodes]);

  // Filtered & sorted VMs
  const filteredVms = useMemo(() => {
    let list = showTemplates ? vms : realVms;
    if (statusFilter !== "all") list = list.filter((v) => v.status === statusFilter);
    if (nodeFilter !== "all") list = list.filter((v) => v.node === nodeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        v.name?.toLowerCase().includes(q) ||
        v.agent_os?.toLowerCase().includes(q) ||
        String(v.vmid).includes(q) ||
        v.tags?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let va = a[sortKey] ?? "", vb = b[sortKey] ?? "";
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb + "").toLowerCase(); }
      return sortDir === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
  }, [vms, realVms, showTemplates, statusFilter, nodeFilter, search, sortKey, sortDir]);

  // Chart data
  const osData = useMemo(() => {
    const map = {};
    realVms.forEach((vm) => {
      const { family } = getOsMeta(vm.agent_os);
      map[family] = (map[family] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [realVms]);

  const nodeData = useMemo(() => nodes.map((n) => {
    const nVms = realVms.filter((v) => v.node === n.node);
    return {
      name: n.node.replace("pve-", ""),
      vms: nVms.length,
      vCPU: nVms.reduce((s, v) => s + v.cpus, 0),
      "RAM (GiB)": toGiB(nVms.reduce((s, v) => s + v.maxmem, 0)),
    };
  }), [nodes, realVms]);

  const diskTreemap = useMemo(() =>
    realVms.map((v) => ({ name: v.name, size: v.maxdisk, os: getOsMeta(v.agent_os).family }))
      .filter((v) => v.size > 0)
      .sort((a, b) => b.size - a.size),
    [realVms]
  );

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortHeader = ({ col, children, className = "" }) => (
    <th onClick={() => handleSort(col)}
      className={`text-left px-4 py-3 section-title cursor-pointer select-none hover:text-slate-300 transition-colors group ${className}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortKey === col
          ? (sortDir === "asc" ? <ChevronUp size={12} className="text-pve-400" /> : <ChevronDown size={12} className="text-pve-400" />)
          : <ArrowUpDown size={10} className="text-slate-700 group-hover:text-slate-500 transition-colors" />
        }
      </span>
    </th>
  );

  const tabs = [
    { id: "inventory", label: "Inventaire", icon: Layers },
    { id: "analytics", label: "Analytique", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-grid">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pve-500 to-cyan-500 flex items-center justify-center shadow shadow-pve-500/20">
              <Server size={16} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-slate-100 tracking-tight leading-tight">Proxmox Inventory</h1>
              <p className="text-[10px] text-slate-600 font-mono">
                {nodes.length} nœud{nodes.length > 1 && "s"} · {realVms.length} VMs · {templates.length} tpl
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all disabled:opacity-30">
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Rafraîchir
            </button>
            <button onClick={() => exportCsv(filteredVms)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all">
              <Download size={13} /> CSV
            </button>
            <div className="w-px h-5 bg-slate-800 mx-1" />
            <button onClick={onDisconnect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all">
              <LogOut size={13} /> Déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6 animate-fade-in">
        {/* ── KPI Row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard icon={Monitor} label="Machines virtuelles" value={`${running.length} / ${realVms.length}`} sub={`${realVms.length - running.length} arrêtée(s)`} color="text-pve-400" delay="animate-stagger-1" />
          <KPICard icon={Cpu} label="vCPU alloués" value={totalCpu} sub={`${hostCpu} cœurs physiques (${pct(totalCpu, hostCpu)}% ratio)`} color="text-sky-400" delay="animate-stagger-2" />
          <KPICard icon={MemoryStick} label="RAM allouée" value={formatBytes(totalRam)} sub={`sur ${formatBytes(hostRam)} (${pct(totalRam, hostRam)}%)`} color="text-violet-400" delay="animate-stagger-3" />
          <KPICard icon={HardDrive} label="Stockage VM" value={toTiB(totalDisk) + " TiB"} sub={`${realVms.length} disques virtuels`} color="text-amber-400" delay="animate-stagger-4" />
          <KPICard icon={Activity} label="Uptime moyen" value={formatUptime(running.length ? running.reduce((s, v) => s + v.uptime, 0) / running.length : 0)} sub="VMs actives" color="text-emerald-400" delay="animate-stagger-4" />
        </div>

        {/* ── Nodes Row ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nodes.map((n) => {
            const nVms = realVms.filter((v) => v.node === n.node);
            const nRun = nVms.filter((v) => v.status === "running").length;
            const memPct = pct(n.mem, n.maxmem);
            const cpuPct = n.cpu ? Math.round(n.cpu * 100) : 0;
            return (
              <div key={n.node} className="glass-panel-hover p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <StatusDot status={n.status} size="md" />
                    <span className="font-display font-bold text-sm text-slate-200">{n.node}</span>
                  </div>
                  <Badge variant={n.status === "online" ? "success" : "danger"}>{n.status}</Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500 font-display font-medium">CPU</span>
                      <span className="font-mono text-slate-400">{cpuPct}% · {n.maxcpu} cœurs</span>
                    </div>
                    <ProgressBar value={cpuPct} max={100} color={cpuPct > 80 ? "bg-red-500" : cpuPct > 50 ? "bg-amber-500" : "bg-pve-500"} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500 font-display font-medium">RAM</span>
                      <span className="font-mono text-slate-400">{memPct}% · {formatBytes(n.maxmem)}</span>
                    </div>
                    <ProgressBar value={memPct} max={100} color={memPct > 80 ? "bg-red-500" : memPct > 50 ? "bg-amber-500" : "bg-violet-500"} />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                    <span className="text-[10px] text-slate-600 font-display">VMs</span>
                    <span className="font-mono text-xs text-slate-300">{nRun}<span className="text-slate-600">/{nVms.length}</span></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Tabs ─────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-slate-800/60 pb-px">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-display font-semibold transition-all border-b-2 -mb-px ${
                activeTab === t.id
                  ? "border-pve-500 text-pve-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Inventory Tab ────────────────────────────── */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, OS, ID, tag…"
                  className="w-full bg-slate-900/40 border border-slate-800/60 rounded-lg pl-9 pr-3.5 py-2 text-slate-200 placeholder-slate-700 text-xs font-display focus:outline-none focus:border-pve-500/40 focus:ring-1 focus:ring-pve-500/15 transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900/40 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 text-xs font-display focus:outline-none cursor-pointer appearance-none pr-7"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}>
                <option value="all">Tous les états</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
              </select>
              <select value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)}
                className="bg-slate-900/40 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 text-xs font-display focus:outline-none cursor-pointer appearance-none pr-7"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}>
                <option value="all">Tous les nœuds</option>
                {nodes.map((n) => <option key={n.node} value={n.node}>{n.node}</option>)}
              </select>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none font-display hover:text-slate-300 transition-colors">
                <input type="checkbox" checked={showTemplates} onChange={(e) => setShowTemplates(e.target.checked)} className="accent-pve-500 w-3.5 h-3.5" />
                Templates
              </label>
              <span className="text-[11px] text-slate-700 font-mono ml-auto">{filteredVms.length} résultat(s)</span>
            </div>

            {/* Table */}
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/40">
                      <SortHeader col="vmid" className="w-16">ID</SortHeader>
                      <SortHeader col="name">Nom</SortHeader>
                      <SortHeader col="status" className="w-24">État</SortHeader>
                      <SortHeader col="node" className="w-28">Nœud</SortHeader>
                      <SortHeader col="agent_os">Système d'exploitation</SortHeader>
                      <SortHeader col="cpus" className="w-16 text-center">vCPU</SortHeader>
                      <SortHeader col="maxmem" className="w-20">RAM</SortHeader>
                      <SortHeader col="maxdisk" className="w-24">Disque</SortHeader>
                      <SortHeader col="uptime" className="w-20">Uptime</SortHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVms.map((vm) => {
                      const osMeta = getOsMeta(vm.agent_os);
                      return (
                        <tr key={`${vm.node}-${vm.vmid}`}
                          onClick={() => setSelectedVm(selectedVm?.vmid === vm.vmid ? null : vm)}
                          className={`border-t border-slate-800/30 cursor-pointer transition-colors ${
                            vm.template ? "opacity-40" : ""
                          } ${selectedVm?.vmid === vm.vmid ? "bg-pve-950/30" : "hover:bg-slate-800/20"}`}>
                          <td className="px-4 py-3 data-cell text-slate-500">{vm.vmid}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold text-slate-200 text-sm">{vm.name}</span>
                              {vm.template === 1 && <Badge variant="template">TEMPLATE</Badge>}
                            </div>
                            {vm.tags && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {vm.tags.split(",").map((t) => (
                                  <span key={t} className="text-[9px] bg-slate-800/60 text-slate-500 px-1.5 py-0.5 rounded font-mono">{t}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <StatusDot status={vm.status} />
                              <span className={`text-xs font-display font-medium ${vm.status === "running" ? "text-emerald-400" : "text-slate-500"}`}>
                                {vm.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 data-cell text-slate-500">{vm.node}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base leading-none">{osMeta.icon}</span>
                              <span className="text-xs text-slate-400 font-display">{vm.agent_os || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 data-cell text-center text-sky-300">{vm.cpus}</td>
                          <td className="px-4 py-3 data-cell text-violet-300">{toGiB(vm.maxmem)} G</td>
                          <td className="px-4 py-3 data-cell text-amber-300">{formatBytes(vm.maxdisk)}</td>
                          <td className="px-4 py-3 data-cell text-slate-500">{formatUptime(vm.uptime)}</td>
                        </tr>
                      );
                    })}
                    {filteredVms.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-600 font-display text-sm">Aucune VM ne correspond aux filtres.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail panel */}
            {selectedVm && (
              <div className="glass-panel p-5 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getOsMeta(selectedVm.agent_os).icon}</span>
                    <div>
                      <h3 className="font-display font-bold text-lg text-slate-100">{selectedVm.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">VMID {selectedVm.vmid} · {selectedVm.node}</p>
                    </div>
                  </div>
                  <Badge variant={selectedVm.status === "running" ? "success" : "danger"}>{selectedVm.status}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Monitor, label: "OS", value: selectedVm.agent_os || "Non détecté", sub: `Type: ${selectedVm.ostype}` },
                    { icon: Cpu, label: "vCPU", value: selectedVm.cpus, sub: "cœurs virtuels alloués" },
                    { icon: MemoryStick, label: "RAM", value: formatBytes(selectedVm.maxmem), sub: `${toGiB(selectedVm.maxmem)} GiB` },
                    { icon: HardDrive, label: "Disque", value: formatBytes(selectedVm.maxdisk), sub: `${toGiB(selectedVm.maxdisk)} GiB` },
                    { icon: Network, label: "Réseau IN", value: formatBytes(selectedVm.netin), sub: "total reçu" },
                    { icon: Network, label: "Réseau OUT", value: formatBytes(selectedVm.netout), sub: "total envoyé" },
                    { icon: Clock, label: "Uptime", value: formatUptime(selectedVm.uptime), sub: selectedVm.uptime ? `${Math.round(selectedVm.uptime / 3600)}h total` : "—" },
                    { icon: Tag, label: "Tags", value: selectedVm.tags || "—", sub: "" },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <item.icon size={12} className="text-slate-600" />
                        <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">{item.label}</span>
                      </div>
                      <p className="text-sm font-display font-semibold text-slate-200 truncate">{item.value}</p>
                      {item.sub && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{item.sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Analytics Tab ────────────────────────────── */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* OS Distribution */}
            <div className="glass-panel p-5">
              <h3 className="font-display font-bold text-sm text-slate-300 mb-4">Distribution des systèmes d'exploitation</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={osData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="none">
                    {osData.map((entry, i) => {
                      const meta = getOsMeta(entry.name);
                      return <Cell key={i} fill={meta.color || COLORS[i % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(value) => <span className="text-slate-400 font-display">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Resources per node */}
            <div className="glass-panel p-5">
              <h3 className="font-display font-bold text-sm text-slate-300 mb-4">Allocation par nœud</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={nodeData} barGap={6}>
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="vms" fill="#0e94ad" radius={[4, 4, 0, 0]} name="VMs" />
                  <Bar dataKey="vCPU" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="vCPU" />
                  <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => <span className="text-slate-400 font-display">{v}</span>} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* RAM per VM */}
            <div className="glass-panel p-5 lg:col-span-2">
              <h3 className="font-display font-bold text-sm text-slate-300 mb-4">RAM et stockage par VM (GiB)</h3>
              <ResponsiveContainer width="100%" height={Math.max(300, realVms.length * 28)}>
                <BarChart data={realVms.map((v) => ({
                  name: v.name.length > 16 ? v.name.slice(0, 16) + "…" : v.name,
                  "RAM": toGiB(v.maxmem),
                  "Disque": toGiB(v.maxdisk),
                })).sort((a, b) => b["RAM"] - a["RAM"])} layout="vertical" barGap={2} margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fill: "#475569", fontSize: 10, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fill: "#64748b", fontSize: 11, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="RAM" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Disque" fill="#f59e0b" radius={[0, 3, 3, 0]} opacity={0.45} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => <span className="text-slate-400 font-display">{v}</span>} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary table */}
            <div className="glass-panel p-5 lg:col-span-2">
              <h3 className="font-display font-bold text-sm text-slate-300 mb-4">Récapitulatif par nœud</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      {["Nœud", "Status", "VMs", "Running", "CPU Phys.", "vCPU alloc.", "Ratio CPU", "RAM Phys.", "RAM alloc.", "Ratio RAM"].map((h) => (
                        <th key={h} className="px-4 py-2.5 section-title text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((n) => {
                      const nVms = realVms.filter((v) => v.node === n.node);
                      const nRun = nVms.filter((v) => v.status === "running").length;
                      const nCpu = nVms.reduce((s, v) => s + v.cpus, 0);
                      const nRam = nVms.reduce((s, v) => s + v.maxmem, 0);
                      return (
                        <tr key={n.node} className="border-t border-slate-800/20 hover:bg-slate-800/10">
                          <td className="px-4 py-2.5 font-display font-semibold text-slate-300">{n.node}</td>
                          <td className="px-4 py-2.5"><Badge variant={n.status === "online" ? "success" : "danger"}>{n.status}</Badge></td>
                          <td className="px-4 py-2.5 data-cell text-slate-300">{nVms.length}</td>
                          <td className="px-4 py-2.5 data-cell text-emerald-400">{nRun}</td>
                          <td className="px-4 py-2.5 data-cell text-slate-400">{n.maxcpu}</td>
                          <td className="px-4 py-2.5 data-cell text-sky-300">{nCpu}</td>
                          <td className="px-4 py-2.5 data-cell">
                            <span className={nCpu / n.maxcpu > 2 ? "text-red-400" : nCpu / n.maxcpu > 1 ? "text-amber-400" : "text-emerald-400"}>
                              {(nCpu / n.maxcpu).toFixed(1)}:1
                            </span>
                          </td>
                          <td className="px-4 py-2.5 data-cell text-slate-400">{formatBytes(n.maxmem)}</td>
                          <td className="px-4 py-2.5 data-cell text-violet-300">{formatBytes(nRam)}</td>
                          <td className="px-4 py-2.5 data-cell">
                            <span className={pct(nRam, n.maxmem) > 90 ? "text-red-400" : pct(nRam, n.maxmem) > 70 ? "text-amber-400" : "text-emerald-400"}>
                              {pct(nRam, n.maxmem)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals */}
                    <tr className="border-t-2 border-slate-700/40 bg-slate-900/30">
                      <td className="px-4 py-2.5 font-display font-bold text-slate-200">TOTAL</td>
                      <td className="px-4 py-2.5" />
                      <td className="px-4 py-2.5 data-cell font-bold text-slate-200">{realVms.length}</td>
                      <td className="px-4 py-2.5 data-cell font-bold text-emerald-400">{running.length}</td>
                      <td className="px-4 py-2.5 data-cell font-bold text-slate-300">{hostCpu}</td>
                      <td className="px-4 py-2.5 data-cell font-bold text-sky-300">{totalCpu}</td>
                      <td className="px-4 py-2.5 data-cell font-bold text-slate-300">{(totalCpu / hostCpu).toFixed(1)}:1</td>
                      <td className="px-4 py-2.5 data-cell font-bold text-slate-300">{formatBytes(hostRam)}</td>
                      <td className="px-4 py-2.5 data-cell font-bold text-violet-300">{formatBytes(totalRam)}</td>
                      <td className="px-4 py-2.5 data-cell font-bold text-slate-300">{pct(totalRam, hostRam)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/30 mt-8 py-4">
        <p className="text-center text-[10px] text-slate-800 tracking-widest uppercase font-mono">
          Proxmox VE Inventory · API /api2/json · {data.timestamp?.slice(0, 19).replace("T", " ")}
        </p>
      </footer>
    </div>
  );
}

// ── App Root ────────────────────────────────────────────────

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [creds, setCreds] = useState(null);

  const fetchInventory = useCallback(async (config) => {
    const isRefresh = !!data;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    if (config.demo) {
      await new Promise((r) => setTimeout(r, 600));
      setData(DEMO);
      setCreds({ demo: true });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      setCreds(config);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, [data]);

  if (!data) {
    return <ConnectionScreen onConnect={fetchInventory} loading={loading} error={error} />;
  }

  return (
    <Dashboard
      data={data}
      onRefresh={() => fetchInventory(creds)}
      onDisconnect={() => { setData(null); setCreds(null); setError(null); }}
      refreshing={refreshing}
    />
  );
}
