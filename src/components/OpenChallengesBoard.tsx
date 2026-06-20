import { FormEvent, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Search, UsersRound, X } from 'lucide-react';
import type { Difficulty, EvidenceType, OpenChallenge, OpenChallengeParticipant, Profile } from '../types';
import { NeonCard } from './NeonCard';

export type NewOpenChallenge = {
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  points: number;
  min_participants: number;
  max_participants: number;
  starts_at: string;
  ends_at: string;
  evidence_type: EvidenceType;
  rules: string;
};

type OpenChallengesBoardProps = {
  userId: string;
  profiles: Profile[];
  challenges: OpenChallenge[];
  participants: OpenChallengeParticipant[];
  onCreateChallenge: (challenge: NewOpenChallenge) => Promise<void>;
  onJoinChallenge: (challenge: OpenChallenge) => Promise<void>;
  onCompleteChallenge: (challenge: OpenChallenge) => Promise<void>;
};

export function OpenChallengesBoard({ userId, profiles, challenges, participants, onCreateChallenge, onJoinChallenge, onCompleteChallenge }: OpenChallengesBoardProps) {
  const [query, setQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return challenges.filter((challenge) => {
      if (!normalized) return true;
      return [challenge.title, challenge.description, challenge.category].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [challenges, query]);

  async function run(challenge: OpenChallenge, action: (challenge: OpenChallenge) => Promise<void>) {
    setLoadingId(challenge.id);
    await action(challenge);
    setLoadingId(null);
  }

  return (
    <div className="space-y-5">
      <NeonCard tone="blue">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="text-forge-blue" size={20} />
              <h2 className="text-xl font-black text-white">Retos abiertos</h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">Busca retos públicos y únete solo o con más personas.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 py-3 pl-10 pr-3 outline-none focus:border-forge-blue"
                placeholder="Buscar por tema o categoría"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-forge-violet px-4 py-3 font-bold text-white" onClick={() => setCreating(true)}>
              <Plus size={18} />
              Crear duelo abierto
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {filtered.length ? filtered.map((challenge) => {
            const joined = participants.filter((participant) => participant.challenge_id === challenge.id && participant.status !== 'left');
            const mine = joined.find((participant) => participant.user_id === userId);
            const creator = profiles.find((profile) => profile.id === challenge.creator_user_id);
            const full = joined.length >= challenge.max_participants;
            return (
              <article key={challenge.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-forge-violet">{challenge.category}</p>
                    <h3 className="mt-1 text-xl font-black text-white">{challenge.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{challenge.description}</p>
                  </div>
                  <span className="rounded-md border border-forge-green/30 bg-forge-green/10 px-3 py-1 text-sm font-bold text-forge-green">
                    {challenge.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <Info label="Creador" value={creator?.display_name ?? 'Usuario'} />
                  <Info label="Participantes" value={`${joined.length}/${challenge.max_participants}`} />
                  <Info label="Dificultad" value={challenge.difficulty} />
                  <Info label="XP" value={`+${challenge.points}`} />
                </div>
                {challenge.rules ? <p className="mt-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{challenge.rules}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {!mine ? (
                    <button className="rounded-md bg-forge-violet px-3 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={full || loadingId === challenge.id} onClick={() => run(challenge, onJoinChallenge)}>
                      {full ? 'Completo' : 'Unirme'}
                    </button>
                  ) : mine.status === 'completed' ? (
                    <span className="inline-flex items-center gap-2 rounded-md border border-forge-green/30 bg-forge-green/10 px-3 py-2 text-sm font-bold text-forge-green">
                      <CheckCircle2 size={16} />
                      Completado
                    </span>
                  ) : (
                    <button className="rounded-md bg-forge-green px-3 py-2 text-sm font-bold text-black disabled:opacity-50" disabled={loadingId === challenge.id} onClick={() => run(challenge, onCompleteChallenge)}>
                      Marcar completado
                    </button>
                  )}
                </div>
              </article>
            );
          }) : <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">No hay retos abiertos con ese filtro.</p>}
        </div>
      </NeonCard>
      {creating ? <OpenChallengeModal onClose={() => setCreating(false)} onCreateChallenge={onCreateChallenge} /> : null}
    </div>
  );
}

function OpenChallengeModal({ onClose, onCreateChallenge }: { onClose: () => void; onCreateChallenge: (challenge: NewOpenChallenge) => Promise<void> }) {
  const [challenge, setChallenge] = useState<NewOpenChallenge>({
    title: '',
    description: '',
    category: 'Productividad',
    difficulty: 'medium',
    points: 25,
    min_participants: 2,
    max_participants: 2,
    starts_at: '',
    ends_at: '',
    evidence_type: 'reflection',
    rules: '',
  });
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onCreateChallenge(challenge);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-lg border border-forge-violet/30 bg-forge-panel p-5 shadow-violet">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Crear duelo abierto</h2>
            <p className="mt-1 text-sm text-slate-400">Define un reto para 2 o más participantes.</p>
          </div>
          <button className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} title="Cerrar">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-3 lg:grid-cols-2">
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" placeholder="Título del reto" value={challenge.title} onChange={(event) => setChallenge({ ...challenge, title: event.target.value })} required />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" placeholder="Categoría" value={challenge.category} onChange={(event) => setChallenge({ ...challenge, category: event.target.value })} required />
          <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet lg:col-span-2" placeholder="Descripción" value={challenge.description} onChange={(event) => setChallenge({ ...challenge, description: event.target.value })} required />
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" value={challenge.difficulty} onChange={(event) => setChallenge({ ...challenge, difficulty: event.target.value as Difficulty })}>
            <option value="easy">Fácil</option>
            <option value="medium">Media</option>
            <option value="hard">Difícil</option>
            <option value="legendary">Legendaria</option>
          </select>
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" value={challenge.evidence_type} onChange={(event) => setChallenge({ ...challenge, evidence_type: event.target.value as EvidenceType })}>
            <option value="reflection">Reflexión</option>
            <option value="image">Imagen</option>
            <option value="text">Texto</option>
            <option value="document">Documento</option>
            <option value="link">Enlace</option>
          </select>
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" type="number" min={1} value={challenge.min_participants} onChange={(event) => setChallenge({ ...challenge, min_participants: Number(event.target.value) })} />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" type="number" min={challenge.min_participants} value={challenge.max_participants} onChange={(event) => setChallenge({ ...challenge, max_participants: Number(event.target.value) })} />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" type="datetime-local" value={challenge.starts_at} onChange={(event) => setChallenge({ ...challenge, starts_at: event.target.value })} />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" type="datetime-local" value={challenge.ends_at} onChange={(event) => setChallenge({ ...challenge, ends_at: event.target.value })} />
          <textarea className="min-h-20 rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet lg:col-span-2" placeholder="Reglas o evidencia esperada" value={challenge.rules} onChange={(event) => setChallenge({ ...challenge, rules: event.target.value })} />
          <button className="rounded-md bg-forge-violet px-4 py-3 font-bold text-white disabled:opacity-50 lg:col-span-2" disabled={loading}>
            {loading ? 'Creando...' : 'Publicar duelo abierto'}
          </button>
        </form>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

