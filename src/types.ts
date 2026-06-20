import type { Session } from '@supabase/supabase-js';

export type View = 'dashboard' | 'arena' | 'habits' | 'challenges' | 'evidence';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type Visibility = 'private' | 'shared_progress' | 'shared_full' | 'duel' | 'public';
export type ChallengeStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired' | 'needs_changes';
export type ContinuationStatus = 'undecided' | 'finished' | 'continued';
export type EvidenceType = 'image' | 'text' | 'document' | 'link' | 'reflection';

export type Profile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  motto: string;
  description: string;
  level: number;
  privacy: Record<string, string>;
};

export type Duel = {
  id: string;
  name: string;
  duration_days: number;
  starts_on: string;
  ends_on: string;
  rules: string;
  rescue_cooldown_days: number;
  invite_code: string;
  created_by: string;
};

export type DuelMember = {
  id: string;
  duel_id: string;
  user_id: string;
  role: 'owner' | 'member';
  profiles?: Profile;
};

export type Habit = {
  id: string;
  duel_id: string | null;
  user_id: string;
  name: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'custom';
  repeat_days: number[];
  deadline: string | null;
  difficulty: Difficulty;
  points: number;
  requires_evidence: boolean;
  is_essential: boolean;
  visibility: Visibility;
  archived_at: string | null;
};

export type HabitCheckin = {
  id: string;
  habit_id: string;
  user_id: string;
  checkin_date: string;
  completed: boolean;
  note: string | null;
  evidence_url: string | null;
  created_at: string;
};

export type RecoveryChallenge = {
  id: string;
  duel_id: string;
  target_user_id: string;
  creator_user_id: string;
  title: string;
  description: string;
  due_at: string;
  difficulty: Difficulty;
  points: number;
  required_evidence: EvidenceType;
  status: ChallengeStatus;
  creator_comment: string | null;
  rescue_date: string;
  created_at: string;
  continuation_status: ContinuationStatus;
  decision_due_at: string | null;
  continued_from_challenge_id: string | null;
};

export type ChallengeEvidence = {
  id: string;
  challenge_id: string;
  user_id: string;
  evidence_type: EvidenceType;
  file_path: string | null;
  link_url: string | null;
  body: string | null;
  description: string;
  review_status: ChallengeStatus;
  validator_comment: string | null;
  submitted_at: string;
  deleted_at: string | null;
};

export type ChallengeReview = {
  id: string;
  challenge_id: string;
  evidence_id: string | null;
  reviewer_id: string;
  decision: 'approved' | 'rejected' | 'needs_changes';
  comment: string;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  actor_id: string | null;
  duel_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ScoreEvent = {
  id: string;
  user_id: string;
  duel_id: string | null;
  source_type: string;
  source_id: string | null;
  points: number;
  reason: string;
  created_at: string;
};

export type AppState = {
  session: Session | null;
  profile: Profile | null;
  duel: Duel | null;
  members: DuelMember[];
  habits: Habit[];
  checkins: HabitCheckin[];
  challenges: RecoveryChallenge[];
  evidence: ChallengeEvidence[];
  reviews: ChallengeReview[];
  scoreEvents: ScoreEvent[];
  logs: ActivityLog[];
};

export type UserMetrics = {
  userId: string;
  displayName: string;
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
  pendingHabits: number;
  completedToday: number;
  essentialToday: number;
  rescuedDays: number;
  goalsReached: number;
  xp: number;
  weeklySeries: Array<{ day: string; completed: number; total: number; rate: number }>;
  heatmap: Array<{ date: string; status: 'completed' | 'rescued' | 'failed' | 'empty' }>;
};
