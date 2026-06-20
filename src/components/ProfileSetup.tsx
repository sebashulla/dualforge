import { FormEvent, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import type { Profile } from '../types';
import { NeonCard } from './NeonCard';

export type ProfileUpdate = {
  full_name: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  avatar_file?: File | null;
  motto: string;
  description: string;
};

type ProfileSetupProps = {
  userId: string;
  current?: Profile | null;
  onSave: (profile: ProfileUpdate) => Promise<void>;
  onSignOut: () => void;
};

export function ProfileSetup({ current, onSave, onSignOut }: ProfileSetupProps) {
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState(current?.display_name ?? '');
  const [username, setUsername] = useState(current?.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState(current?.avatar_url ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [motto, setMotto] = useState(current?.motto ?? '');
  const [description, setDescription] = useState(current?.description ?? '');
  const [loading, setLoading] = useState(false);

  const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onSave({
      full_name: fullName,
      display_name: displayName,
      username: normalizedUsername,
      avatar_url: avatarUrl || null,
      avatar_file: avatarFile,
      motto,
      description,
    });
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <NeonCard tone="green" className="w-full max-w-lg">
        <h1 className="text-2xl font-black text-white">Configura tu perfil</h1>
        <p className="mt-2 text-sm text-slate-400">El nombre completo queda en datos privados; el usuario es público.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" placeholder="Nombre completo privado" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" placeholder="Nombre visible" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" placeholder="usuario_publico" value={username} onChange={(event) => setUsername(event.target.value)} required />
          {username ? <p className="text-xs text-slate-500">dualforge.app/@{normalizedUsername || 'usuario'}</p> : null}
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" placeholder="URL de avatar opcional" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-slate-300 hover:border-forge-green">
            <UploadCloud size={18} />
            <span>{avatarFile ? avatarFile.name : 'Cargar foto de perfil'}</span>
            <input className="hidden" type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} />
          </label>
          <textarea className="min-h-24 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" placeholder="Descripción pública" value={description} onChange={(event) => setDescription(event.target.value)} />
          <textarea className="min-h-20 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" placeholder="Frase personal" value={motto} onChange={(event) => setMotto(event.target.value)} />
          <button className="w-full rounded-md bg-forge-green px-4 py-3 font-bold text-black" disabled={loading}>
            {loading ? 'Guardando...' : 'Activar perfil'}
          </button>
        </form>
        <button className="mt-4 text-sm text-slate-400 hover:text-white" onClick={onSignOut}>
          Cerrar sesión
        </button>
      </NeonCard>
    </main>
  );
}

