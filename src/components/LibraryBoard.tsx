import { FormEvent, useMemo, useState } from 'react';
import { BookOpen, Brain, Copy, FileText, Globe2, Layers3, Lock, Plus, Share2, X } from 'lucide-react';
import type { Difficulty, LibraryCourse, LibraryFlashcard, LibraryNote, LibraryShare, LibraryTopic, Profile, Visibility } from '../types';
import { NeonCard } from './NeonCard';

export type NewCourse = { title: string; description: string; visibility: Visibility };
export type NewTopic = { course_id: string; title: string; summary: string };
export type NewNote = { topic_id: string; title: string; body: string };
export type NewFlashcard = { topic_id: string; question: string; answer: string; difficulty: Difficulty };

type LibraryBoardProps = {
  currentUserId: string;
  courses: LibraryCourse[];
  topics: LibraryTopic[];
  notes: LibraryNote[];
  flashcards: LibraryFlashcard[];
  profiles: Profile[];
  shares: LibraryShare[];
  onCreateCourse: (course: NewCourse) => Promise<void>;
  onCreateTopic: (topic: NewTopic) => Promise<void>;
  onCreateNote: (note: NewNote) => Promise<void>;
  onCreateFlashcard: (flashcard: NewFlashcard) => Promise<void>;
  onShareCourse: (course: LibraryCourse, recipientUserId: string) => Promise<void>;
  onUpdateCourseVisibility: (course: LibraryCourse, visibility: Visibility) => Promise<void>;
  onCloneCourse: (course: LibraryCourse) => Promise<void>;
};

type ModalKind = 'course' | 'topic' | 'note' | 'flashcard' | null;

