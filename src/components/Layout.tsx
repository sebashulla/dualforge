import { Activity, Flame, Gauge, LogOut, Swords, Trophy, UploadCloud } from 'lucide-react';
import type { Duel, Profile, UserMetrics, View } from '../types';

const nav = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: Gauge },
  { id: 'arena' as const, label: 'Arena', icon: Swords },
  { id: 'habits' as const, label: 'Hábitos', icon: Activity },
  { id: 'challenges' as const, label: 'Retos', icon: Flame },
  { id: 'evidence' as const, label: 'Evidencias', icon: UploadCloud },
];

type LayoutProps = {
  profile: Profile;
  duel: Duel | null;
  metrics: UserMetrics | null;
  view: View;
  onView: (view: View) => void;
  onSignOut: () => void;
  children: React.ReactNode;
};

export function Layout({ profile, duel, metrics, view, onView, onSignOut, children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/90 px-2 py-2 backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-64 lg:border-r lg:border-t-0 lg:px-4 lg:py-6">
        <div className="flex items-center justify-center px-1 lg:hidden">
          <img src="/branding/logo-icon.png" alt="Icono DUALFORGE" className="size-8 object-contain drop-shadow-[0_0_12px_rgba(57,255,136,0.16)]" />
        </div>
        <div className="hidden lg:block">
          <img
            src="/branding/logo-grande.png"
            alt="Logo DUALFORGE"
            className="h-auto w-44 object-contain drop-shadow-[0_0_14px_rgba(57,255,136,0.12)]"
          />
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm text-slate-400">Operador</p>
            <p className="mt-1 font-bold text-white">{profile.display_name}</p>
            <p className="mt-2 text-xs text-slate-500">{profile.motto || 'Sin frase personal'}</p>
          </div>
          <div className="mt-3 rounded-lg border border-forge-yellow/20 bg-forge-yellow/10 p-3">
            <div className="flex items-center gap-2 text-forge-yellow">
              <Trophy size={16} />
              <span className="text-sm font-bold">Nivel {profile.level}</span>
            </div>
            <p className="mt-1 text-xs text-slate-300">{metrics?.xp ?? 0} Disciplina XP</p>
          </div>
        </div>

        <nav className="flex justify-between gap-1 lg:mt-6 lg:block lg:space-y-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onView(item.id)}
                title={item.label}
                className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition lg:w-full lg:justify-start ${
                  active ? 'bg-forge-blue/15 text-forge-blue shadow-blue' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={19} />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          className="mt-6 hidden w-full items-center gap-2 rounded-md px-3 py-3 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white lg:flex"
          onClick={onSignOut}
        >
          <LogOut size={18} />
          Salir
        </button>
      </aside>

      <main className="px-4 pb-24 pt-5 sm:px-6 lg:ml-64 lg:px-8 lg:pb-8">
        <header className="mb-5 flex flex-col gap-3 rounded-lg border border-white/10 bg-black/25 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {!duel ? (
              <img src="/branding/logo-icon.png" alt="Icono DUALFORGE" className="size-9 object-contain drop-shadow-[0_0_12px_rgba(57,255,136,0.14)]" />
            ) : null}
            <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forge-green">Sistema de disciplina</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{duel?.name ?? 'Sin duelo activo'}</h1>
            </div>
          </div>
          {duel ? (
            <div className="rounded-md border border-forge-violet/30 bg-forge-violet/10 px-3 py-2 text-sm text-slate-200">
              Código: <span className="font-black text-forge-violet">{duel.invite_code}</span>
            </div>
          ) : null}
        </header>
        {children}
      </main>
    </div>
  );
}
