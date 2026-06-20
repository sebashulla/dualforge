import type { Session } from '@supabase/supabase-js';

export type View = 'dashboard' | 'profile' | 'users' | 'messages' | 'arena' | 'habits' | 'challenges' | 'openChallenges' | 'library' | 'evidence';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type Visibility = 'private' | 'shared_progress' | 'shared_full' | 'duel' | 'public';
export type ChallengeStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired' | 'needs_changes';
export type ContinuationStatus = 'undecided' | 'finished' | 'continued';
export type EvidenceType = 'image' | 'text' | 'document' | 'link' | 'reflection';
export type OpenChallengeStatus = 'open' | 'active' | 'completed' | 'cancelled';
export type OpenChallengeParticipantStatus = 'joined' | 'completed' | 'left';
export type ChatAttachmentKind = 'image' | 'audio' | 'video' | 'file';

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
  winner_user_id?: string | null;
  status?: 'active' | 'completed' | 'cancelled';
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

export type ProfileStats = {
  user_id: string;
  duels_won: number;
  duel_streak: number;
  open_challenges_completed: number;
  updated_at: string;
};

export type OpenChallenge = {
  id: string;
  creator_user_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  points: number;
  min_participants: number;
  max_participants: number;
  starts_at: string | null;
  ends_at: string | null;
  evidence_type: EvidenceType;
  rules: string;
  status: OpenChallengeStatus;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type OpenChallengeParticipant = {
  id: string;
  challenge_id: string;
  user_id: string;
  status: OpenChallengeParticipantStatus;
  joined_at: string;
  completed_at: string | null;
  profiles?: Profile;
};

export type LibraryCourse = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
};

export type LibraryTopic = {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

export type LibraryNote = {
  id: string;
  topic_id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type LibraryFlashcard = {
  id: string;
  topic_id: string;
  user_id: string;
  question: string;
  answer: string;
  difficulty: Difficulty;
  next_review_on: string;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
};

export type LibraryShare = {
  id: string;
  course_id: string;
  owner_user_id: string;
  recipient_user_id: string;
  created_at: string;
};

export type ChatThread = {
  id: string;
  created_by: string;
  started_at: string;
  expires_at: string;
  created_timezone: string;
  updated_at: string;
};

export type ChatParticipant = {
  id: string;
  thread_id: string;
  user_id: string;
  joined_at: string;
  profiles?: Profile;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  attachment_kind: ChatAttachmentKind | null;
  attachment_path: string | null;
  attachment_url?: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
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
  publicProfiles: Profile[];
  profileStats: ProfileStats[];
  openChallenges: OpenChallenge[];
  openChallengeParticipants: OpenChallengeParticipant[];
  libraryCourses: LibraryCourse[];
  libraryTopics: LibraryTopic[];
  libraryNotes: LibraryNote[];
  libraryFlashcards: LibraryFlashcard[];
  libraryShares: LibraryShare[];
  chatThreads: ChatThread[];
  chatParticipants: ChatParticipant[];
  chatMessages: ChatMessage[];
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
