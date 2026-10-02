import { useMemo, useState } from 'react';
import { analyzeMigration, migrationFindings, workloadKey, downloadFile, GiB } from '../lib/migration';

const labels = { cpu: 'vCPU', ram: 'RAM (GiB)', disk: 'Disque (GiB)' };
const checklistItems = ['Sauvegarde et restauration testées', 'Réseau, VLAN et adresses validés', 'Stockage et compatibilité cible vérifiés', 'Dépendances applicatives identifiées', 'Fenêtre de coupure approuvée', 'Tests de recette et retour arrière définis'];

export default function MigrationPlanner({ data, demo }) {
  const workloads = useMemo(() => [...data.vms, ...(data.containers || [])].filter(v => !v.template), [data]);
  const [selected, setSelected] = useState([]);
  const [capacity, setCapacity] = useState({ cpu: '', ram: '', disk: '' });
  const [checklist, setChecklist] = useState([]);
  const [notes, setNotes] = useState('');
  const chosen = workloads.filter(vm => selected.includes(workloadKey(vm)));
  const analysis = analyzeMigration(chosen, capacity);
  const toggle = (vm) => setSelected(old => old.includes(workloadKey(vm)) ? old.filter(k => k !== workloadKey(vm)) : [...old, workloadKey(vm)]);
  const exportPlan = () => downloadFile(`plan-migration-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({
    schemaVersion: 1, generatedAt: new Date().toISOString(), inventoryAt: data.timestamp,
    demo: !!demo, purpose: 'Préparation uniquement ; compatibilité et migration non validées automatiquement.',
    collectionWarnings: data.warnings || [], capacity, analysis, checklist: checklistItems.map(label => ({ label, confirmed: checklist.includes(label) })), notes,
    workloads: chosen.map(vm => ({ type: vm.type || 'qemu', node: vm.node, vmid: vm.vmid, name: vm.name, status: vm.status, cpus: vm.cpus, maxmem: vm.maxmem, maxdisk: vm.maxdisk, findings: migrationFindings(vm) })),
  }, null, 2), 'application/json');

  return <section className="space-y-5" aria-labelledby="migration-title">
    <div className="glass-panel p-5 flex flex-wrap gap-4 justify-between items-start">
      <div className="max-w-2xl">
        <p className="section-title mb-2">Préparer une vague</p>
        <h2 id="migration-title" className="text-xl font-bold text-slate-900">Plan de migration</h2>
        <p className="text-sm text-slate-600 mt-2">Sélectionnez les VM et conteneurs, comparez leurs allocations à la capacité disponible de la cible et préparez les contrôles avant bascule.</p>
        <p className="text-xs text-slate-500 mt-2">Estimation, sans déplacement automatique. Les tailles disque déclarées ne couvrent pas nécessairement tous les disques, snapshots ou montages. Le plan reste en mémoire jusqu’à la fermeture de cette session ; exportez-le pour le conserver.</p>
      </div>
      <button className="action-button" disabled={!chosen.length} onClick={exportPlan}>Exporter le plan JSON</button>
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-slate-800">1. Périmètre de la migration</h3>
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <button className="text-emerald-600 underline" onClick={() => setSelected(workloads.map(workloadKey))}>Tout sélectionner</button>
          <button className="text-slate-600 underline" onClick={() => setSelected([])}>Effacer la sélection</button>
          <span role="status" className="text-slate-500">{chosen.length} / {workloads.length} sélectionné(s)</span>
        </div>
        <div className="max-h-80 overflow-auto space-y-2">
          {!workloads.length && <p>Aucune charge de travail disponible.</p>}
          {workloads.map(vm => <label key={workloadKey(vm)} className="flex gap-3 items-start p-3 rounded-lg bg-slate-50 cursor-pointer">
            <input type="checkbox" className="mt-1 accent-emerald-600" checked={selected.includes(workloadKey(vm))} onChange={() => toggle(vm)} />
            <span className="min-w-0"><span className="block text-sm font-semibold text-slate-800 break-words">{vm.name}</span><span className="text-xs text-slate-500">{vm.type === 'lxc' ? 'LXC' : 'VM'} {vm.vmid} · {vm.node} · {vm.cpus || '?'} vCPU · {vm.maxmem ? (vm.maxmem / GiB).toFixed(1) : '?'} GiB RAM</span></span>
          </label>)}
        </div>
      </div>
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-slate-800">2. Capacité disponible de la cible</h3>
        <p className="text-xs text-slate-500">Saisissez le budget réellement disponible après réserve de sécurité. Une valeur vide signifie « inconnu ». Le budget vCPU représente une allocation autorisée, pas une mesure de performance.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {Object.entries(labels).map(([key, label]) => <label key={key} className="text-xs text-slate-600">{label}<input type="number" min="0" step="any" value={capacity[key]} onChange={e => setCapacity(old => ({ ...old, [key]: e.target.value }))} className="planner-input mt-1" placeholder="Inconnu" /></label>)}
        </div>
        <div className="space-y-3" aria-live="polite">
          {analysis.checks.map(check => <div key={check.key} className="rounded-lg bg-slate-50 p-3 flex flex-wrap justify-between gap-2 text-sm">
            <span>{labels[check.key]} : <strong>{check.required.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</strong></span>
            <span className={check.state === 'exceeded' ? 'text-red-600' : check.state === 'fits' ? 'text-emerald-600' : 'text-slate-500'}>{check.state === 'exceeded' ? 'Capacité dépassée' : check.state === 'fits' ? 'Dans le budget déclaré' : 'À renseigner / vérifier'}</span>
          </div>)}
        </div>
        <p className="text-xs text-slate-500">Ces comparaisons ne valident ni la compatibilité CPU, ni le stockage, ni la migration à chaud.</p>
      </div>
    </div>
    <div className="glass-panel p-5 space-y-4">
      <h3 className="font-bold text-slate-800">3. Points d’attention</h3>
      {!chosen.length ? <p className="text-sm text-slate-500">Sélectionnez une charge de travail pour voir les vérifications à préparer.</p> : chosen.map(vm => <details key={workloadKey(vm)} className="rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">{vm.name} · {vm.type === 'lxc' ? 'LXC' : 'VM'} {vm.vmid} · {migrationFindings(vm).length} points à vérifier</summary>
        <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-slate-600">{migrationFindings(vm).map(f => <li key={f}>{f}</li>)}</ul>
      </details>)}
    </div>
    <div className="glass-panel p-5 space-y-4">
      <h3 className="font-bold text-slate-800">4. Validation humaine et notes</h3>
      <div className="grid sm:grid-cols-2 gap-3">{checklistItems.map(label => <label key={label} className="flex items-start gap-2 text-sm text-slate-600"><input type="checkbox" className="mt-1 accent-emerald-600" checked={checklist.includes(label)} onChange={() => setChecklist(old => old.includes(label) ? old.filter(v => v !== label) : [...old, label])} />{label}</label>)}</div>
      <label className="block text-sm text-slate-600">Notes de migration<textarea className="planner-input mt-2" rows="4" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Responsable, ordre des dépendances, fenêtre de bascule, procédure de retour arrière…" /></label>
    </div>
  </section>;
}
