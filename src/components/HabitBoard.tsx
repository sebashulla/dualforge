import { FormEvent, useMemo, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { isoDate, isHabitDue } from '../lib/metrics';
import type { Difficulty, Habit, HabitCheckin, Visibility } from '../types';
import { NeonCard } from './NeonCard';

type HabitBoardProps = {
  habits: Habit[];
  checkins: HabitCheckin[];
  userId: string;
  duelId: string | null;
  onCreateHabit: (habit: NewHabit) => Promise<void>;
  onToggleCheckin: (habit: Habit, completed: boolean) => Promise<void>;
};

export type NewHabit = {
  name: string;
  category: string;
  difficulty: Difficulty;
  points: number;
  is_essential: boolean;
  requires_evidence: boolean;
  visibility: Visibility;
};

export function HabitBoard({ habits, checkins, userId, duelId, onCreateHabit, onToggleCheckin }: HabitBoardProps) {
  const today = isoDate();
  const myHabits = useMemo(() => habits.filter((habit) => habit.user_id === userId), [habits, userId]);
  const dueToday = myHabits.filter((habit) => isHabitDue(habit));

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <HabitForm disabled={!duelId} onCreateHabit={onCreateHabit} />
      <NeonCard tone="green">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Checklist diario</h2>
            <p className="text-sm text-slate-400">{new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <span className="rounded-md border border-forge-green/30 bg-forge-green/10 px-3 py-1 text-sm font-bold text-forge-green">
            {dueToday.filter((habit) => isChecked(habit.id, today, checkins)).length}/{dueToday.length}
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {dueToday.length ? (
            dueToday.map((habit) => {
              const checked = isChecked(habit.id, today, checkins);
              return (
                <button
                  key={habit.id}
                  className={`grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 rounded-md border p-3 text-left transition ${
                    checked ? 'border-forge-green/40 bg-forge-green/10' : 'border-white/10 bg-white/[0.03] hover:border-forge-blue/40'
                  }`}
                  onClick={() => onToggleCheckin(habit, !checked)}
                >
                  <span className={`flex size-9 items-center justify-center rounded-md border ${checked ? 'border-forge-green bg-forge-green text-black' : 'border-white/20 text-slate-500'}`}>
                    <Check size={18} />
                  </span>
                  <span>
                    <span className="block font-bold text-white">{habit.name}</span>
                    <span className="text-xs text-slate-500">
                      {habit.category} · {habit.difficulty} · {habit.is_essential ? 'esencial' : 'opcional'}
                    </span>
                  </span>
                  <span className="font-black text-forge-green">+{habit.points}</span>
                </button>
              );
            })
          ) : (
            <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">No hay hábitos programados para hoy.</p>
          )}
        </div>
      </NeonCard>

      <NeonCard tone="blue" className="xl:col-span-2">
        <h2 className="text-xl font-black text-white">Calendario rápido</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {myHabits.map((habit) => (
            <div key={habit.id} className="rounded-md border border-white/10 bg-black/25 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{habit.name}</p>
                  <p className="text-xs text-slate-500">{habit.visibility} · {habit.requires_evidence ? 'con evidencia' : 'sin evidencia'}</p>
                </div>
                <span className={`rounded px-2 py-1 text-xs font-bold ${habit.is_essential ? 'bg-forge-red/15 text-forge-red' : 'bg-forge-blue/15 text-forge-blue'}`}>
                  {habit.is_essential ? 'Core' : 'Extra'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </NeonCard>
    </div>
  );
}

function HabitForm({ disabled, onCreateHabit }: { disabled: boolean; onCreateHabit: (habit: NewHabit) => Promise<void> }) {
  const [habit, setHabit] = useState<NewHabit>({
    name: '',
    category: 'Productividad',
    difficulty: 'medium',
    points: 10,
    is_essential: true,
    requires_evidence: false,
    visibility: 'duel',
  });
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onCreateHabit(habit);
    setHabit((current) => ({ ...current, name: '' }));
    setLoading(false);
  }

  return (
    <NeonCard tone="violet">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-md border border-forge-violet/30 bg-forge-violet/10 p-2 text-forge-violet">
          <Plus size={20} />
        </div>
        <h2 className="text-xl font-black text-white">Nuevo hábito</h2>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" placeholder="Nombre" value={habit.name} onChange={(event) => setHabit({ ...habit, name: event.target.value })} required />
        <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" placeholder="Categoría" value={habit.category} onChange={(event) => setHabit({ ...habit, category: event.target.value })} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" value={habit.difficulty} onChange={(event) => setHabit({ ...habit, difficulty: event.target.value as Difficulty })}>
            <option value="easy">Fácil</option>
            <option value="medium">Media</option>
            <option value="hard">Difícil</option>
            <option value="legendary">Legendaria</option>
          </select>
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" type="number" min={0} value={habit.points} onChange={(event) => setHabit({ ...habit, points: Number(event.target.value) })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
            <input type="checkbox" checked={habit.is_essential} onChange={(event) => setHabit({ ...habit, is_essential: event.target.checked })} />
            Esencial
          </label>
          <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
            <input type="checkbox" checked={habit.requires_evidence} onChange={(event) => setHabit({ ...habit, requires_evidence: event.target.checked })} />
            Requiere evidencia
          </label>
        </div>
        <button className="w-full rounded-md bg-forge-violet px-4 py-3 font-bold text-white disabled:opacity-50" disabled={disabled || loading}>
          {disabled ? 'Crea un duelo primero' : loading ? 'Guardando...' : 'Crear hábito'}
        </button>
      </form>
    </NeonCard>
  );
}

function isChecked(habitId: string, date: string, checkins: HabitCheckin[]) {
  return checkins.some((checkin) => checkin.habit_id === habitId && checkin.checkin_date === date && checkin.completed);
}

