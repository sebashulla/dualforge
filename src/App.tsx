import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Arena } from './components/Arena';
import { AuthScreen } from './components/AuthScreen';
import { ChatCenter, detectAttachmentKind, type NewChatMessage } from './components/ChatCenter';
import { ChallengeCenter, type EvidencePayload, type NewChallenge } from './components/ChallengeCenter';
import { Dashboard } from './components/Dashboard';
import { EvidenceCenter } from './components/EvidenceCenter';
import { HabitBoard, type NewHabit } from './components/HabitBoard';
import { LibraryBoard, type NewCourse, type NewFlashcard, type NewNote, type NewTopic } from './components/LibraryBoard';
import { Layout } from './components/Layout';
import { OpenChallengesBoard, type NewOpenChallenge } from './components/OpenChallengesBoard';
import { ProfileSetup, type ProfileUpdate } from './components/ProfileSetup';
import { ProfileHub, type PublicProfileUpdate } from './components/ProfileHub';
import { UsersDirectory } from './components/UsersDirectory';
import { buildMetrics, isoDate } from './lib/metrics';
import { supabase } from './lib/supabase';
import type {
  ActivityLog,
  AppState,
  ChallengeEvidence,
  ChallengeReview,
  ChatMessage,
  ChatParticipant,
  ChatThread,
  Duel,
  DuelMember,
  Habit,
  HabitCheckin,
  LibraryCourse,
  LibraryFlashcard,
  LibraryNote,
  LibraryShare,
  LibraryTopic,
  OpenChallenge,
  OpenChallengeParticipant,
  Profile,
  ProfileStats,
  RecoveryChallenge,
  ScoreEvent,
  Visibility,
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
  publicProfiles: [],
  profileStats: [],
  openChallenges: [],
  openChallengeParticipants: [],
  libraryCourses: [],
  libraryTopics: [],
  libraryNotes: [],
  libraryFlashcards: [],
  libraryShares: [],
  chatThreads: [],
  chatParticipants: [],
  chatMessages: [],
};

