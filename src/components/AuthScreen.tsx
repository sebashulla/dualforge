import { FormEvent, useMemo, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, UploadCloud } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NeonCard } from './NeonCard';

type SignupForm = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  username: string;
  displayName: string;
  description: string;
  motto: string;
};

const initialSignup: SignupForm = {
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  username: '',
  displayName: '',
  description: '',
  motto: '',
};

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signup, setSignup] = useState(initialSignup);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedUsername = useMemo(
    () => signup.username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    [signup.username],
  );
  const passwordsMatch = signup.password === signup.confirmPassword;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!supabase) {
      setMessage('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.');
      return;
    }

    setLoading(true);
    if (mode === 'signin') {
      const result = await supabase.auth.signInWithPassword({
        email: signinEmail,
        password: signinPassword,
      });
      setLoading(false);
      setMessage(result.error ? result.error.message : 'Acceso concedido.');
      return;
    }

    if (!passwordsMatch) {
      setLoading(false);
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    if (normalizedUsername.length < 3) {
      setLoading(false);
      setMessage('El nombre de usuario debe tener al menos 3 caracteres válidos.');
      return;
    }

    const availability = await supabase.rpc('is_username_available', { input: normalizedUsername });
    if (availability.error || availability.data !== true) {
      setLoading(false);
      setMessage(availability.error?.message ?? 'Ese nombre de usuario ya está ocupado.');
      return;
    }

    const result = await supabase.auth.signUp({
      email: signup.email,
      password: signup.password,
      options: {
        data: {
          full_name: signup.fullName,
          username: normalizedUsername,
          display_name: signup.displayName || normalizedUsername,
          description: signup.description,
          motto: signup.motto,
        },
      },
    });

    if (result.error) {
      setLoading(false);
      setMessage(result.error.message);
      return;
    }

    if (avatarFile && result.data.session && result.data.user) {
      const path = `${result.data.user.id}/${Date.now()}-${avatarFile.name}`;
      const upload = await supabase.storage.from('avatars').upload(path, avatarFile);
      if (!upload.error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', result.data.user.id);
        window.dispatchEvent(new Event('dualforge:profile-updated'));
      }
    }

    setLoading(false);
    setMessage(
      result.data.session
        ? 'Cuenta creada. Perfil inicial listo.'
        : 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión. Podrás cargar o cambiar tu foto desde Mi perfil.',
    );
  }

  return (
    <main className="neon-grid flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_460px] lg:items-center">
        <div>
          <img
            src="/branding/logo-grande.png"
            alt="Logo DUALFORGE"
            className="h-auto w-48 object-contain drop-shadow-[0_0_18px_rgba(57,255,136,0.14)] sm:w-64 lg:w-[280px]"
          />
          <h1 className="mt-3 max-w-3xl text-4xl font-black text-white sm:text-6xl">
            Arena privada de disciplina y rachas.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            Hábitos, rescates, evidencias y XP competitivo para duelos sanos entre usuarios reales.
          </p>
        </div>

        <NeonCard tone="blue">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-md border border-forge-blue/40 bg-forge-blue/10 p-2 text-forge-blue">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
              <p className="text-sm text-slate-400">Conexión real con Supabase Auth.</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-forge-blue" placeholder="Nombre completo privado" value={signup.fullName} onChange={(event) => setSignup({ ...signup, fullName: event.target.value })} required />
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-forge-blue" placeholder="Nombre visible" value={signup.displayName} onChange={(event) => setSignup({ ...signup, displayName: event.target.value })} required />
                </div>
                <div>
                  <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-forge-blue" placeholder="usuario_publico" value={signup.username} onChange={(event) => setSignup({ ...signup, username: event.target.value })} required />
                  {signup.username ? <p className="mt-1 text-xs text-slate-500">dualforge.app/@{normalizedUsername || 'usuario'}</p> : null}
                </div>
                <textarea className="min-h-20 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-forge-blue" placeholder="Descripción pública" value={signup.description} onChange={(event) => setSignup({ ...signup, description: event.target.value })} />
                <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-forge-blue" placeholder="Frase personal" value={signup.motto} onChange={(event) => setSignup({ ...signup, motto: event.target.value })} />
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-slate-300 hover:border-forge-blue">
                  <UploadCloud size={18} />
                  <span>{avatarFile ? avatarFile.name : 'Cargar foto de perfil'}</span>
                  <input className="hidden" type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} />
                </label>
              </>
            ) : null}

            <input
              className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-forge-blue"
              placeholder="correo@dualforge.app"
              type="email"
              value={mode === 'signin' ? signinEmail : signup.email}
              onChange={(event) => mode === 'signin' ? setSigninEmail(event.target.value) : setSignup({ ...signup, email: event.target.value })}
              required
            />
            <PasswordInput
              placeholder="Contraseña"
              value={mode === 'signin' ? signinPassword : signup.password}
              show={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
              onChange={(value) => mode === 'signin' ? setSigninPassword(value) : setSignup({ ...signup, password: value })}
            />
            {mode === 'signup' ? (
              <PasswordInput
                placeholder="Confirmar contraseña"
                value={signup.confirmPassword}
                show={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                onChange={(value) => setSignup({ ...signup, confirmPassword: value })}
                invalid={Boolean(signup.confirmPassword) && !passwordsMatch}
              />
            ) : null}
            <button
              className="w-full rounded-md bg-forge-green px-4 py-3 font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Procesando...' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
          <button
            className="mt-4 text-sm font-semibold text-forge-blue hover:text-white"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setMessage('');
            }}
          >
            {mode === 'signin' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
          </button>
          {message ? <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-200">{message}</p> : null}
        </NeonCard>
      </div>
    </main>
  );
}

function PasswordInput({
  value,
  placeholder,
  show,
  invalid,
  onToggle,
  onChange,
}: {
  value: string;
  placeholder: string;
  show: boolean;
  invalid?: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <input
        className={`w-full rounded-md border bg-black/30 px-3 py-3 pr-12 text-white outline-none focus:border-forge-blue ${invalid ? 'border-forge-red' : 'border-white/10'}`}
        placeholder={placeholder}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={6}
        required
      />
      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" onClick={onToggle} title={show ? 'Ocultar contraseña' : 'Ver contraseña'}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