export function LibraryBoard({
  currentUserId,
  courses,
  topics,
  notes,
  flashcards,
  profiles,
  shares,
  onCreateCourse,
  onCreateTopic,
  onCreateNote,
  onCreateFlashcard,
  onShareCourse,
  onUpdateCourseVisibility,
  onCloneCourse,
}: LibraryBoardProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? '');
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? courses[0] ?? null;
  const courseId = selectedCourse?.id ?? '';
  const courseTopics = topics.filter((topic) => topic.course_id === courseId);
  const [selectedTopicId, setSelectedTopicId] = useState(courseTopics[0]?.id ?? '');
  const selectedTopic = courseTopics.find((topic) => topic.id === selectedTopicId) ?? courseTopics[0] ?? null;
  const topicId = selectedTopic?.id ?? '';
  const topicNotes = notes.filter((note) => note.topic_id === topicId);
  const topicFlashcards = flashcards.filter((flashcard) => flashcard.topic_id === topicId);
  const [modal, setModal] = useState<ModalKind>(null);
  const [shareCourse, setShareCourse] = useState<LibraryCourse | null>(null);

  const selectedCourseOwner = profiles.find((profile) => profile.id === selectedCourse?.user_id);
  const selectedIsOwner = selectedCourse?.user_id === currentUserId;
  const selectedTopicIsOwner = selectedTopic?.user_id === currentUserId;

  const totals = useMemo(() => ({
    courses: courses.filter((course) => course.user_id === currentUserId).length,
    shared: shares.filter((share) => share.recipient_user_id === currentUserId).length,
    topics: topics.length,
    notes: notes.length,
    flashcards: flashcards.length,
  }), [courses, currentUserId, flashcards.length, notes.length, shares, topics.length]);

  return (
    <div className="space-y-5">
      <NeonCard tone="green">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="text-forge-green" size={24} />
            <div>
              <h2 className="text-2xl font-black text-white">Biblioteca</h2>
              <p className="text-sm text-slate-400">Crea cursos, arma flashcards y comparte bibliotecas con otros operadores.</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            <SmallTotal label="Tus cursos" value={totals.courses} />
            <SmallTotal label="Compartidos" value={totals.shared} />
            <SmallTotal label="Temas" value={totals.topics} />
            <SmallTotal label="Notas" value={totals.notes} />
            <SmallTotal label="Cards" value={totals.flashcards} />
          </div>
        </div>
      </NeonCard>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <NeonCard tone="blue">
          <PanelHeader title="Cursos" action="Nuevo curso" onClick={() => setModal('course')} />
          <div className="mt-4 space-y-3">
            {courses.length ? courses.map((course) => {
              const isOwner = course.user_id === currentUserId;
              const owner = profiles.find((profile) => profile.id === course.user_id);
              const shareCount = shares.filter((share) => share.course_id === course.id).length;
              return (
                <article
                  key={course.id}
                  className={`rounded-md border p-3 transition ${course.id === courseId ? 'border-forge-blue/40 bg-forge-blue/10' : 'border-white/10 bg-black/25 hover:border-forge-blue/30'}`}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      setSelectedCourseId(course.id);
                      setSelectedTopicId('');
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">{course.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{course.description || 'Sin descripción'}</p>
                      </div>
                      <CourseVisibilityBadge visibility={course.visibility} isOwner={isOwner} shared={shareCount > 0} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{isOwner ? 'Creado por ti' : `Por ${owner?.display_name ?? 'usuario'}`}</p>
                  </button>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {isOwner ? (
                      <>
                        <select
                          className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 outline-none focus:border-forge-blue"
                          value={course.visibility === 'public' ? 'public' : 'private'}
                          onChange={(event) => void onUpdateCourseVisibility(course, event.target.value as Visibility)}
                        >
                          <option value="private">Privada</option>
                          <option value="public">Pública</option>
                        </select>
                        <button className="inline-flex items-center gap-2 rounded-md border border-forge-green/30 bg-forge-green/10 px-3 py-2 text-sm font-bold text-forge-green hover:bg-forge-green hover:text-black" onClick={() => setShareCourse(course)}>
                          <Share2 size={15} />
                          Compartir
                        </button>
                      </>
                    ) : (
                      <button className="inline-flex items-center gap-2 rounded-md border border-forge-violet/30 bg-forge-violet/10 px-3 py-2 text-sm font-bold text-forge-violet hover:bg-forge-violet hover:text-white" onClick={() => void onCloneCourse(course)}>
                        <Copy size={15} />
                        Duplicar
                      </button>
                    )}
                  </div>
                </article>
              );
            }) : <EmptyText text="Aún no tienes cursos." />}
          </div>
        </NeonCard>

        <NeonCard tone="violet">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-white">Temas</h3>
              {selectedCourse ? (
                <p className="mt-1 text-sm text-slate-400">
                  {selectedIsOwner ? 'Puedes editar este curso.' : `Biblioteca de ${selectedCourseOwner?.display_name ?? 'otro usuario'} en modo lectura.`}
                </p>
              ) : null}
            </div>
            <button className="inline-flex items-center gap-2 rounded-md bg-forge-violet px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!courseId || !selectedIsOwner} onClick={() => setModal('topic')}>
              <Plus size={16} />
              Nuevo tema
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {courseTopics.length ? courseTopics.map((topic) => (
              <button
                key={topic.id}
                className={`rounded-md border p-3 text-left transition ${topic.id === topicId ? 'border-forge-violet/40 bg-forge-violet/10' : 'border-white/10 bg-black/25 hover:border-forge-violet/30'}`}
                onClick={() => setSelectedTopicId(topic.id)}
              >
                <div className="flex items-center gap-2">
                  <Layers3 size={16} className="text-forge-violet" />
                  <p className="font-black text-white">{topic.title}</p>
                </div>
                <p className="mt-2 text-sm text-slate-400">{topic.summary || 'Tema de estudio'}</p>
              </button>
            )) : <EmptyText text="Selecciona un curso y crea un tema." />}
          </div>
        </NeonCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <NeonCard tone="blue">
          <PanelHeader title="Apuntes" action="Nuevo apunte" disabled={!topicId || !selectedTopicIsOwner} onClick={() => setModal('note')} />
          <div className="mt-4 space-y-3">
            {topicNotes.length ? topicNotes.map((note) => (
              <article key={note.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-forge-blue" />
                  <h3 className="font-black text-white">{note.title}</h3>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-400">{note.body}</p>
              </article>
            )) : <EmptyText text="No hay apuntes en este tema." />}
          </div>
        </NeonCard>

        <NeonCard tone="green">
          <PanelHeader title="Flashcards" action="Nueva flashcard" disabled={!topicId || !selectedTopicIsOwner} onClick={() => setModal('flashcard')} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topicFlashcards.length ? topicFlashcards.map((flashcard) => (
              <article key={flashcard.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-forge-green" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-forge-green">{flashcard.difficulty}</p>
                </div>
                <p className="mt-3 font-black text-white">{flashcard.question}</p>
                <p className="mt-2 text-sm text-slate-400">{flashcard.answer}</p>
              </article>
            )) : <EmptyText text="No hay flashcards en este tema." />}
          </div>
        </NeonCard>
      </div>

      {modal === 'course' ? <CourseModal onClose={() => setModal(null)} onCreateCourse={onCreateCourse} /> : null}
      {modal === 'topic' ? <TopicModal courseId={courseId} onClose={() => setModal(null)} onCreateTopic={onCreateTopic} /> : null}
      {modal === 'note' ? <NoteModal topicId={topicId} onClose={() => setModal(null)} onCreateNote={onCreateNote} /> : null}
      {modal === 'flashcard' ? <FlashcardModal topicId={topicId} onClose={() => setModal(null)} onCreateFlashcard={onCreateFlashcard} /> : null}
      {shareCourse ? (
        <ShareCourseModal
          currentUserId={currentUserId}
          course={shareCourse}
          profiles={profiles}
          shares={shares}
          onClose={() => setShareCourse(null)}
          onShareCourse={onShareCourse}
        />
      ) : null}
    </div>
  );
}

