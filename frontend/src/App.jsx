import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import {
  Server, Cpu, HardDrive, MemoryStick, Monitor, Power,
  Search, Download, RefreshCw, LogOut, ChevronUp,
  ChevronDown, Activity, Network, Clock, Tag, Box, Database,
  AlertCircle, BarChart3, Layers, ArrowUpDown,
} from "lucide-react";
import { getOsMeta, formatBytes, toGiB, toTiB, formatUptime, pct } from "./lib";

// Analytics (Recharts) is split out so it stays out of the initial bundle.
const Analytics = lazy(() => import("./Analytics"));

// ── Demo Data ───────────────────────────────────────────────
const DEMO = {
  timestamp: new Date().toISOString(),
  nodes: [
    { node: "pve-node01", status: "online", maxcpu: 32, maxmem: 137438953472, mem: 109951162777, cpu: 0.42, uptime: 2592000, disk: 214748364800, maxdisk: 1099511627776 },
    { node: "pve-node02", status: "online", maxcpu: 24, maxmem: 68719476736, mem: 48103633715, cpu: 0.28, uptime: 1296000, disk: 161061273600, maxdisk: 549755813888 },
    { node: "pve-node03", status: "online", maxcpu: 16, maxmem: 34359738368, mem: 20615843020, cpu: 0.15, uptime: 864000, disk: 107374182400, maxdisk: 549755813888 },
  ],
  vms: [
    { vmid: 100, name: "web-prod-01", status: "running", node: "pve-node01", maxmem: 8589934592, maxdisk: 107374182400, cpus: 4, uptime: 2500000, ostype: "l26", template: 0, tags: "production,web", netin: 5368709120, netout: 2147483648, agent_os: "Ubuntu 22.04.3 LTS", net_interfaces: [{ name: "eth0", ips: ["10.0.0.10", "fe80::5054:ff:fe12:3456"] }] },
    { vmid: 101, name: "db-prod-master", status: "running", node: "pve-node01", maxmem: 34359738368, maxdisk: 536870912000, cpus: 8, uptime: 2500000, ostype: "l26", template: 0, tags: "production,database", netin: 10737418240, netout: 8589934592, agent_os: "Debian 12 (Bookworm)", net_interfaces: [{ name: "ens18", ips: ["10.0.0.11"] }] },
    { vmid: 102, name: "db-prod-replica", status: "running", node: "pve-node01", maxmem: 17179869184, maxdisk: 536870912000, cpus: 8, uptime: 2500000, ostype: "l26", template: 0, tags: "production,database", netin: 8589934592, netout: 4294967296, agent_os: "Debian 12 (Bookworm)" },
    { vmid: 103, name: "mail-server", status: "running", node: "pve-node01", maxmem: 4294967296, maxdisk: 214748364800, cpus: 2, uptime: 2400000, ostype: "l26", template: 0, tags: "production,mail", netin: 2147483648, netout: 1073741824, agent_os: "Rocky Linux 9.3" },
    { vmid: 200, name: "win-ad-dc01", status: "running", node: "pve-node02", maxmem: 8589934592, maxdisk: 107374182400, cpus: 4, uptime: 1200000, ostype: "win11", template: 0, tags: "production,ad", netin: 1073741824, netout: 536870912, agent_os: "Windows Server 2022", net_interfaces: [{ name: "Ethernet", ips: ["10.0.1.5"] }] },
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
  containers: [
    { vmid: 110, name: "ct-nginx-proxy", status: "running", node: "pve-node01", cpus: 1, maxmem: 536870912, maxdisk: 8589934592, uptime: 1500000, netin: 3221225472, netout: 2147483648, template: 0, tags: "production,proxy", type: "lxc" },
    { vmid: 111, name: "ct-redis", status: "running", node: "pve-node01", cpus: 2, maxmem: 2147483648, maxdisk: 16106127360, uptime: 1500000, netin: 1073741824, netout: 536870912, template: 0, tags: "production,cache", type: "lxc" },
    { vmid: 210, name: "ct-gitlab-runner", status: "running", node: "pve-node02", cpus: 4, maxmem: 4294967296, maxdisk: 53687091200, uptime: 900000, netin: 5368709120, netout: 3221225472, template: 0, tags: "ci", type: "lxc" },
    { vmid: 310, name: "ct-test", status: "stopped", node: "pve-node03", cpus: 1, maxmem: 536870912, maxdisk: 8589934592, uptime: 0, netin: 0, netout: 0, template: 0, tags: "test", type: "lxc" },
  ],
  storage: [
    { node: "pve-node01", storages: [
      { storage: "local", type: "dir", total: 107374182400, used: 32212254720, avail: 75161927680, active: 1, content: "iso,vztmpl" },
      { storage: "local-lvm", type: "lvmthin", total: 1099511627776, used: 659706976665, avail: 439804651111, active: 1, content: "images,rootdir" },
      { storage: "ceph-pool", type: "rbd", total: 4398046511104, used: 1979120929996, avail: 2418925581108, active: 1, content: "images" },
    ] },
    { node: "pve-node02", storages: [
      { storage: "local", type: "dir", total: 107374182400, used: 21474836480, avail: 85899345920, active: 1, content: "iso,vztmpl" },
      { storage: "local-lvm", type: "lvmthin", total: 549755813888, used: 412316860416, avail: 137438953472, active: 1, content: "images,rootdir" },
    ] },
    { node: "pve-node03", storages: [
      { storage: "local", type: "dir", total: 107374182400, used: 15032385536, avail: 92341796864, active: 1, content: "iso,vztmpl" },
      { storage: "backup-nfs", type: "nfs", total: 2199023255552, used: 1869169767219, avail: 329853488333, active: 1, content: "backup" },
    ] },
  ],
};

// ── Reusable Components ─────────────────────────────────────

function StatusDot({ status, size = "sm" }) {
  const s = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const active = status === "running" || status === "online";
  const c = active
    ? "bg-emerald-500 shadow-emerald-500/40 shadow-sm"
    : status === "paused" ? "bg-amber-400" : "bg-slate-300";
  return <span className={`inline-block rounded-full ${s} ${c} ${active ? "animate-pulse-slow" : ""}`} />;
}

function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-slate-100 text-slate-600 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-600 border-red-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    template: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value, max, color = "bg-sky-500", height = "h-1.5" }) {
  const p = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`w-full ${height} rounded-full bg-slate-100 overflow-hidden`}>
      <div className={`${height} rounded-full ${color} transition-all duration-700`} style={{ width: `${p}%` }} />
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color = "text-emerald-600", tint = "bg-emerald-50", delay = "" }) {
  return (
    <div className={`glass-panel p-5 animate-slide-up ${delay}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${tint} ${color}`}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>
      <p className="metric-value">{value}</p>
      <p className="section-title mt-1">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{sub}</p>}
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
  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 placeholder-slate-400 text-sm font-mono focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/[0.08] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mb-5 shadow-sm">
            <Server size={28} className="text-emerald-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">Proxmox <span className="text-gradient">Inventory</span></h1>
          <p className="text-slate-400 text-sm mt-2 font-display">Connectez-vous à votre cluster Proxmox VE</p>
        </div>

        {/* Form */}
        <div className="glass-panel p-6 space-y-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="section-title mb-1.5 block">Hôte / IP</label>
              <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.100" className={inputClass} />
            </div>
            <div className="w-20">
              <label className="section-title mb-1.5 block">Port</label>
              <input type="text" value={port} onChange={(e) => setPort(e.target.value)} className={`${inputClass} text-center`} />
            </div>
          </div>

          <div>
            <label className="section-title mb-1.5 block">API Token ID</label>
            <input type="text" value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="user@pam!mytoken" className={inputClass} />
          </div>

          <div>
            <label className="section-title mb-1.5 block">Token Secret</label>
            <input type="password" value={tokenSecret} onChange={(e) => setTokenSecret(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inputClass} />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-600 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={() => onConnect({ host, port, tokenId, tokenSecret })} disabled={!canSubmit || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-semibold py-2.5 rounded-lg transition-all text-sm shadow-sm shadow-emerald-500/20">
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Power size={16} />}
              {loading ? "Connexion…" : "Connecter"}
            </button>
            <button onClick={() => onConnect({ demo: true })}
              className="px-5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 font-display font-semibold py-2.5 rounded-lg transition-all text-sm">
              Démo
            </button>
          </div>
        </div>

        {/* Help */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-slate-500 text-xs leading-relaxed font-display">
            <strong className="text-slate-700">Configuration requise</strong> — Créez un API Token dans Proxmox VE :
            <span className="font-mono text-emerald-600"> Datacenter → Permissions → API Tokens</span>.
            Le token doit disposer des droits de lecture (<span className="font-mono text-slate-600">PVEAuditor</span>).
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Auto-refresh control ────────────────────────────────────
const REFRESH_OPTS = [["Off", 0], ["30s", 30], ["1m", 60], ["5m", 300]];

function AutoRefresh({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5" title="Rafraîchissement automatique">
      {REFRESH_OPTS.map(([label, secs]) => (
        <button key={secs} onClick={() => onChange(secs)}
          className={`px-2 py-1 text-[11px] font-display font-medium rounded-md transition-all ${
            value === secs ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}>
          {label}
        </button>
      ))}
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
  const [autoRefresh, setAutoRefresh] = useState(0);

  const { nodes, vms } = data;
  const containers = data.containers || [];
  const realVms = useMemo(() => vms.filter((v) => !v.template), [vms]);
  const templates = useMemo(() => vms.filter((v) => v.template), [vms]);
  const running = useMemo(() => realVms.filter((v) => v.status === "running"), [realVms]);

  const storages = useMemo(
    () => (data.storage || []).flatMap((s) => (s.storages || []).map((st) => ({ ...st, node: s.node }))),
    [data.storage]
  );

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => onRefresh(), autoRefresh * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, onRefresh]);

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

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortHeader = ({ col, children, className = "" }) => (
    <th onClick={() => handleSort(col)}
      className={`text-left px-4 py-3 section-title cursor-pointer select-none hover:text-slate-600 transition-colors group ${className}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortKey === col
          ? (sortDir === "asc" ? <ChevronUp size={12} className="text-emerald-500" /> : <ChevronDown size={12} className="text-emerald-500" />)
          : <ArrowUpDown size={10} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
        }
      </span>
    </th>
  );

  const selectClass = "bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 text-xs font-display focus:outline-none focus:border-emerald-400 cursor-pointer appearance-none pr-7";
  const selectChevron = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
  };

  const tabs = [
    { id: "inventory", label: "Inventaire", icon: Layers, count: realVms.length },
    { id: "containers", label: "Conteneurs", icon: Box, count: containers.length },
    { id: "storage", label: "Stockage", icon: Database, count: storages.length },
    { id: "analytics", label: "Analytique", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Server size={16} className="text-emerald-600" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-slate-800 tracking-tight leading-tight">Proxmox Inventory</h1>
              <p className="text-[10px] text-slate-400 font-mono">
                {nodes.length} nœud{nodes.length > 1 && "s"} · {realVms.length} VMs · {containers.length} CT · {templates.length} tpl
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AutoRefresh value={autoRefresh} onChange={setAutoRefresh} />
            <button onClick={onRefresh} disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all disabled:opacity-40">
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Rafraîchir
            </button>
            <button onClick={() => exportCsv(filteredVms)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all">
              <Download size={13} /> CSV
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button onClick={onDisconnect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all">
              <LogOut size={13} /> Déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6 animate-fade-in">
        {/* ── KPI Row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard icon={Monitor} label="Machines virtuelles" value={`${running.length} / ${realVms.length}`} sub={`${realVms.length - running.length} arrêtée(s)`} color="text-emerald-600" tint="bg-emerald-50" delay="animate-stagger-1" />
          <KPICard icon={Cpu} label="vCPU alloués" value={totalCpu} sub={`${hostCpu} cœurs physiques (${pct(totalCpu, hostCpu)}% ratio)`} color="text-sky-600" tint="bg-sky-50" delay="animate-stagger-2" />
          <KPICard icon={MemoryStick} label="RAM allouée" value={formatBytes(totalRam)} sub={`sur ${formatBytes(hostRam)} (${pct(totalRam, hostRam)}%)`} color="text-violet-600" tint="bg-violet-50" delay="animate-stagger-3" />
          <KPICard icon={HardDrive} label="Stockage VM" value={toTiB(totalDisk) + " TiB"} sub={`${realVms.length} disques virtuels`} color="text-amber-600" tint="bg-amber-50" delay="animate-stagger-4" />
          <KPICard icon={Activity} label="Uptime moyen" value={formatUptime(running.length ? running.reduce((s, v) => s + v.uptime, 0) / running.length : 0)} sub="VMs actives" color="text-rose-500" tint="bg-rose-50" delay="animate-stagger-4" />
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
                    <span className="font-display font-bold text-sm text-slate-800">{n.node}</span>
                  </div>
                  <Badge variant={n.status === "online" ? "success" : "danger"}>{n.status}</Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500 font-display font-medium">CPU</span>
                      <span className="font-mono text-slate-500">{cpuPct}% · {n.maxcpu} cœurs</span>
                    </div>
                    <ProgressBar value={cpuPct} max={100} color={cpuPct > 80 ? "bg-red-500" : cpuPct > 50 ? "bg-amber-500" : "bg-emerald-500"} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500 font-display font-medium">RAM</span>
                      <span className="font-mono text-slate-500">{memPct}% · {formatBytes(n.maxmem)}</span>
                    </div>
                    <ProgressBar value={memPct} max={100} color={memPct > 80 ? "bg-red-500" : memPct > 50 ? "bg-amber-500" : "bg-violet-500"} />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-display">VMs</span>
                    <span className="font-mono text-xs text-slate-700">{nRun}<span className="text-slate-400">/{nVms.length}</span></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Tabs ─────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold rounded-lg transition-all ${
                activeTab === t.id
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}>
              <t.icon size={14} /> {t.label}
              {t.count != null && (
                <span className={`ml-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeTab === t.id ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Inventory Tab ────────────────────────────── */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, OS, ID, tag…"
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3.5 py-2 text-slate-700 placeholder-slate-400 text-xs font-display focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass} style={selectChevron}>
                <option value="all">Tous les états</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
              </select>
              <select value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)} className={selectClass} style={selectChevron}>
                <option value="all">Tous les nœuds</option>
                {nodes.map((n) => <option key={n.node} value={n.node}>{n.node}</option>)}
              </select>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none font-display hover:text-slate-700 transition-colors">
                <input type="checkbox" checked={showTemplates} onChange={(e) => setShowTemplates(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
                Templates
              </label>
              <span className="text-[11px] text-slate-400 font-mono ml-auto">{filteredVms.length} résultat(s)</span>
            </div>

            {/* Table */}
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
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
                          className={`border-t border-slate-100 cursor-pointer transition-colors ${
                            vm.template ? "opacity-50" : ""
                          } ${selectedVm?.vmid === vm.vmid ? "bg-emerald-50/70" : "hover:bg-slate-50"}`}>
                          <td className="px-4 py-3 data-cell text-slate-400">{vm.vmid}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold text-slate-800 text-sm">{vm.name}</span>
                              {vm.template === 1 && <Badge variant="template">TEMPLATE</Badge>}
                            </div>
                            {vm.tags && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {vm.tags.split(",").map((t) => (
                                  <span key={t} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{t}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <StatusDot status={vm.status} />
                              <span className={`text-xs font-display font-medium ${vm.status === "running" ? "text-emerald-600" : "text-slate-400"}`}>
                                {vm.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 data-cell text-slate-500">{vm.node}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base leading-none">{osMeta.icon}</span>
                              <span className="text-xs text-slate-600 font-display">{vm.agent_os || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 data-cell text-center text-sky-600">{vm.cpus}</td>
                          <td className="px-4 py-3 data-cell text-violet-600">{toGiB(vm.maxmem)} G</td>
                          <td className="px-4 py-3 data-cell text-amber-600">{formatBytes(vm.maxdisk)}</td>
                          <td className="px-4 py-3 data-cell text-slate-400">{formatUptime(vm.uptime)}</td>
                        </tr>
                      );
                    })}
                    {filteredVms.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 font-display text-sm">Aucune VM ne correspond aux filtres.</td></tr>
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
                      <h3 className="font-display font-bold text-lg text-slate-900">{selectedVm.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">VMID {selectedVm.vmid} · {selectedVm.node}</p>
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
                    <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <item.icon size={12} className="text-slate-400" />
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{item.label}</span>
                      </div>
                      <p className="text-sm font-display font-semibold text-slate-800 truncate">{item.value}</p>
                      {item.sub && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Network interfaces (QEMU guest agent) */}
                {selectedVm.net_interfaces?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="section-title mb-2 flex items-center gap-1.5"><Network size={12} /> Interfaces réseau</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedVm.net_interfaces.map((nic, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
                          <span className="text-xs font-display font-semibold text-slate-700">{nic.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{nic.ips?.join(", ") || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Containers Tab ───────────────────────────── */}
        {activeTab === "containers" && (
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {["ID", "Nom", "État", "Nœud", "vCPU", "RAM", "Disque", "Uptime"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 section-title">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {containers.map((ct) => (
                    <tr key={`${ct.node}-${ct.vmid}`} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 data-cell text-slate-400">{ct.vmid}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Box size={14} className="text-emerald-500" />
                          <span className="font-display font-semibold text-slate-800 text-sm">{ct.name}</span>
                          <Badge variant="info">LXC</Badge>
                        </div>
                        {ct.tags && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {ct.tags.split(",").map((t) => (
                              <span key={t} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{t}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={ct.status} />
                          <span className={`text-xs font-display font-medium ${ct.status === "running" ? "text-emerald-600" : "text-slate-400"}`}>{ct.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 data-cell text-slate-500">{ct.node}</td>
                      <td className="px-4 py-3 data-cell text-sky-600">{ct.cpus}</td>
                      <td className="px-4 py-3 data-cell text-violet-600">{toGiB(ct.maxmem)} G</td>
                      <td className="px-4 py-3 data-cell text-amber-600">{formatBytes(ct.maxdisk)}</td>
                      <td className="px-4 py-3 data-cell text-slate-400">{formatUptime(ct.uptime)}</td>
                    </tr>
                  ))}
                  {containers.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-display text-sm">Aucun conteneur LXC détecté.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Storage Tab ──────────────────────────────── */}
        {activeTab === "storage" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storages.map((s, i) => {
              const usedPct = pct(s.used, s.total);
              return (
                <div key={`${s.node}-${s.storage}-${i}`} className="glass-panel-hover p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600"><Database size={14} /></div>
                      <span className="font-display font-bold text-sm text-slate-800">{s.storage}</span>
                    </div>
                    <Badge variant="info">{s.type}</Badge>
                  </div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-500 font-display font-medium">Utilisation</span>
                    <span className="font-mono text-slate-500">{formatBytes(s.used)} / {formatBytes(s.total)}</span>
                  </div>
                  <ProgressBar value={s.used} max={s.total} color={usedPct > 85 ? "bg-red-500" : usedPct > 65 ? "bg-amber-500" : "bg-sky-500"} />
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-display">{s.node} · {usedPct}%</span>
                    <span className="font-mono text-xs text-emerald-600">{formatBytes(s.avail)} dispo</span>
                  </div>
                </div>
              );
            })}
            {storages.length === 0 && (
              <div className="glass-panel p-12 text-center text-slate-400 font-display text-sm md:col-span-2 lg:col-span-3">Aucun stockage détecté.</div>
            )}
          </div>
        )}

        {/* ── Analytics Tab (lazy) ─────────────────────── */}
        {activeTab === "analytics" && (
          <Suspense fallback={
            <div className="glass-panel p-12 flex items-center justify-center text-slate-400 font-display text-sm gap-2">
              <RefreshCw size={16} className="animate-spin" /> Chargement des graphiques…
            </div>
          }>
            <Analytics nodes={nodes} realVms={realVms} />
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-8 py-4">
        <p className="text-center text-[10px] text-slate-400 tracking-widest uppercase font-mono">
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
      setData({ ...DEMO, timestamp: new Date().toISOString() });
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

  const handleRefresh = useCallback(() => {
    if (creds) fetchInventory(creds);
  }, [fetchInventory, creds]);

  if (!data) {
    return <ConnectionScreen onConnect={fetchInventory} loading={loading} error={error} />;
  }

  return (
    <Dashboard
      data={data}
      onRefresh={handleRefresh}
      onDisconnect={() => { setData(null); setCreds(null); setError(null); }}
      refreshing={refreshing}
    />
  );
}
