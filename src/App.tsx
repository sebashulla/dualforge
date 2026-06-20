import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Arena } from './components/Arena';
import { AuthScreen } from './components/AuthScreen';
import { ChallengeCenter, type EvidencePayload, type NewChallenge } from './components/ChallengeCenter';
import { Dashboard } from './components/Dashboard';
import { EvidenceCenter } from './components/EvidenceCenter';
import { HabitBoard, type NewHabit } from './components/HabitBoard';
import { Layout } from './components/Layout';
import { ProfileSetup, type ProfileUpdate } from './components/ProfileSetup';
import { buildMetrics, isoDate } from './lib/metrics';
import { supabase } from './lib/supabase';
import type {
  ActivityLog,
  AppState,
  ChallengeEvidence,
  ChallengeReview,
  Duel,
  DuelMember,
  Habit,
  HabitCheckin,
  Profile,
  RecoveryChallenge,
  ScoreEvent,
  View,
} from './types';

const emptyState: AppState = {
  session: null,
  profile: null,
  duel: null,
  members: [],
  habits: [],
  checkins: [],
  challenges: [],
  evidence: [],
  reviews: [],
  scoreEvents: [],
  logs: [],
};

export default function App() {
  const [state, setState] = useState<AppState>(emptyState);
  const [view, setView] = useState<View>('dashboard');
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState((current) => ({ ...current, session: data.session }));
      setLoading(false);
      if (data.session) void loadData(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((current) => ({ ...current, session }));
      if (session) void loadData(session);
      else setState(emptyState);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !state.duel?.id || !state.session) return;
    const client = supabase;
    const channel = client
      .channel(`dualforge-${state.duel.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, () => void loadData(state.session!))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_checkins' }, () => void loadData(state.session!))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recovery_challenges' }, () => void loadData(state.session!))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_evidence' }, () => void loadData(state.session!))
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [state.duel?.id, state.session]);

  async function loadData(session: Session) {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const profile = await singleOrNull<Profile>(
        supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
      );
      let members: DuelMember[] = [];
      let duel: Duel | null = null;
      let habits: Habit[] = [];
      let checkins: HabitCheckin[] = [];
      let challenges: RecoveryChallenge[] = [];
      let evidence: ChallengeEvidence[] = [];
      let reviews: ChallengeReview[] = [];
      let scoreEvents: ScoreEvent[] = [];
      let logs: ActivityLog[] = [];

      if (profile) {
        const myMemberships = await list<DuelMember>(
          supabase.from('duel_members').select('*, profiles(*)').eq('user_id', session.user.id).limit(1),
        );
        if (myMemberships[0]) {
          duel = await singleOrNull<Duel>(
            supabase.from('duels').select('*').eq('id', myMemberships[0].duel_id).maybeSingle(),
          );
          if (duel) {
            members = await list<DuelMember>(
              supabase.from('duel_members').select('*, profiles(*)').eq('duel_id', duel.id).order('joined_at', { ascending: true }),
            );
            habits = await list<Habit>(supabase.from('habits').select('*').eq('duel_id', duel.id).is('archived_at', null));
            const habitIds = habits.map((habit) => habit.id);
            checkins = habitIds.length
              ? await list<HabitCheckin>(supabase.from('habit_checkins').select('*').in('habit_id', habitIds).order('checkin_date', { ascending: false }))
              : [];
            challenges = await list<RecoveryChallenge>(
              supabase.from('recovery_challenges').select('*').eq('duel_id', duel.id).order('created_at', { ascending: false }),
            );
            const challengeIds = challenges.map((challenge) => challenge.id);
            evidence = challengeIds.length
              ? await list<ChallengeEvidence>(supabase.from('challenge_evidence').select('*').in('challenge_id', challengeIds).order('submitted_at', { ascending: false }))
              : [];
            reviews = challengeIds.length
              ? await list<ChallengeReview>(supabase.from('challenge_reviews').select('*').in('challenge_id', challengeIds).order('created_at', { ascending: false }))
              : [];
            scoreEvents = await list<ScoreEvent>(supabase.from('score_events').select('*').eq('duel_id', duel.id));
            logs = await list<ActivityLog>(supabase.from('activity_logs').select('*').eq('duel_id', duel.id).order('created_at', { ascending: false }).limit(50));
          }
        }
      }

      setState({ session, profile, duel, members, habits, checkins, challenges, evidence, reviews, scoreEvents, logs });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(profileInput: ProfileUpdate) {
    if (!supabase || !state.session) return;
    let avatarUrl = profileInput.avatar_url;
    if (profileInput.avatar_file) {
      const path = `${state.session.user.id}/${Date.now()}-${profileInput.avatar_file.name}`;
      const upload = await supabase.storage.from('avatars').upload(path, profileInput.avatar_file);
      if (upload.error) {
        setError(upload.error.message);
        return;
      }
      avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      id: state.session.user.id,
      display_name: profileInput.display_name,
      username: profileInput.username,
      avatar_url: avatarUrl,
      motto: profileInput.motto,
      description: profileInput.description,
      privacy: { goals: 'shared_progress', posts: 'duel', evidence: 'duel' },
    };
    const { error: profileError } = await supabase.from('profiles').upsert(payload);
    if (profileError) {
      setError(profileError.message);
      return;
    }
    await supabase.from('profile_private').upsert({ id: state.session.user.id, full_name: profileInput.full_name });
    await loadData(state.session);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  async function createDuel(name: string, duration: number) {
    if (!supabase || !state.session || !state.profile) return;
    const starts = isoDate();
    const ends = isoDate(new Date(Date.now() + (duration - 1) * 24 * 60 * 60 * 1000));
    const { data, error: requestError } = await supabase
      .from('duels')
      .insert({ name, duration_days: duration, starts_on: starts, ends_on: ends, rules: 'Rescate máximo cada 14 días.', created_by: state.profile.id })
      .select()
      .single();
    if (requestError) {
      setError(requestError.message);
      return;
    }
    await supabase.from('duel_members').insert({ duel_id: data.id, user_id: state.profile.id, role: 'owner' });
    await supabase.from('seasons').insert({ duel_id: data.id, name, starts_on: starts, ends_on: ends });
    await loadData(state.session);
  }

  async function joinDuel(code: string) {
    if (!supabase || !state.session) return;
    const { error: requestError } = await supabase.rpc('join_duel_by_code', { join_code: code.trim().toUpperCase() });
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function createHabit(habit: NewHabit) {
    if (!supabase || !state.session || !state.profile || !state.duel) return;
    const { error: requestError } = await supabase.from('habits').insert({
      ...habit,
      duel_id: state.duel.id,
      user_id: state.profile.id,
      frequency: 'daily',
      repeat_days: [1, 2, 3, 4, 5, 6, 7],
    });
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function toggleCheckin(habit: Habit, completed: boolean) {
    if (!supabase || !state.session || !state.profile) return;
    const today = isoDate();
    if (completed) {
      await supabase.from('habit_checkins').upsert({ habit_id: habit.id, user_id: state.profile.id, checkin_date: today, completed: true });
      await supabase.from('score_events').insert({ user_id: state.profile.id, duel_id: state.duel?.id, source_type: 'habit_checkin', source_id: habit.id, points: habit.points, reason: `Hábito completado: ${habit.name}` });
    } else {
      await supabase.from('habit_checkins').delete().eq('habit_id', habit.id).eq('user_id', state.profile.id).eq('checkin_date', today);
    }
    await loadData(state.session);
  }

  async function createChallenge(challenge: NewChallenge) {
    if (!supabase || !state.session || !state.profile || !state.duel) return;
    const { error: requestError } = await supabase.from('recovery_challenges').insert({
      ...challenge,
      duel_id: state.duel.id,
      creator_user_id: state.profile.id,
      due_at: new Date(challenge.due_at).toISOString(),
    });
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function submitEvidence(challenge: RecoveryChallenge, payload: EvidencePayload) {
    if (!supabase || !state.session || !state.profile) return;
    let filePath: string | null = null;
    if (payload.file) {
      filePath = `${state.profile.id}/${challenge.id}/${Date.now()}-${payload.file.name}`;
      const { error: uploadError } = await supabase.storage.from('evidence').upload(filePath, payload.file);
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
    }
    await supabase.from('challenge_evidence').insert({
      challenge_id: challenge.id,
      user_id: state.profile.id,
      evidence_type: payload.evidence_type,
      file_path: filePath,
      link_url: payload.link_url || null,
      body: payload.body || null,
      description: payload.description,
      review_status: 'submitted',
    });
    await supabase.from('recovery_challenges').update({ status: 'submitted' }).eq('id', challenge.id);
    await loadData(state.session);
  }

  async function reviewEvidence(challenge: RecoveryChallenge, evidence: ChallengeEvidence, decision: 'approved' | 'rejected' | 'needs_changes', comment: string) {
    if (!supabase || !state.session || !state.profile) return;
    const nextStatus = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'needs_changes';
    const decisionDueAt = decision === 'approved' || decision === 'rejected'
      ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      : null;

    await supabase.from('challenge_reviews').insert({ challenge_id: challenge.id, evidence_id: evidence.id, reviewer_id: state.profile.id, decision, comment });
    await supabase.from('challenge_evidence').update({ review_status: nextStatus, validator_comment: comment }).eq('id', evidence.id);
    await supabase.from('recovery_challenges').update({ status: nextStatus, decision_due_at: decisionDueAt }).eq('id', challenge.id);
    if (decision === 'approved') {
      await supabase.from('score_events').insert({ user_id: challenge.target_user_id, duel_id: challenge.duel_id, source_type: 'recovery_challenge', source_id: challenge.id, points: challenge.points, reason: `Reto recuperado: ${challenge.title}` });
    }
    if (decision === 'rejected') {
      await supabase.from('score_events').insert({ user_id: challenge.target_user_id, duel_id: challenge.duel_id, source_type: 'recovery_penalty', source_id: challenge.id, points: -Math.abs(challenge.points), reason: `Reto rechazado: ${challenge.title}` });
    }
    await loadData(state.session);
  }

  async function decideChallenge(challenge: RecoveryChallenge, decision: 'finished' | 'continued') {
    if (!supabase || !state.session || !state.profile) return;
    if (decision === 'continued') {
      const nextDue = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('recovery_challenges').insert({
        duel_id: challenge.duel_id,
        target_user_id: challenge.target_user_id,
        creator_user_id: challenge.creator_user_id,
        title: `Continuación: ${challenge.title}`,
        description: challenge.description,
        due_at: nextDue,
        difficulty: challenge.difficulty,
        points: challenge.points,
        required_evidence: challenge.required_evidence,
        creator_comment: 'Reto continuado tras el periodo de decisión.',
        rescue_date: isoDate(),
        continued_from_challenge_id: challenge.id,
      });
    }
    await supabase.from('recovery_challenges').update({ continuation_status: decision }).eq('id', challenge.id);
    await supabase.from('activity_logs').insert({
      actor_id: state.profile.id,
      duel_id: challenge.duel_id,
      entity_type: 'recovery_challenges',
      entity_id: challenge.id,
      action: `decision_${decision}`,
      metadata: { decision },
    });
    await loadData(state.session);
  }

  async function softDeleteEvidence(evidence: ChallengeEvidence) {
    if (!supabase || !state.session || !state.profile) return;
    await supabase.from('challenge_evidence').update({ deleted_at: new Date().toISOString() }).eq('id', evidence.id);
    await supabase.from('activity_logs').insert({ actor_id: state.profile.id, duel_id: state.duel?.id, entity_type: 'challenge_evidence', entity_id: evidence.id, action: 'soft_delete', metadata: { reason: 'user_requested' } });
    await loadData(state.session);
  }

  const rivalProfile = useMemo(() => {
    if (!state.profile) return null;
    return state.members.find((member) => member.user_id !== state.profile?.id)?.profiles ?? null;
  }, [state.members, state.profile]);

  const mineMetrics = useMemo(() => {
    if (!state.profile) return null;
    return buildMetrics(state.profile, state.habits, state.checkins, state.challenges, state.evidence, state.scoreEvents);
  }, [state.profile, state.habits, state.checkins, state.challenges, state.evidence, state.scoreEvents]);

  const rivalMetrics = useMemo(() => {
    if (!rivalProfile) return null;
    return buildMetrics(rivalProfile, state.habits, state.checkins, state.challenges, state.evidence, state.scoreEvents);
  }, [rivalProfile, state.habits, state.checkins, state.challenges, state.evidence, state.scoreEvents]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm font-bold uppercase tracking-[0.3em] text-forge-green">Cargando DUALFORGE</div>;
  }

  if (!state.session) {
    return <AuthScreen />;
  }

  if (!state.profile) {
    return <ProfileSetup userId={state.session.user.id} onSave={saveProfile} onSignOut={signOut} />;
  }

  if (!mineMetrics) return null;

  const pendingChallenge = state.challenges.find((challenge) => challenge.target_user_id === state.profile?.id && ['pending', 'needs_changes'].includes(challenge.status)) ?? null;

  return (
    <Layout profile={state.profile} duel={state.duel} metrics={mineMetrics} view={view} onView={setView} onSignOut={signOut}>
      {error ? <div className="mb-5 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-forge-red">{error}</div> : null}
      {view === 'dashboard' ? (
        <Dashboard duel={state.duel} mine={mineMetrics} rival={rivalMetrics} pendingChallenge={pendingChallenge} onCreateDuel={createDuel} onJoinDuel={joinDuel} />
      ) : null}
      {view === 'arena' ? <Arena mine={mineMetrics} rival={rivalMetrics} members={state.members} /> : null}
      {view === 'habits' ? (
        <HabitBoard habits={state.habits} checkins={state.checkins} userId={state.profile.id} duelId={state.duel?.id ?? null} onCreateHabit={createHabit} onToggleCheckin={toggleCheckin} />
      ) : null}
      {view === 'challenges' ? (
        <ChallengeCenter userId={state.profile.id} duelId={state.duel?.id ?? null} rival={rivalProfile} challenges={state.challenges} evidence={state.evidence} onCreateChallenge={createChallenge} onSubmitEvidence={submitEvidence} onReviewEvidence={reviewEvidence} onDecideChallenge={decideChallenge} />
      ) : null}
      {view === 'evidence' ? (
        <EvidenceCenter evidence={state.evidence} challenges={state.challenges} logs={state.logs} onSoftDeleteEvidence={softDeleteEvidence} />
      ) : null}
    </Layout>
  );
}

async function list<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

async function singleOrNull<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? null) as T | null;
}

