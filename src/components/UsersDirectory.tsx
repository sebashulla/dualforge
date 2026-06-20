import { useMemo, useState } from 'react';
import { Search, Trophy, Users } from 'lucide-react';
import type { Profile, ProfileStats } from '../types';
import { NeonCard } from './NeonCard';

type UsersDirectoryProps = {
  currentUserId: string;
  profiles: Profile[];
  stats: ProfileStats[];
};

export function UsersDirectory({ currentUserId, profiles, stats }: UsersDirectoryProps) {
  const [query, setQuery] = useState('');
  const filteredProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (!normalized) return true;
      return [profile.display_name, profile.username, profile.description, profile.motto]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [profiles, query]);

  return (
    <NeonCard tone="blue">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-forge-blue">
            <Users size={18} />
            <h2 className="text-xl font-black text-white">Usuarios</h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">Lista pública de miembros para encontrar rivales y compañeros de retos.</p>
        </div>
        <div className="relative sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            className="w-full rounded-md border border-white/10 bg-black/30 py-3 pl-10 pr-3 outline-none focus:border-forge-blue"
            placeholder="Nombre, usuario o descripción"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[1.4fr_1fr_120px_120px] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          <span>Usuario</span>
          <span>Descripción</span>
          <span>Ganados</span>
          <span>Racha</span>
        </div>
        {filteredProfiles.map((profile) => {
          const profileStats = stats.find((item) => item.user_id === profile.id);
          return (
            <div key={profile.id} className="grid grid-cols-[1.4fr_1fr_120px_120px] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={`Avatar de ${profile.display_name}`} className="size-10 rounded-md object-cover" />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
                    <img src="/branding/logo-icon.png" alt="Icono DUALFORGE" className="size-6 object-contain" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-black text-white">{profile.display_name}</p>
                    {profile.id === currentUserId ? <span className="rounded bg-forge-green/15 px-2 py-0.5 text-xs font-bold text-forge-green">Tú</span> : null}
                  </div>
                  <p className="text-sm text-forge-blue">@{profile.username ?? 'sin_usuario'}</p>
                </div>
              </div>
              <p className="line-clamp-2 text-sm text-slate-400">{profile.description || profile.motto || 'Sin descripción pública.'}</p>
              <div className="flex items-center gap-1 text-forge-yellow">
                <Trophy size={14} />
                <span className="font-black">{profileStats?.duels_won ?? 0}</span>
              </div>
              <p className="font-black text-forge-green">{profileStats?.duel_streak ?? 0}</p>
            </div>
          );
        })}
        {!filteredProfiles.length ? (
          <p className="p-4 text-sm text-slate-400">No hay usuarios con ese filtro.</p>
        ) : null}
      </div>
    </NeonCard>
  );
}

