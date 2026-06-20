import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flame, Plus, RotateCcw, Send, SquareCheckBig, X, XCircle } from 'lucide-react';
import { containsUnsafeChallenge } from '../lib/metrics';
import type { ChallengeEvidence, Difficulty, EvidenceType, Profile, RecoveryChallenge } from '../types';
import { NeonCard } from './NeonCard';

type ChallengeCenterProps = {
  userId: string;
  duelId: string | null;
  rival: Profile | null;
  challenges: RecoveryChallenge[];
  evidence: ChallengeEvidence[];
  onCreateChallenge: (challenge: NewChallenge) => Promise<void>;
  onSubmitEvidence: (challenge: RecoveryChallenge, payload: EvidencePayload) => Promise<void>;
  onReviewEvidence: (challenge: RecoveryChallenge, evidence: ChallengeEvidence, decision: 'approved' | 'rejected' | 'needs_changes', comment: string) => Promise<void>;
  onDecideChallenge: (challenge: RecoveryChallenge, decision: 'finished' | 'continued') => Promise<void>;
};

export type NewChallenge = {
  target_user_id: string;
  title: string;
  description: string;
  due_at: string;
  difficulty: Difficulty;
  points: number;
  required_evidence: EvidenceType;
  creator_comment: string;
};

export type EvidencePayload = {
  evidence_type: EvidenceType;
  body: string;
  link_url: string;
  description: string;
  file?: File | null;
};

