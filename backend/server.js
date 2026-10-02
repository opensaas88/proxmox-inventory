import express from "express";
import cors from "cors";

// Keep TLS verification enabled. Trust your Proxmox CA with NODE_EXTRA_CA_CERTS.

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "127.0.0.1";

app.use(cors());
app.use(express.json());

// ── Proxmox API helper ──────────────────────────────────────
async function pveRequest(baseUrl, path, token) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `PVEAPIToken=${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Proxmox HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

// ── Health check ────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Test connection ─────────────────────────────────────────
app.post("/api/connect", async (req, res) => {
  const { host, port = 8006, tokenId, tokenSecret } = req.body;

  if (!host || !tokenId || !tokenSecret) {
    return res.status(400).json({ error: "Champs requis : host, tokenId, tokenSecret" });
  }

  const baseUrl = `https://${host}:${port}/api2/json`;
  const token = `${tokenId}=${tokenSecret}`;

  try {
    const version = await pveRequest(baseUrl, "/version", token);
    res.json({ success: true, version });
  } catch (err) {
    res.status(502).json({ error: `Connexion échouée : ${err.message}` });
  }
});

// ── Full inventory ──────────────────────────────────────────
app.post("/api/inventory", async (req, res) => {
  const { host, port = 8006, tokenId, tokenSecret } = req.body;

  if (!host || !tokenId || !tokenSecret) {
    return res.status(400).json({ error: "Champs requis : host, tokenId, tokenSecret" });
  }

  const baseUrl = `https://${host}:${port}/api2/json`;
  const token = `${tokenId}=${tokenSecret}`;

  try {
    const warnings = [];
    // 1. Fetch nodes
    const nodesRaw = await pveRequest(baseUrl, "/nodes", token);
    const nodes = nodesRaw.map((n) => ({
      node: n.node,
      status: n.status,
      maxcpu: n.maxcpu,
      maxmem: n.maxmem,
      mem: n.mem,
      cpu: n.cpu,
      uptime: n.uptime,
      disk: n.disk,
      maxdisk: n.maxdisk,
    }));

    // 2. Fetch VMs for each node (parallel)
    const vmsByNode = await Promise.all(
      nodes.map(async (n) => {
        try {
          const vms = await pveRequest(baseUrl, `/nodes/${n.node}/qemu`, token);
          return { node: n.node, vms: vms || [] };
        } catch {
          warnings.push(`${n.node} : liste des VM indisponible.`);
          return { node: n.node, vms: [] };
        }
      })
    );

    // 3. For each VM, fetch config + agent OS info (parallel, with timeout)
    const allVms = [];
    const fetchTimeout = (promise, ms = 5000) =>
      Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

    for (const { node, vms } of vmsByNode) {
      const enriched = await Promise.all(
        vms.map(async (vm) => {
          let agentOs = "";
          let ostype = vm.ostype || "";
          let description = "";
          let netIfaces = [];

          // Fetch config
          try {
            const cfg = await fetchTimeout(
              pveRequest(baseUrl, `/nodes/${node}/qemu/${vm.vmid}/config`, token)
            );
            ostype = ostype || cfg.ostype || "";
            description = cfg.description || "";
          } catch { warnings.push(`${node}/VM ${vm.vmid} : configuration indisponible.`); }

          // Fetch agent OS info (only if running)
          if (vm.status === "running") {
            try {
              const osInfo = await fetchTimeout(
                pveRequest(baseUrl, `/nodes/${node}/qemu/${vm.vmid}/agent/get-osinfo`, token),
                3000
              );
              const r = osInfo?.result || osInfo;
              agentOs = r?.["pretty-name"] || r?.name || "";
            } catch { warnings.push(`${node}/VM ${vm.vmid} : OS invité indisponible (agent ou permissions).`); }

            // Fetch network interfaces
            try {
              const netInfo = await fetchTimeout(
                pveRequest(baseUrl, `/nodes/${node}/qemu/${vm.vmid}/agent/network-get-interfaces`, token),
                3000
              );
              const ifaces = netInfo?.result || netInfo || [];
              netIfaces = (Array.isArray(ifaces) ? ifaces : [])
                .filter((i) => i.name !== "lo")
                .map((i) => ({
                  name: i.name,
                  ips: (i["ip-addresses"] || []).map((ip) => ip["ip-address"]).filter(Boolean),
                }));
            } catch { warnings.push(`${node}/VM ${vm.vmid} : interfaces invité indisponibles.`); }
          }

          return {
            vmid: vm.vmid,
            name: vm.name || `VM ${vm.vmid}`,
            status: vm.status,
            node,
            cpus: vm.cpus || 1,
            maxmem: vm.maxmem || 0,
            maxdisk: vm.maxdisk || 0,
            uptime: vm.uptime || 0,
            netin: vm.netin || 0,
            netout: vm.netout || 0,
            template: vm.template || 0,
            tags: vm.tags || "",
            ostype,
            agent_os: agentOs,
            description,
            net_interfaces: netIfaces,
          };
        })
      );
      allVms.push(...enriched);
    }

    // 4. Also fetch LXC containers
    const lxcByNode = await Promise.all(
      nodes.map(async (n) => {
        try {
          const cts = await pveRequest(baseUrl, `/nodes/${n.node}/lxc`, token);
          return { node: n.node, containers: cts || [] };
        } catch {
          warnings.push(`${n.node} : liste des conteneurs indisponible.`);
          return { node: n.node, containers: [] };
        }
      })
    );

    const allContainers = [];
    for (const { node, containers } of lxcByNode) {
      for (const ct of containers) {
        allContainers.push({
          vmid: ct.vmid,
          name: ct.name || `CT ${ct.vmid}`,
          status: ct.status,
          node,
          cpus: ct.cpus || 1,
          maxmem: ct.maxmem || 0,
          maxdisk: ct.maxdisk || 0,
          uptime: ct.uptime || 0,
          netin: ct.netin || 0,
          netout: ct.netout || 0,
          template: ct.template || 0,
          tags: ct.tags || "",
          type: "lxc",
        });
      }
    }

    // 5. Fetch storage info
    const storageByNode = await Promise.all(
      nodes.map(async (n) => {
        try {
          const storages = await pveRequest(baseUrl, `/nodes/${n.node}/storage`, token);
          return {
            node: n.node,
            storages: (storages || []).map((s) => ({
              storage: s.storage,
              type: s.type,
              total: s.total || 0,
              used: s.used || 0,
              avail: s.avail || 0,
              active: s.active,
              content: s.content,
            })),
          };
        } catch {
          warnings.push(`${n.node} : stockages indisponibles.`);
          return { node: n.node, storages: [] };
        }
      })
    );

    res.json({
      timestamp: new Date().toISOString(),
      nodes,
      vms: allVms,
      containers: allContainers,
      storage: storageByNode,
      warnings,
    });
  } catch (err) {
    res.status(502).json({ error: `Inventaire échoué : ${err.message}` });
  }
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`✔ PVE Inventory API listening on :${PORT}`);
});