export default function App() {
  const [state, setState] = useState<AppState>(emptyState);
  const [view, setView] = useState<View>('dashboard');
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(null);
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
    function reloadProfile() {
      if (state.session) void loadData(state.session);
    }
    window.addEventListener('dualforge:profile-updated', reloadProfile);
    return () => window.removeEventListener('dualforge:profile-updated', reloadProfile);
  }, [state.session]);

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

  useEffect(() => {
    if (!supabase || !state.session) return;
    const session = state.session;
    const client = supabase;
    const channel = client
      .channel(`dualforge-social-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, () => void loadData(session))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, () => void loadData(session))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => void loadData(session))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'library_shares' }, () => void loadData(session))
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [state.session?.user.id]);

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
      let publicProfiles: Profile[] = [];
      let profileStats: ProfileStats[] = [];
      let openChallenges: OpenChallenge[] = [];
      let openChallengeParticipants: OpenChallengeParticipant[] = [];
      let libraryCourses: LibraryCourse[] = [];
      let libraryTopics: LibraryTopic[] = [];
      let libraryNotes: LibraryNote[] = [];
      let libraryFlashcards: LibraryFlashcard[] = [];
      let libraryShares: LibraryShare[] = [];
      let chatThreads: ChatThread[] = [];
      let chatParticipants: ChatParticipant[] = [];
      let chatMessages: ChatMessage[] = [];

      if (profile) {
        publicProfiles = await optionalList<Profile>(
          supabase.from('profiles').select('*').order('display_name', { ascending: true }).limit(80),
        );
        profileStats = await optionalList<ProfileStats>(
          supabase.from('profile_stats').select('*'),
        );
        openChallenges = await optionalList<OpenChallenge>(
          supabase.from('open_challenges').select('*').order('created_at', { ascending: false }).limit(80),
        );
        openChallengeParticipants = await optionalList<OpenChallengeParticipant>(
          supabase.from('open_challenge_participants').select('*').order('joined_at', { ascending: false }),
        );
        libraryShares = await optionalList<LibraryShare>(
          supabase.from('library_shares').select('*').order('created_at', { ascending: false }),
        );

        const ownCourses = await optionalList<LibraryCourse>(
          supabase.from('library_courses').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        );
        const sharedCourseIds = libraryShares
          .filter((share) => share.owner_user_id === session.user.id || share.recipient_user_id === session.user.id)
          .map((share) => share.course_id);
        const sharedCourses = sharedCourseIds.length
          ? await optionalList<LibraryCourse>(supabase.from('library_courses').select('*').in('id', sharedCourseIds))
          : [];
        const publicCourses = await optionalList<LibraryCourse>(
          supabase.from('library_courses').select('*').eq('visibility', 'public').order('created_at', { ascending: false }).limit(40),
        );
        libraryCourses = uniqueById([...ownCourses, ...sharedCourses, ...publicCourses]);
        const courseIds = libraryCourses.map((course) => course.id);
        libraryTopics = courseIds.length
          ? await optionalList<LibraryTopic>(supabase.from('library_topics').select('*').in('course_id', courseIds).order('created_at', { ascending: false }))
          : [];
        const topicIds = libraryTopics.map((topic) => topic.id);
        libraryNotes = topicIds.length
          ? await optionalList<LibraryNote>(supabase.from('library_topic_notes').select('*').in('topic_id', topicIds).order('created_at', { ascending: false }))
          : [];
        libraryFlashcards = topicIds.length
          ? await optionalList<LibraryFlashcard>(supabase.from('library_topic_flashcards').select('*').in('topic_id', topicIds).order('created_at', { ascending: false }))
          : [];

        const now = new Date().toISOString();
        await supabase.rpc('purge_expired_chat_data');
        chatThreads = await optionalList<ChatThread>(
          supabase.from('chat_threads').select('*').gt('expires_at', now).order('updated_at', { ascending: false }).limit(50),
        );
        const threadIds = chatThreads.map((thread) => thread.id);
        chatParticipants = threadIds.length
          ? await optionalList<ChatParticipant>(supabase.from('chat_participants').select('*, profiles(*)').in('thread_id', threadIds))
          : [];
        const loadedMessages = threadIds.length
          ? await optionalList<ChatMessage>(supabase.from('chat_messages').select('*').in('thread_id', threadIds).gt('expires_at', now).is('deleted_at', null).order('created_at', { ascending: true }).limit(240))
          : [];
        const client = supabase;
        chatMessages = await Promise.all(loadedMessages.map(async (message) => {
          if (!message.attachment_path) return message;
          const signed = await client.storage.from('chat-media').createSignedUrl(message.attachment_path, 60 * 60);
          return { ...message, attachment_url: signed.data?.signedUrl ?? null };
        }));

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

      setState({
        session,
        profile,
        duel,
        members,
        habits,
        checkins,
        challenges,
        evidence,
        reviews,
        scoreEvents,
        logs,
        publicProfiles,
        profileStats,
        openChallenges,
        openChallengeParticipants,
        libraryCourses,
        libraryTopics,
        libraryNotes,
        libraryFlashcards,
        libraryShares,
        chatThreads,
        chatParticipants,
        chatMessages,
      });
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
    await supabase.from('profile_stats').upsert({ user_id: state.session.user.id });
    await loadData(state.session);
  }

  async function updatePublicProfile(profileInput: PublicProfileUpdate) {
    if (!supabase || !state.session || !state.profile) return;
    let avatarUrl = state.profile.avatar_url;
    if (profileInput.avatar_file) {
      const path = `${state.session.user.id}/${Date.now()}-${profileInput.avatar_file.name}`;
      const upload = await supabase.storage.from('avatars').upload(path, profileInput.avatar_file, { upsert: true });
      if (upload.error) {
        setError(upload.error.message);
        return;
      }
      avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    }
    const { error: requestError } = await supabase.from('profiles').update({
      display_name: profileInput.display_name,
      username: profileInput.username,
      description: profileInput.description,
      motto: profileInput.motto,
      avatar_url: avatarUrl,
    }).eq('id', state.profile.id);
    if (requestError) {
      setError(requestError.message);
      return;
    }
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

  async function createOpenChallenge(challenge: NewOpenChallenge) {
    if (!supabase || !state.session || !state.profile) return;
    const { data, error: requestError } = await supabase.from('open_challenges').insert({
        ...challenge,
        creator_user_id: state.profile.id,
        starts_at: challenge.starts_at ? new Date(challenge.starts_at).toISOString() : null,
        ends_at: challenge.ends_at ? new Date(challenge.ends_at).toISOString() : null,
      })
      .select()
      .single();
    if (requestError) setError(requestError.message);
    if (data) {
      await supabase.from('open_challenge_participants').insert({
        challenge_id: data.id,
        user_id: state.profile.id,
        status: 'joined',
      });
    }
    await loadData(state.session);
  }

  async function joinOpenChallenge(challenge: OpenChallenge) {
    if (!supabase || !state.session || !state.profile) return;
    const currentParticipants = state.openChallengeParticipants.filter((participant) => participant.challenge_id === challenge.id && participant.status !== 'left').length;
    if (currentParticipants >= challenge.max_participants) {
      setError('Este reto ya alcanzó el máximo de participantes.');
      return;
    }
    const { error: requestError } = await supabase.from('open_challenge_participants').upsert({
      challenge_id: challenge.id,
      user_id: state.profile.id,
      status: 'joined',
    });
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function completeOpenChallenge(challenge: OpenChallenge) {
    if (!supabase || !state.session || !state.profile) return;
    await supabase
      .from('open_challenge_participants')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('challenge_id', challenge.id)
      .eq('user_id', state.profile.id);
    await supabase.from('score_events').insert({
      user_id: state.profile.id,
      duel_id: null,
      source_type: 'open_challenge',
      source_id: challenge.id,
      points: challenge.points,
      reason: `Reto abierto completado: ${challenge.title}`,
    });
    const currentStats = state.profileStats.find((stats) => stats.user_id === state.profile?.id);
    await supabase.from('profile_stats').upsert({
      user_id: state.profile.id,
      duels_won: currentStats?.duels_won ?? 0,
      duel_streak: currentStats?.duel_streak ?? 0,
      open_challenges_completed: (currentStats?.open_challenges_completed ?? 0) + 1,
    });
    await loadData(state.session);
  }

  async function startChat(peerUserId: string) {
    if (!supabase || !state.session || !state.profile) return null;
    if (peerUserId === state.profile.id) {
      setError('No puedes abrir un chat contigo mismo.');
      return null;
    }

    const existingThread = state.chatThreads.find((thread) => {
      const participantIds = state.chatParticipants
        .filter((participant) => participant.thread_id === thread.id)
        .map((participant) => participant.user_id);
      return participantIds.includes(state.profile!.id)
        && participantIds.includes(peerUserId)
        && new Date(thread.expires_at).getTime() > Date.now();
    });

    if (existingThread) return existingThread.id;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error: threadError } = await supabase
      .from('chat_threads')
      .insert({ created_by: state.profile.id, expires_at: expiresAt, created_timezone: timezone })
      .select()
      .single();
    if (threadError) {
      setError(threadError.message);
      return null;
    }

    const { error: participantsError } = await supabase.from('chat_participants').insert([
      { thread_id: data.id, user_id: state.profile.id },
      { thread_id: data.id, user_id: peerUserId },
    ]);
    if (participantsError) {
      setError(participantsError.message);
      return null;
    }

    await loadData(state.session);
    return data.id as string;
  }

  async function openChatWithUser(userId: string) {
    const threadId = await startChat(userId);
    if (!threadId) return;
    setActiveChatThreadId(threadId);
    setView('messages');
  }

  async function sendChatMessage(threadId: string, message: NewChatMessage) {
    if (!supabase || !state.session || !state.profile) return;
    const thread = state.chatThreads.find((item) => item.id === threadId);
    if (!thread || new Date(thread.expires_at).getTime() <= Date.now()) {
      setError('Este chat ya expiró.');
      return;
    }
    if (message.file && message.file.size > 25 * 1024 * 1024) {
      setError('El archivo supera el límite de 25 MB.');
      return;
    }

    let attachmentPath: string | null = null;
    let attachmentKind: ReturnType<typeof detectAttachmentKind> | null = null;
    if (message.file) {
      attachmentKind = detectAttachmentKind(message.file);
      attachmentPath = `${threadId}/${state.profile.id}/${Date.now()}-${sanitizeFileName(message.file.name)}`;
      const { error: uploadError } = await supabase.storage.from('chat-media').upload(attachmentPath, message.file);
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
    }

    const { error: requestError } = await supabase.from('chat_messages').insert({
      thread_id: threadId,
      sender_id: state.profile.id,
      body: message.body.trim() || null,
      attachment_kind: attachmentKind,
      attachment_path: attachmentPath,
      attachment_name: message.file?.name ?? null,
      attachment_mime: message.file?.type || null,
      attachment_size: message.file?.size ?? null,
    });
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function shareCourse(course: LibraryCourse, recipientUserId: string) {
    if (!supabase || !state.session || !state.profile) return;
    if (course.user_id !== state.profile.id) {
      setError('Solo puedes compartir cursos que son tuyos.');
      return;
    }
    const { error: requestError } = await supabase.from('library_shares').upsert({
      course_id: course.id,
      owner_user_id: state.profile.id,
      recipient_user_id: recipientUserId,
    }, { onConflict: 'course_id,recipient_user_id' });
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function updateCourseVisibility(course: LibraryCourse, visibility: Visibility) {
    if (!supabase || !state.session || !state.profile) return;
    if (course.user_id !== state.profile.id) {
      setError('Solo puedes cambiar la visibilidad de tus cursos.');
      return;
    }
    const { error: requestError } = await supabase.from('library_courses').update({ visibility }).eq('id', course.id);
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function cloneLibraryCourse(course: LibraryCourse) {
    if (!supabase || !state.session || !state.profile) return;
    if (course.user_id === state.profile.id) return;

    const { data: newCourse, error: courseError } = await supabase
      .from('library_courses')
      .insert({
        user_id: state.profile.id,
        title: `${course.title} (copia)`,
        description: course.description,
        visibility: 'private',
      })
      .select()
      .single();
    if (courseError) {
      setError(courseError.message);
      return;
    }

    const sourceTopics = state.libraryTopics.filter((topic) => topic.course_id === course.id);
    for (const topic of sourceTopics) {
      const { data: newTopic, error: topicError } = await supabase
        .from('library_topics')
        .insert({
          course_id: newCourse.id,
          user_id: state.profile.id,
          title: topic.title,
          summary: topic.summary,
        })
        .select()
        .single();
      if (topicError) {
        setError(topicError.message);
        return;
      }

      const sourceNotes = state.libraryNotes.filter((note) => note.topic_id === topic.id);
      if (sourceNotes.length) {
        const { error: notesError } = await supabase.from('library_topic_notes').insert(sourceNotes.map((note) => ({
          topic_id: newTopic.id,
          user_id: state.profile!.id,
          title: note.title,
          body: note.body,
        })));
        if (notesError) {
          setError(notesError.message);
          return;
        }
      }

      const sourceFlashcards = state.libraryFlashcards.filter((flashcard) => flashcard.topic_id === topic.id);
      if (sourceFlashcards.length) {
        const { error: flashcardsError } = await supabase.from('library_topic_flashcards').insert(sourceFlashcards.map((flashcard) => ({
          topic_id: newTopic.id,
          user_id: state.profile!.id,
          question: flashcard.question,
          answer: flashcard.answer,
          difficulty: flashcard.difficulty,
        })));
        if (flashcardsError) {
          setError(flashcardsError.message);
          return;
        }
      }
    }

    await loadData(state.session);
  }

  async function createCourse(course: NewCourse) {
    if (!supabase || !state.session || !state.profile) return;
    const { error: requestError } = await supabase.from('library_courses').insert({ ...course, user_id: state.profile.id });
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function createTopic(topic: NewTopic) {
    if (!supabase || !state.session || !state.profile) return;
    const { error: requestError } = await supabase.from('library_topics').insert({ ...topic, user_id: state.profile.id });
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function createNote(note: NewNote) {
    if (!supabase || !state.session || !state.profile) return;
    const { error: requestError } = await supabase.from('library_topic_notes').insert({ ...note, user_id: state.profile.id });
    if (requestError) setError(requestError.message);
    await loadData(state.session);
  }

  async function createFlashcard(flashcard: NewFlashcard) {
    if (!supabase || !state.session || !state.profile) return;
    const { error: requestError } = await supabase.from('library_topic_flashcards').insert({ ...flashcard, user_id: state.profile.id });
    if (requestError) setError(requestError.message);
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
    return (
      <div className="neon-grid flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/branding/logo-icon.png" alt="Icono DUALFORGE" className="size-16 object-contain drop-shadow-[0_0_20px_rgba(57,255,136,0.18)]" />
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-forge-green">Cargando DUALFORGE</p>
        </div>
      </div>
    );
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
      {view === 'profile' ? (
        <ProfileHub currentProfile={state.profile} stats={state.profileStats.find((stats) => stats.user_id === state.profile?.id)} onUpdateProfile={updatePublicProfile} />
      ) : null}
      {view === 'users' ? (
        <UsersDirectory currentUserId={state.profile.id} profiles={state.publicProfiles.length ? state.publicProfiles : [state.profile]} stats={state.profileStats} onStartChat={openChatWithUser} />
      ) : null}
      {view === 'messages' ? (
        <ChatCenter
          currentUserId={state.profile.id}
          profiles={state.publicProfiles.length ? state.publicProfiles : [state.profile]}
          threads={state.chatThreads}
          participants={state.chatParticipants}
          messages={state.chatMessages}
          initialThreadId={activeChatThreadId}
          onStartChat={startChat}
          onSendMessage={sendChatMessage}
        />
      ) : null}
      {view === 'arena' ? <Arena mine={mineMetrics} rival={rivalMetrics} members={state.members} /> : null}
      {view === 'habits' ? (
        <HabitBoard habits={state.habits} checkins={state.checkins} userId={state.profile.id} duelId={state.duel?.id ?? null} onCreateHabit={createHabit} onToggleCheckin={toggleCheckin} />
      ) : null}
      {view === 'challenges' ? (
        <ChallengeCenter userId={state.profile.id} duelId={state.duel?.id ?? null} rival={rivalProfile} challenges={state.challenges} evidence={state.evidence} onCreateChallenge={createChallenge} onSubmitEvidence={submitEvidence} onReviewEvidence={reviewEvidence} onDecideChallenge={decideChallenge} />
      ) : null}
      {view === 'openChallenges' ? (
        <OpenChallengesBoard userId={state.profile.id} profiles={state.publicProfiles} challenges={state.openChallenges} participants={state.openChallengeParticipants} onCreateChallenge={createOpenChallenge} onJoinChallenge={joinOpenChallenge} onCompleteChallenge={completeOpenChallenge} />
      ) : null}
      {view === 'library' ? (
        <LibraryBoard
          currentUserId={state.profile.id}
          courses={state.libraryCourses}
          topics={state.libraryTopics}
          notes={state.libraryNotes}
          flashcards={state.libraryFlashcards}
          profiles={state.publicProfiles.length ? state.publicProfiles : [state.profile]}
          shares={state.libraryShares}
          onCreateCourse={createCourse}
          onCreateTopic={createTopic}
          onCreateNote={createNote}
          onCreateFlashcard={createFlashcard}
          onShareCourse={shareCourse}
          onUpdateCourseVisibility={updateCourseVisibility}
          onCloneCourse={cloneLibraryCourse}
        />
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

async function optionalList<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as T[];
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function sanitizeFileName(name: string) {
  return name.trim().replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-').slice(0, 90) || 'archivo';
}