export function ChallengeCenter({
  userId,
  duelId,
  rival,
  challenges,
  evidence,
  onCreateChallenge,
  onSubmitEvidence,
  onReviewEvidence,
  onDecideChallenge,
}: ChallengeCenterProps) {
  const [creating, setCreating] = useState(false);
  const incoming = challenges.filter((challenge) => challenge.target_user_id === userId);
  const created = challenges.filter((challenge) => challenge.creator_user_id === userId);
  const latestEvidence = useMemo(
    () => Object.fromEntries(evidence.map((item) => [item.challenge_id, item])),
    [evidence],
  );

  return (
    <div className="space-y-5">
      <NeonCard tone="violet">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Flame className="text-forge-violet" size={22} />
            <div>
              <h2 className="text-xl font-black text-white">Retos de recuperación</h2>
              <p className="text-sm text-slate-400">Crea retos solo cuando haya rival activo y revisa evidencias sin ruido.</p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-forge-violet px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!duelId || !rival}
            onClick={() => setCreating(true)}
          >
            <Plus size={18} />
            Crear reto
          </button>
        </div>
      </NeonCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <NeonCard tone="red">
          <h2 className="text-xl font-black text-white">Retos recibidos</h2>
          <div className="mt-4 space-y-3">
            {incoming.length ? incoming.map((challenge) => (
              <ChallengeItem key={challenge.id} challenge={challenge} evidence={latestEvidence[challenge.id]} canSubmit onSubmitEvidence={onSubmitEvidence} onReviewEvidence={onReviewEvidence} onDecideChallenge={onDecideChallenge} />
            )) : <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">No tienes retos de recuperación activos.</p>}
          </div>
        </NeonCard>
        <NeonCard tone="blue">
          <h2 className="text-xl font-black text-white">Retos enviados</h2>
          <div className="mt-4 space-y-3">
            {created.length ? created.map((challenge) => (
              <ChallengeItem key={challenge.id} challenge={challenge} evidence={latestEvidence[challenge.id]} canReview onSubmitEvidence={onSubmitEvidence} onReviewEvidence={onReviewEvidence} onDecideChallenge={onDecideChallenge} />
            )) : <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">Aún no has enviado retos al rival.</p>}
          </div>
        </NeonCard>
      </div>

      {creating && rival ? (
        <ChallengeModal rival={rival} onClose={() => setCreating(false)} onCreateChallenge={onCreateChallenge} />
      ) : null}
    </div>
  );
}

function ChallengeModal({ rival, onClose, onCreateChallenge }: { rival: Profile; onClose: () => void; onCreateChallenge: (challenge: NewChallenge) => Promise<void> }) {
  const [challenge, setChallenge] = useState<NewChallenge>({
    target_user_id: rival.id,
    title: '',
    description: '',
    due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    difficulty: 'medium',
    points: 25,
    required_evidence: 'reflection',
    creator_comment: '',
  });
  const [loading, setLoading] = useState(false);
  const unsafe = containsUnsafeChallenge(`${challenge.title} ${challenge.description} ${challenge.creator_comment}`);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (unsafe) return;
    setLoading(true);
    await onCreateChallenge({ ...challenge, target_user_id: rival.id });
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg border border-forge-violet/30 bg-forge-panel p-5 shadow-violet">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Crear reto de recuperación</h2>
            <p className="mt-1 text-sm text-slate-400">Rival: {rival.display_name}</p>
          </div>
          <button className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} title="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="mt-4 rounded-md border border-forge-blue/20 bg-forge-blue/10 p-3 text-xs text-slate-300">
          Tipos recomendados: estudio, ejercicio, orden, lectura, proyectos, reflexión, productividad.
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" placeholder="Título" value={challenge.title} onChange={(event) => setChallenge({ ...challenge, title: event.target.value })} required />
          <textarea className="min-h-24 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" placeholder="Descripción" value={challenge.description} onChange={(event) => setChallenge({ ...challenge, description: event.target.value })} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" type="datetime-local" value={challenge.due_at} onChange={(event) => setChallenge({ ...challenge, due_at: event.target.value })} required />
            <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" value={challenge.required_evidence} onChange={(event) => setChallenge({ ...challenge, required_evidence: event.target.value as EvidenceType })}>
              <option value="reflection">Reflexión</option>
              <option value="image">Imagen</option>
              <option value="text">Texto</option>
              <option value="document">Documento</option>
              <option value="link">Enlace</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" value={challenge.difficulty} onChange={(event) => setChallenge({ ...challenge, difficulty: event.target.value as Difficulty })}>
              <option value="easy">Fácil</option>
              <option value="medium">Media</option>
              <option value="hard">Difícil</option>
              <option value="legendary">Legendaria</option>
            </select>
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" type="number" min={0} value={challenge.points} onChange={(event) => setChallenge({ ...challenge, points: Number(event.target.value) })} />
          </div>
          <textarea className="min-h-20 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" placeholder="Comentario del creador" value={challenge.creator_comment} onChange={(event) => setChallenge({ ...challenge, creator_comment: event.target.value })} />
          {unsafe ? (
            <div className="flex items-center gap-2 rounded-md border border-forge-red/30 bg-forge-red/10 p-3 text-sm text-forge-red">
              <AlertTriangle size={18} />
              Reto bloqueado por reglas de seguridad.
            </div>
          ) : null}
          <button className="w-full rounded-md bg-forge-violet px-4 py-3 font-bold text-white disabled:opacity-50" disabled={loading || unsafe}>
            {loading ? 'Enviando...' : 'Enviar reto'}
          </button>
        </form>
      </section>
    </div>
  );
}

