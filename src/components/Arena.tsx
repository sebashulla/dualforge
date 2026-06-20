import type { DuelMember, UserMetrics } from '../types';
import { NeonCard } from './NeonCard';

type ArenaProps = {
  mine: UserMetrics;
  rival: UserMetrics | null;
  members: DuelMember[];
};

export function Arena({ mine, rival, members }: ArenaProps) {
  const leader = rival && rival.xp > mine.xp ? rival.displayName : mine.displayName;
  return (
    <div className="space-y-5">
      <NeonCard tone="violet">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-forge-violet">Arena</p>
            <h2 className="mt-1 text-3xl font-black text-white">Líder actual: {leader}</h2>
          </div>
          <p className="text-sm text-slate-400">{members.length}/2 miembros en el duelo MVP</p>
        </div>
      </NeonCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <FighterCard title="Tú" metrics={mine} tone="green" />
        {rival ? <FighterCard title="Rival" metrics={rival} tone="red" /> : <EmptyRival />}
      </div>

      <NeonCard tone="blue">
        <h3 className="text-lg font-black text-white">Ranking de temporada</h3>
        <div className="mt-4 space-y-3">
          {[mine, rival].filter(Boolean).sort((a, b) => (b?.xp ?? 0) - (a?.xp ?? 0)).map((metric, index) => (
            <div key={metric!.userId} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
              <span className="text-lg font-black text-forge-yellow">#{index + 1}</span>
              <span className="font-bold text-white">{metric!.displayName}</span>
              <span className="text-sm font-bold text-forge-green">{metric!.xp} XP</span>
            </div>
          ))}
        </div>
      </NeonCard>
    </div>
  );
}

function FighterCard({ title, metrics, tone }: { title: string; metrics: UserMetrics; tone: 'green' | 'red' }) {
  return (
    <NeonCard tone={tone}>
      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <h3 className="mt-1 text-2xl font-black text-white">{metrics.displayName}</h3>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <ArenaStat label="Puntos" value={metrics.xp} />
        <ArenaStat label="Racha actual" value={metrics.currentStreak} />
        <ArenaStat label="Mejor racha" value={metrics.bestStreak} />
        <ArenaStat label="Cumplimiento" value={`${metrics.completionRate}%`} />
        <ArenaStat label="Retos recuperados" value={metrics.rescuedDays} />
        <ArenaStat label="Metas logradas" value={metrics.goalsReached} />
      </div>
    </NeonCard>
  );
}

function ArenaStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function EmptyRival() {
  return (
    <NeonCard tone="blue">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Rival</p>
      <h3 className="mt-1 text-2xl font-black text-white">Esperando invitación</h3>
      <p className="mt-4 text-sm text-slate-400">Comparación activa cuando el segundo usuario se una al duelo.</p>
    </NeonCard>
  );
}

