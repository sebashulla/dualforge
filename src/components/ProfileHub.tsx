import { FormEvent, useState } from 'react';
import { Camera, Pencil, Trophy, X } from 'lucide-react';
import type { Profile, ProfileStats } from '../types';
import { NeonCard } from './NeonCard';

export type PublicProfileUpdate = {
  display_name: string;
  username: string;
  description: string;
  motto: string;
  avatar_file?: File | null;
};

type ProfileHubProps = {
  currentProfile: Profile;
  stats?: ProfileStats;
  onUpdateProfile: (profile: PublicProfileUpdate) => Promise<void>;
};

export function ProfileHub({ currentProfile, stats, onUpdateProfile }: ProfileHubProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-5">
      <NeonCard tone="green">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <ProfileIdentity profile={currentProfile} onEdit={() => setEditing(true)} />
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
            <ProfileStat label="Duelos ganados" value={stats?.duels_won ?? 0} tone="yellow" />
            <ProfileStat label="Racha de duelos" value={stats?.duel_streak ?? 0} tone="green" />
            <ProfileStat label="Retos abiertos" value={stats?.open_challenges_completed ?? 0} tone="blue" />
          </div>
        </div>
      </NeonCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <NeonCard tone="blue">
          <p className="text-sm text-slate-400">Usuario público</p>
          <p className="mt-1 text-xl font-black text-forge-blue">@{currentProfile.username ?? 'sin_usuario'}</p>
        </NeonCard>
        <NeonCard tone="violet" className="lg:col-span-2">
          <p className="text-sm text-slate-400">Descripción</p>
          <p className="mt-2 text-sm text-slate-200">{currentProfile.description || currentProfile.motto || 'Todavía no tienes descripción pública.'}</p>
        </NeonCard>
      </div>

      {editing ? (
        <EditProfileModal profile={currentProfile} onClose={() => setEditing(false)} onUpdateProfile={onUpdateProfile} />
      ) : null}
    </div>
  );
}

function ProfileIdentity({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-4">
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt={`Avatar de ${profile.display_name}`} className="size-24 rounded-lg object-cover" />
      ) : (
        <div className="flex size-24 items-center justify-center rounded-lg border border-forge-green/30 bg-forge-green/10">
          <img src="/branding/logo-icon.png" alt="Icono DUALFORGE" className="size-14 object-contain" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-forge-green">Mi perfil</p>
        <h2 className="mt-1 text-3xl font-black text-white">{profile.display_name}</h2>
        <p className="mt-1 text-sm font-semibold text-forge-blue">@{profile.username ?? 'sin_usuario'}</p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">{profile.motto || 'Sin frase personal.'}</p>
        <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-forge-blue px-3 py-2 text-sm font-bold text-black" onClick={onEdit}>
          <Pencil size={16} />
          Editar perfil
        </button>
      </div>
    </div>
  );
}

function EditProfileModal({
  profile,
  onClose,
  onUpdateProfile,
}: {
  profile: Profile;
  onClose: () => void;
  onUpdateProfile: (profile: PublicProfileUpdate) => Promise<void>;
}) {
  const [form, setForm] = useState({
    display_name: profile.display_name,
    username: profile.username ?? '',
    description: profile.description ?? '',
    motto: profile.motto ?? '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const normalizedUsername = form.username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onUpdateProfile({ ...form, username: normalizedUsername, avatar_file: avatarFile });
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg border border-forge-blue/30 bg-forge-panel p-5 shadow-blue">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white">Editar perfil</h2>
          <button className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} title="Cerrar">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-slate-300 hover:border-forge-blue">
            <Camera size={18} />
            <span>{avatarFile ? avatarFile.name : 'Cambiar foto de perfil'}</span>
            <input className="hidden" type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} />
          </label>
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-blue" placeholder="Nombre visible" value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} required />
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-blue" placeholder="usuario_publico" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
          {form.username ? <p className="text-xs text-slate-500">dualforge.app/@{normalizedUsername || 'usuario'}</p> : null}
          <textarea className="min-h-24 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-blue" placeholder="Descripción pública" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-blue" placeholder="Frase personal" value={form.motto} onChange={(event) => setForm({ ...form, motto: event.target.value })} />
          <button className="w-full rounded-md bg-forge-blue px-4 py-3 font-bold text-black disabled:opacity-50" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </form>
      </section>
    </div>
  );
}

function ProfileStat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'yellow' }) {
  const toneClass = {
    green: 'text-forge-green border-forge-green/30 bg-forge-green/10',
    blue: 'text-forge-blue border-forge-blue/30 bg-forge-blue/10',
    yellow: 'text-forge-yellow border-forge-yellow/30 bg-forge-yellow/10',
  }[tone];
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2">
        {tone === 'yellow' ? <Trophy size={16} /> : null}
        <p className="text-xs text-slate-300">{label}</p>
      </div>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

