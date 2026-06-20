import { FileText, History } from 'lucide-react';
import type { ActivityLog, ChallengeEvidence, RecoveryChallenge } from '../types';
import { NeonCard } from './NeonCard';

type EvidenceCenterProps = {
  evidence: ChallengeEvidence[];
  challenges: RecoveryChallenge[];
  logs: ActivityLog[];
  onSoftDeleteEvidence: (evidence: ChallengeEvidence) => Promise<void>;
};

export function EvidenceCenter({ evidence, challenges, logs, onSoftDeleteEvidence }: EvidenceCenterProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <NeonCard tone="blue">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-forge-blue/30 bg-forge-blue/10 p-2 text-forge-blue">
            <FileText size={20} />
          </div>
          <h2 className="text-xl font-black text-white">Centro de evidencias</h2>
        </div>
        <div className="mt-5 space-y-3">
          {evidence.length ? evidence.map((item) => {
            const challenge = challenges.find((candidate) => candidate.id === item.challenge_id);
            return (
              <div key={item.id} className={`rounded-md border p-4 ${item.deleted_at ? 'border-forge-red/30 bg-forge-red/10 opacity-70' : 'border-white/10 bg-black/25'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-white">{challenge?.title ?? 'Evidencia'}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.description || item.body || item.link_url || item.file_path}</p>
                    <p className="mt-2 text-xs text-slate-500">{new Date(item.submitted_at).toLocaleString('es')} · {item.evidence_type}</p>
                  </div>
                  <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-bold text-slate-200">
                    {item.review_status}
                  </span>
                </div>
                {item.validator_comment ? <p className="mt-3 rounded-md border border-forge-violet/20 bg-forge-violet/10 p-3 text-sm text-slate-300">{item.validator_comment}</p> : null}
                {!item.deleted_at ? (
                  <button className="mt-3 text-sm font-semibold text-forge-red hover:text-white" onClick={() => onSoftDeleteEvidence(item)}>
                    Marcar como eliminada
                  </button>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-forge-red">Eliminada con registro de actividad</p>
                )}
              </div>
            );
          }) : <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">Aún no hay evidencias registradas.</p>}
        </div>
      </NeonCard>

      <NeonCard tone="violet">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-forge-violet/30 bg-forge-violet/10 p-2 text-forge-violet">
            <History size={20} />
          </div>
          <h2 className="text-xl font-black text-white">Actividad</h2>
        </div>
        <div className="scrollbar-thin mt-5 max-h-[620px] space-y-3 overflow-auto pr-1">
          {logs.length ? logs.map((log) => (
            <div key={log.id} className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="text-sm font-bold text-white">{log.entity_type}.{log.action}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(log.created_at).toLocaleString('es')}</p>
            </div>
          )) : <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">El historial aparecerá cuando existan acciones auditadas.</p>}
        </div>
      </NeonCard>
    </div>
  );
}

