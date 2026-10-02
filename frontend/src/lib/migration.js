export const GiB = 1024 ** 3;

export function workloadKey(vm) {
  return `${vm.type === 'lxc' ? 'lxc' : 'qemu'}:${vm.node}:${vm.vmid}`;
}

export function migrationFindings(vm) {
  const findings = [];
  if (vm.type === 'lxc') findings.push('Conteneur LXC : vérifier les montages, privilèges et compatibilités de la cible.');
  if (!vm.agent_os && vm.type !== 'lxc') findings.push('OS non identifié : vérifier les pilotes et le système invité.');
  if (vm.status === 'running') findings.push('Machine active : définir la fenêtre de coupure et la stratégie de synchronisation.');
  if (!vm.maxmem || !vm.maxdisk || !vm.cpus) findings.push('Ressources incomplètes : compléter le dimensionnement avant décision.');
  findings.push('À confirmer : sauvegarde restaurable, réseau/VLAN, stockage, dépendances et retour arrière.');
  return findings;
}

export function analyzeMigration(workloads, capacity) {
  const totals = workloads.reduce((sum, vm) => ({
    cpu: sum.cpu + (vm.cpus || 0),
    ram: sum.ram + (vm.maxmem || 0) / GiB,
    disk: sum.disk + (vm.maxdisk || 0) / GiB,
  }), { cpu: 0, ram: 0, disk: 0 });
  const checks = ['cpu', 'ram', 'disk'].map(key => {
    const input = capacity[key];
    const available = input === '' || input == null ? null : Number(input);
    const known = available !== null && Number.isFinite(available) && available >= 0;
    const field = { cpu: 'cpus', ram: 'maxmem', disk: 'maxdisk' }[key];
    const complete = workloads.every(vm => Number.isFinite(vm[field]) && vm[field] > 0);
    return { key, required: totals[key], available: known ? available : null,
      state: !workloads.length || !known ? 'unknown' : totals[key] > available ? 'exceeded' : !complete ? 'unknown' : 'fits' };
  });
  return { totals, checks };
}

// Quote delimiters/newlines and neutralize spreadsheet formulas from inventory names.
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
