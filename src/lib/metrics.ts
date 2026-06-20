import type { ChallengeEvidence, Habit, HabitCheckin, Profile, RecoveryChallenge, ScoreEvent, UserMetrics } from '../types';

const dayMs = 24 * 60 * 60 * 1000;

export function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function difficultyMultiplier(difficulty: string) {
  return {
    easy: 1,
    medium: 1.35,
    hard: 1.8,
    legendary: 2.4,
  }[difficulty] ?? 1;
}

export function isHabitDue(habit: Habit, date = new Date()) {
  if (habit.archived_at) return false;
  if (habit.frequency === 'daily') return true;
  const day = date.getDay() === 0 ? 7 : date.getDay();
  return habit.repeat_days.includes(day);
}

function dayStatusForUser(
  userId: string,
  date: string,
  habits: Habit[],
  checkins: HabitCheckin[],
  challenges: RecoveryChallenge[],
) {
  const day = new Date(`${date}T12:00:00`);
  const essential = habits.filter((habit) => habit.user_id === userId && habit.is_essential && isHabitDue(habit, day));
  if (essential.length === 0) return 'empty' as const;
  const completedEssential = essential.every((habit) =>
    checkins.some((checkin) => checkin.habit_id === habit.id && checkin.checkin_date === date && checkin.completed),
  );
  if (completedEssential) return 'completed' as const;
  const rescued = challenges.some(
    (challenge) =>
      challenge.target_user_id === userId && challenge.rescue_date === date && challenge.status === 'approved',
  );
  return rescued ? ('rescued' as const) : ('failed' as const);
}

export function buildMetrics(
  user: Profile,
  habits: Habit[],
  checkins: HabitCheckin[],
  challenges: RecoveryChallenge[],
  evidence: ChallengeEvidence[],
  scoreEvents: ScoreEvent[],
): UserMetrics {
  const today = new Date();
  const todayIso = isoDate(today);
  const userHabits = habits.filter((habit) => habit.user_id === user.id && !habit.archived_at);
  const dueToday = userHabits.filter((habit) => isHabitDue(habit, today));
  const completedToday = dueToday.filter((habit) =>
    checkins.some((checkin) => checkin.habit_id === habit.id && checkin.checkin_date === todayIso && checkin.completed),
  ).length;
  const essentialToday = dueToday.filter((habit) => habit.is_essential).length;
  const pendingHabits = Math.max(dueToday.length - completedToday, 0);

  const heatmap = Array.from({ length: 30 }, (_, index) => {
    const date = isoDate(addDays(today, index - 29));
    return { date, status: dayStatusForUser(user.id, date, habits, checkins, challenges) };
  });

  let currentStreak = 0;
  for (let index = heatmap.length - 1; index >= 0; index -= 1) {
    const status = heatmap[index].status;
    if (status === 'completed') currentStreak += 1;
    if (status === 'rescued' || status === 'empty') continue;
    if (status === 'failed') break;
  }

  let bestStreak = 0;
  let running = 0;
  heatmap.forEach((day) => {
    if (day.status === 'completed') running += 1;
    if (day.status === 'failed') running = 0;
    bestStreak = Math.max(bestStreak, running);
  });

  const lastSeven = Array.from({ length: 7 }, (_, index) => isoDate(addDays(today, index - 6)));
  const weeklySeries = lastSeven.map((date) => {
    const day = new Date(`${date}T12:00:00`);
    const due = userHabits.filter((habit) => isHabitDue(habit, day));
    const completed = due.filter((habit) =>
      checkins.some((checkin) => checkin.habit_id === habit.id && checkin.checkin_date === date && checkin.completed),
    ).length;
    return {
      day: new Intl.DateTimeFormat('es', { weekday: 'short' }).format(day),
      completed,
      total: due.length,
      rate: due.length ? Math.round((completed / due.length) * 100) : 0,
    };
  });

  const totalDue = weeklySeries.reduce((sum, day) => sum + day.total, 0);
  const totalCompleted = weeklySeries.reduce((sum, day) => sum + day.completed, 0);
  const completionRate = totalDue ? Math.round((totalCompleted / totalDue) * 100) : 0;
  const rescuedDays = challenges.filter((challenge) => challenge.target_user_id === user.id && challenge.status === 'approved').length;
  const ledgerXp = scoreEvents.filter((event) => event.user_id === user.id).reduce((sum, event) => sum + event.points, 0);
  const computedXp = checkins
    .filter((checkin) => checkin.user_id === user.id && checkin.completed)
    .reduce((sum, checkin) => {
      const habit = habits.find((candidate) => candidate.id === checkin.habit_id);
      if (!habit) return sum;
      const evidenceBonus = evidence.some((item) => item.user_id === user.id && item.review_status === 'approved') ? 2 : 0;
      return sum + Math.round(habit.points * difficultyMultiplier(habit.difficulty)) + evidenceBonus;
    }, 0);

  return {
    userId: user.id,
    displayName: user.display_name,
    currentStreak,
    bestStreak,
    completionRate,
    pendingHabits,
    completedToday,
    essentialToday,
    rescuedDays,
    goalsReached: 0,
    xp: Math.max(ledgerXp, computedXp),
    weeklySeries,
    heatmap,
  };
}

export function containsUnsafeChallenge(text: string) {
  const unsafe = [
    'alcohol',
    'droga',
    'drogas',
    'dinero',
    'apuesta',
    'ilegal',
    'humillar',
    'humillante',
    'autolesion',
    'autolesión',
    'lastim',
    'peligroso',
  ];
  const normalized = text.toLowerCase();
  return unsafe.some((word) => normalized.includes(word));
}

