import { useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { ACCENT, COLORS, getOsMeta, toGiB, formatBytes, pct } from "./lib";

function Badge({ children, variant = "default" }) {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    danger: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-700 font-display font-semibold mb-1">{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color || p.fill }} />
          {p.dataKey}: <span className="text-slate-800 font-mono">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// Lazy-loaded analytics tab — keeps Recharts out of the initial bundle.
export default function Analytics({ nodes, realVms }) {
  const running = useMemo(() => realVms.filter((v) => v.status === "running"), [realVms]);
  const totalCpu = useMemo(() => realVms.reduce((s, v) => s + (v.cpus || 0), 0), [realVms]);
  const totalRam = useMemo(() => realVms.reduce((s, v) => s + (v.maxmem || 0), 0), [realVms]);
  const hostCpu = useMemo(() => nodes.reduce((s, n) => s + (n.maxcpu || 0), 0), [nodes]);
  const hostRam = useMemo(() => nodes.reduce((s, n) => s + (n.maxmem || 0), 0), [nodes]);

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

  const vmRamData = useMemo(() => realVms.map((v) => ({
    name: v.name.length > 16 ? v.name.slice(0, 16) + "…" : v.name,
    "RAM": toGiB(v.maxmem),
    "Disque": toGiB(v.maxdisk),
  })).sort((a, b) => b["RAM"] - a["RAM"]), [realVms]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* OS Distribution */}
      <div className="glass-panel p-5">
        <h3 className="font-display font-bold text-sm text-slate-700 mb-4">Distribution des systèmes d'exploitation</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={osData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="#fff" strokeWidth={2}>
              {osData.map((entry, i) => {
                const meta = getOsMeta(entry.name);
                return <Cell key={i} fill={meta.color || COLORS[i % COLORS.length]} />;
              })}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(value) => <span className="text-slate-500 font-display">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Resources per node */}
      <div className="glass-panel p-5">
        <h3 className="font-display font-bold text-sm text-slate-700 mb-4">Allocation par nœud</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={nodeData} barGap={6}>
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(16,185,129,0.06)" }} />
            <Bar dataKey="vms" fill={ACCENT} radius={[4, 4, 0, 0]} name="VMs" />
            <Bar dataKey="vCPU" fill="#3b82f6" radius={[4, 4, 0, 0]} name="vCPU" />
            <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => <span className="text-slate-500 font-display">{v}</span>} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* RAM per VM */}
      <div className="glass-panel p-5 lg:col-span-2">
        <h3 className="font-display font-bold text-sm text-slate-700 mb-4">RAM et stockage par VM (GiB)</h3>
        <ResponsiveContainer width="100%" height={Math.max(300, realVms.length * 28)}>
          <BarChart data={vmRamData} layout="vertical" barGap={2} margin={{ left: 20 }}>
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fill: "#64748b", fontSize: 11, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(16,185,129,0.06)" }} />
            <Bar dataKey="RAM" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
            <Bar dataKey="Disque" fill="#f59e0b" radius={[0, 3, 3, 0]} opacity={0.55} />
            <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => <span className="text-slate-500 font-display">{v}</span>} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="glass-panel p-5 lg:col-span-2">
        <h3 className="font-display font-bold text-sm text-slate-700 mb-4">Récapitulatif par nœud</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
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
                  <tr key={n.node} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-display font-semibold text-slate-700">{n.node}</td>
                    <td className="px-4 py-2.5"><Badge variant={n.status === "online" ? "success" : "danger"}>{n.status}</Badge></td>
                    <td className="px-4 py-2.5 data-cell text-slate-700">{nVms.length}</td>
                    <td className="px-4 py-2.5 data-cell text-emerald-600">{nRun}</td>
                    <td className="px-4 py-2.5 data-cell text-slate-500">{n.maxcpu}</td>
                    <td className="px-4 py-2.5 data-cell text-sky-600">{nCpu}</td>
                    <td className="px-4 py-2.5 data-cell">
                      <span className={nCpu / n.maxcpu > 2 ? "text-red-500" : nCpu / n.maxcpu > 1 ? "text-amber-600" : "text-emerald-600"}>
                        {(nCpu / n.maxcpu).toFixed(1)}:1
                      </span>
                    </td>
                    <td className="px-4 py-2.5 data-cell text-slate-500">{formatBytes(n.maxmem)}</td>
                    <td className="px-4 py-2.5 data-cell text-violet-600">{formatBytes(nRam)}</td>
                    <td className="px-4 py-2.5 data-cell">
                      <span className={pct(nRam, n.maxmem) > 90 ? "text-red-500" : pct(nRam, n.maxmem) > 70 ? "text-amber-600" : "text-emerald-600"}>
                        {pct(nRam, n.maxmem)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-4 py-2.5 font-display font-bold text-slate-800">TOTAL</td>
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5 data-cell font-bold text-slate-800">{realVms.length}</td>
                <td className="px-4 py-2.5 data-cell font-bold text-emerald-600">{running.length}</td>
                <td className="px-4 py-2.5 data-cell font-bold text-slate-700">{hostCpu}</td>
                <td className="px-4 py-2.5 data-cell font-bold text-sky-600">{totalCpu}</td>
                <td className="px-4 py-2.5 data-cell font-bold text-slate-700">{(totalCpu / hostCpu).toFixed(1)}:1</td>
                <td className="px-4 py-2.5 data-cell font-bold text-slate-700">{formatBytes(hostRam)}</td>
                <td className="px-4 py-2.5 data-cell font-bold text-violet-600">{formatBytes(totalRam)}</td>
                <td className="px-4 py-2.5 data-cell font-bold text-slate-700">{pct(totalRam, hostRam)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