function CourseVisibilityBadge({ visibility, isOwner, shared }: { visibility: Visibility; isOwner: boolean; shared: boolean }) {
  if (!isOwner) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-forge-violet/30 bg-forge-violet/10 px-2 py-1 text-xs font-bold text-forge-violet">
        <Share2 size={12} />
        Compartida
      </span>
    );
  }

  if (visibility === 'public') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-forge-green/30 bg-forge-green/10 px-2 py-1 text-xs font-bold text-forge-green">
        <Globe2 size={12} />
        Pública
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-xs font-bold text-slate-400">
      <Lock size={12} />
      {shared ? 'Compartida' : 'Privada'}
    </span>
  );
}

function PanelHeader({ title, action, disabled, onClick }: { title: string; action: string; disabled?: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-black text-white">{title}</h3>
      <button className="inline-flex items-center gap-2 rounded-md bg-forge-blue px-3 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} onClick={onClick}>
        <Plus size={16} />
        {action}
      </button>
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur">
      <section className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-lg border border-forge-blue/30 bg-forge-panel p-5 shadow-blue">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white">{title}</h2>
          <button className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} title="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function CourseModal({ onClose, onCreateCourse }: { onClose: () => void; onCreateCourse: (course: NewCourse) => Promise<void> }) {
  const [course, setCourse] = useState<NewCourse>({ title: '', description: '', visibility: 'private' });
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onCreateCourse(course);
    setLoading(false);
    onClose();
  }
  return (
    <ModalShell title="Nuevo curso" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-blue" placeholder="Nombre del curso" value={course.title} onChange={(event) => setCourse({ ...course, title: event.target.value })} required />
        <textarea className="min-h-24 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-blue" placeholder="Descripción" value={course.description} onChange={(event) => setCourse({ ...course, description: event.target.value })} />
        <select className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-blue" value={course.visibility} onChange={(event) => setCourse({ ...course, visibility: event.target.value as Visibility })}>
          <option value="private">Privada</option>
          <option value="public">Pública</option>
        </select>
        <button className="w-full rounded-md bg-forge-blue px-4 py-3 font-bold text-black" disabled={loading}>{loading ? 'Creando...' : 'Crear curso'}</button>
      </form>
    </ModalShell>
  );
}

