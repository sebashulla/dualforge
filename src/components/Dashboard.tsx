import React from 'react';
import { CalendarDays, Flame, Shield, Zap } from 'lucide-react';
import type { Duel, RecoveryChallenge, UserMetrics } from '../types';
import { NeonCard } from './NeonCard';

type DashboardProps = {
  duel: Duel | null;
  mine: UserMetrics;
  rival: UserMetrics | null;
  pendingChallenge: RecoveryChallenge | null;
  onCreateDuel: (name: string, duration: number) => Promise<void>;
  onJoinDuel: (code: string) => Promise<void>;
};

export function Dashboard({ duel, mine, rival, pendingChallenge, onCreateDuel, onJoinDuel }: DashboardProps) {
  return (
    <div className="space-y-5">
      {!duel ? <DuelStarter onCreateDuel={onCreateDuel} onJoinDuel={onJoinDuel} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Racha actual" value={mine.currentStreak} label="días" icon={<Flame size={20} />} tone="green" />
        <MetricCard title="Pendientes hoy" value={mine.pendingHabits} label="hábitos" icon={<CalendarDays size={20} />} tone="blue" />
        <MetricCard title="Cumplimiento semanal" value={`${mine.completionRate}%`} label="consistencia" icon={<Shield size={20} />} tone="violet" />
        <MetricCard title="Disciplina XP" value={mine.xp} label="temporada" icon={<Zap size={20} />} tone="yellow" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <NeonCard tone="blue">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Pulso semanal</h2>
              <p className="text-sm text-slate-400">Completados contra hábitos programados.</p>
            </div>
            <span className="rounded-md border border-forge-blue/30 bg-forge-blue/10 px-3 py-1 text-sm font-bold text-forge-blue">
              {mine.completedToday}/{mine.completedToday + mine.pendingHabits} hoy
            </span>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {mine.weeklySeries.map((day) => (
              <div key={day.day} className="flex min-h-40 flex-col justify-end rounded-md border border-white/10 bg-black/25 p-2">
                <div className="rounded-sm bg-forge-green/85 shadow-green" style={{ height: `${Math.max(day.rate, 4)}%` }} />
                <p className="mt-2 text-center text-xs font-semibold text-slate-300">{day.day}</p>
                <p className="text-center text-[11px] text-slate-500">{day.rate}%</p>
              </div>
            ))}
          </div>
        </NeonCard>

        <NeonCard tone={pendingChallenge ? 'red' : 'green'}>
          <h2 className="text-lg font-black text-white">Estado de combate</h2>
          {pendingChallenge ? (
            <div className="mt-4 rounded-md border border-forge-red/30 bg-forge-red/10 p-3">
              <p className="font-bold text-forge-red">{pendingChallenge.title}</p>
              <p className="mt-2 text-sm text-slate-300">{pendingChallenge.description}</p>
              <p className="mt-3 text-xs text-slate-500">Límite: {new Date(pendingChallenge.due_at).toLocaleString('es')}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-300">No tienes reto de recuperación pendiente.</p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-slate-500">Tu mejor racha</p>
              <p className="text-2xl font-black text-white">{mine.bestStreak}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-slate-500">Rival</p>
              <p className="text-2xl font-black text-white">{rival?.currentStreak ?? 0}</p>
            </div>
          </div>
        </NeonCard>
      </div>

      <NeonCard tone="violet">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Heatmap mensual</h2>
          <p className="text-sm text-slate-400">Verde cumple, amarillo rescata, rojo falla.</p>
        </div>
        <div className="mt-4 grid grid-cols-10 gap-2 sm:grid-cols-[repeat(15,minmax(0,1fr))] md:grid-cols-[repeat(30,minmax(0,1fr))]">
          {mine.heatmap.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.status}`}
              className={`aspect-square rounded-sm border ${
                day.status === 'completed'
                  ? 'border-forge-green/40 bg-forge-green/80 shadow-green'
                  : day.status === 'rescued'
                    ? 'border-forge-yellow/40 bg-forge-yellow/80'
                    : day.status === 'failed'
                      ? 'border-forge-red/40 bg-forge-red/75 shadow-red'
                      : 'border-white/10 bg-white/[0.04]'
              }`}
            />
          ))}
        </div>
      </NeonCard>
    </div>
  );
}

function MetricCard({
  title,
  value,
  label,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  label: string;
  icon: React.ReactNode;
  tone: 'green' | 'blue' | 'violet' | 'yellow';
}) {
  const textTone = {
    green: 'text-forge-green',
    blue: 'text-forge-blue',
    violet: 'text-forge-violet',
    yellow: 'text-forge-yellow',
  }[tone];
  return (
    <NeonCard tone={tone}>
      <div className={`mb-4 inline-flex rounded-md border border-current/30 bg-current/10 p-2 ${textTone}`}>{icon}</div>
      <p className="text-sm text-slate-400">{title}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="text-3xl font-black text-white">{value}</p>
        <p className="pb-1 text-sm text-slate-500">{label}</p>
      </div>
    </NeonCard>
  );
}

function DuelStarter({
  onCreateDuel,
  onJoinDuel,
}: {
  onCreateDuel: (name: string, duration: number) => Promise<void>;
  onJoinDuel: (code: string) => Promise<void>;
}) {
  const [name, setName] = React.useState('Temporada DUALFORGE');
  const [duration, setDuration] = React.useState(30);
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function run(action: () => Promise<void>) {
    setLoading(true);
    await action();
    setLoading(false);
  }

  return (
    <NeonCard tone="green">
      <div className="flex items-center gap-3">
        <img src="/branding/logo-icon.png" alt="Icono DUALFORGE" className="size-9 object-contain drop-shadow-[0_0_12px_rgba(57,255,136,0.14)]" />
        <h2 className="text-xl font-black text-white">Crear o unirse a un duelo</h2>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_140px_auto_1fr_auto]">
        <input
          className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <select
          className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green"
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
        >
          <option value={30}>30 días</option>
          <option value={60}>60 días</option>
          <option value={90}>90 días</option>
        </select>
        <button className="rounded-md bg-forge-green px-4 py-3 font-bold text-black" disabled={loading} onClick={() => run(() => onCreateDuel(name, duration))}>
          Crear
        </button>
        <input
          className="rounded-md border border-white/10 bg-black/30 px-3 py-3 uppercase outline-none focus:border-forge-violet"
          placeholder="Código de invitación"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
        />
        <button className="rounded-md bg-forge-violet px-4 py-3 font-bold text-white" disabled={loading || !code} onClick={() => run(() => onJoinDuel(code))}>
          Unirme
        </button>
      </div>
    </NeonCard>
  );
}