function ChallengeItem({
  challenge,
  evidence,
  canSubmit,
  canReview,
  onSubmitEvidence,
  onReviewEvidence,
  onDecideChallenge,
}: {
  challenge: RecoveryChallenge;
  evidence?: ChallengeEvidence;
  canSubmit?: boolean;
  canReview?: boolean;
  onSubmitEvidence: (challenge: RecoveryChallenge, payload: EvidencePayload) => Promise<void>;
  onReviewEvidence: (challenge: RecoveryChallenge, evidence: ChallengeEvidence, decision: 'approved' | 'rejected' | 'needs_changes', comment: string) => Promise<void>;
  onDecideChallenge: (challenge: RecoveryChallenge, decision: 'finished' | 'continued') => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const statusTone = challenge.status === 'approved' ? 'text-forge-green' : challenge.status === 'rejected' ? 'text-forge-red' : 'text-forge-yellow';
  const canDecide =
    canReview &&
    ['approved', 'rejected'].includes(challenge.status) &&
    challenge.continuation_status === 'undecided' &&
    (!challenge.decision_due_at || new Date(challenge.decision_due_at).getTime() >= Date.now());

  async function submitEvidence(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onSubmitEvidence(challenge, { evidence_type: challenge.required_evidence, body, link_url: link, description, file });
    setBody('');
    setLink('');
    setDescription('');
    setFile(null);
    setLoading(false);
  }

  async function review(decision: 'approved' | 'rejected' | 'needs_changes') {
    if (!evidence) return;
    setLoading(true);
    await onReviewEvidence(challenge, evidence, decision, comment);
    setComment('');
    setLoading(false);
  }

  async function decide(decision: 'finished' | 'continued') {
    setLoading(true);
    await onDecideChallenge(challenge, decision);
    setLoading(false);
  }

  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-black text-white">{challenge.title}</p>
          <p className="mt-1 text-sm text-slate-400">{challenge.description}</p>
        </div>
        <span className={`text-sm font-black ${statusTone}`}>{challenge.status}</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">Límite: {new Date(challenge.due_at).toLocaleString('es')} · +{challenge.points} XP</p>
      {challenge.decision_due_at ? (
        <p className="mt-1 text-xs text-slate-500">Decidir cierre o continuidad antes de {new Date(challenge.decision_due_at).toLocaleString('es')}.</p>
      ) : null}

      {canSubmit && ['pending', 'needs_changes', 'rejected'].includes(challenge.status) ? (
        <form onSubmit={submitEvidence} className="mt-4 space-y-2">
          <textarea className="min-h-20 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-forge-green" placeholder="Evidencia o reflexión" value={body} onChange={(event) => setBody(event.target.value)} />
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-forge-green" placeholder="Enlace opcional" value={link} onChange={(event) => setLink(event.target.value)} />
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-forge-green" placeholder="Descripción" value={description} onChange={(event) => setDescription(event.target.value)} />
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm file:text-slate-200" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <button className="inline-flex items-center gap-2 rounded-md bg-forge-green px-3 py-2 text-sm font-bold text-black" disabled={loading}>
            <Send size={16} />
            Enviar evidencia
          </button>
        </form>
      ) : null}

      {evidence ? (
        <div className="mt-4 rounded-md border border-forge-blue/20 bg-forge-blue/10 p-3 text-sm text-slate-300">
          <p className="font-bold text-forge-blue">Evidencia enviada</p>
          <p className="mt-1">{evidence.description || evidence.body || evidence.link_url || evidence.file_path}</p>
          <p className="mt-1 text-xs text-slate-500">{evidence.review_status}</p>
        </div>
      ) : null}

      {canReview && evidence && challenge.status === 'submitted' ? (
        <div className="mt-4 space-y-2">
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-forge-blue" placeholder="Comentario de revisión" value={comment} onChange={(event) => setComment(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-md bg-forge-green px-3 py-2 text-sm font-bold text-black" disabled={loading} onClick={() => review('approved')}>
              <CheckCircle2 size={16} />
              Aprobar
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-forge-red px-3 py-2 text-sm font-bold text-white" disabled={loading} onClick={() => review('rejected')}>
              <XCircle size={16} />
              Rechazar
            </button>
            <button className="rounded-md bg-forge-yellow px-3 py-2 text-sm font-bold text-black" disabled={loading} onClick={() => review('needs_changes')}>
              Nueva evidencia
            </button>
          </div>
        </div>
      ) : null}

      {canDecide ? (
        <div className="mt-4 rounded-md border border-forge-yellow/30 bg-forge-yellow/10 p-3">
          <p className="text-sm font-bold text-forge-yellow">Periodo de decisión activo</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-md bg-forge-green px-3 py-2 text-sm font-bold text-black" disabled={loading} onClick={() => decide('finished')}>
              <SquareCheckBig size={16} />
              Terminar reto
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-forge-violet px-3 py-2 text-sm font-bold text-white" disabled={loading} onClick={() => decide('continued')}>
              <RotateCcw size={16} />
              Continuarlo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