function ShareCourseModal({
  currentUserId,
  course,
  profiles,
  shares,
  onClose,
  onShareCourse,
}: {
  currentUserId: string;
  course: LibraryCourse;
  profiles: Profile[];
  shares: LibraryShare[];
  onClose: () => void;
  onShareCourse: (course: LibraryCourse, recipientUserId: string) => Promise<void>;
}) {
  const candidates = profiles.filter((profile) =>
    profile.id !== currentUserId
    && !shares.some((share) => share.course_id === course.id && share.recipient_user_id === profile.id),
  );
  const [recipientId, setRecipientId] = useState(candidates[0]?.id ?? '');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!recipientId) return;
    setLoading(true);
    await onShareCourse(course, recipientId);
    setLoading(false);
    onClose();
  }

  return (
    <ModalShell title="Compartir biblioteca" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="rounded-md border border-forge-green/25 bg-forge-green/10 p-3">
          <p className="font-black text-white">{course.title}</p>
          <p className="mt-1 text-sm text-slate-400">{course.description || 'Curso sin descripción'}</p>
        </div>
        {candidates.length ? (
          <select className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" value={recipientId} onChange={(event) => setRecipientId(event.target.value)}>
            {candidates.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.display_name} @{profile.username ?? 'sin_usuario'}</option>
            ))}
          </select>
        ) : (
          <EmptyText text="No hay usuarios nuevos para compartir este curso." />
        )}
        <button className="w-full rounded-md bg-forge-green px-4 py-3 font-bold text-black disabled:opacity-50" disabled={loading || !recipientId}>
          {loading ? 'Compartiendo...' : 'Compartir curso'}
        </button>
      </form>
    </ModalShell>
  );
}

function TopicModal({ courseId, onClose, onCreateTopic }: { courseId: string; onClose: () => void; onCreateTopic: (topic: NewTopic) => Promise<void> }) {
  const [topic, setTopic] = useState({ title: '', summary: '' });
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onCreateTopic({ course_id: courseId, ...topic });
    setLoading(false);
    onClose();
  }
  return (
    <ModalShell title="Nuevo tema" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" placeholder="Tema" value={topic.title} onChange={(event) => setTopic({ ...topic, title: event.target.value })} required />
        <textarea className="min-h-20 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet" placeholder="Resumen" value={topic.summary} onChange={(event) => setTopic({ ...topic, summary: event.target.value })} />
        <button className="w-full rounded-md bg-forge-violet px-4 py-3 font-bold text-white" disabled={loading}>{loading ? 'Agregando...' : 'Agregar tema'}</button>
      </form>
    </ModalShell>
  );
}

function NoteModal({ topicId, onClose, onCreateNote }: { topicId: string; onClose: () => void; onCreateNote: (note: NewNote) => Promise<void> }) {
  const [note, setNote] = useState({ title: '', body: '' });
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onCreateNote({ topic_id: topicId, ...note });
    setLoading(false);
    onClose();
  }
  return (
    <ModalShell title="Nuevo apunte" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-blue" placeholder="Título del apunte" value={note.title} onChange={(event) => setNote({ ...note, title: event.target.value })} required />
        <textarea className="min-h-32 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-blue" placeholder="Contenido" value={note.body} onChange={(event) => setNote({ ...note, body: event.target.value })} required />
        <button className="w-full rounded-md bg-forge-blue px-4 py-3 font-bold text-black" disabled={loading}>{loading ? 'Guardando...' : 'Guardar apunte'}</button>
      </form>
    </ModalShell>
  );
}

function FlashcardModal({ topicId, onClose, onCreateFlashcard }: { topicId: string; onClose: () => void; onCreateFlashcard: (flashcard: NewFlashcard) => Promise<void> }) {
  const [flashcard, setFlashcard] = useState<Omit<NewFlashcard, 'topic_id'>>({ question: '', answer: '', difficulty: 'medium' });
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onCreateFlashcard({ topic_id: topicId, ...flashcard });
    setLoading(false);
    onClose();
  }
  return (
    <ModalShell title="Nueva flashcard" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" placeholder="Pregunta" value={flashcard.question} onChange={(event) => setFlashcard({ ...flashcard, question: event.target.value })} required />
        <textarea className="min-h-24 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" placeholder="Respuesta" value={flashcard.answer} onChange={(event) => setFlashcard({ ...flashcard, answer: event.target.value })} required />
        <select className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-green" value={flashcard.difficulty} onChange={(event) => setFlashcard({ ...flashcard, difficulty: event.target.value as Difficulty })}>
          <option value="easy">Fácil</option>
          <option value="medium">Media</option>
          <option value="hard">Difícil</option>
          <option value="legendary">Legendaria</option>
        </select>
        <button className="w-full rounded-md bg-forge-green px-4 py-3 font-bold text-black" disabled={loading}>{loading ? 'Creando...' : 'Crear flashcard'}</button>
      </form>
    </ModalShell>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">{text}</p>;
}

function SmallTotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
