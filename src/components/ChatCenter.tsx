import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Clock3, FileIcon, MessageCircle, Paperclip, Search, Send, Sparkles, Users } from 'lucide-react';
import type { ChatAttachmentKind, ChatMessage, ChatParticipant, ChatThread, Profile } from '../types';
import { NeonCard } from './NeonCard';

export type NewChatMessage = {
  body: string;
  file: File | null;
};

type ChatCenterProps = {
  currentUserId: string;
  profiles: Profile[];
  threads: ChatThread[];
  participants: ChatParticipant[];
  messages: ChatMessage[];
  initialThreadId: string | null;
  onStartChat: (peerUserId: string) => Promise<string | null>;
  onSendMessage: (threadId: string, message: NewChatMessage) => Promise<void>;
};

const quickMessages = [
  'Hoy voy con todo.',
  'Te comparto mi avance.',
  '¿Hacemos un mini reto?',
];

export function ChatCenter({ currentUserId, profiles, threads, participants, messages, initialThreadId, onStartChat, onSendMessage }: ChatCenterProps) {
  const [query, setQuery] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState(initialThreadId ?? '');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [startingUserId, setStartingUserId] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const conversations = useMemo(() => {
    return threads
      .map((thread) => {
        const threadParticipants = participants.filter((participant) => participant.thread_id === thread.id);
        const peer = threadParticipants.find((participant) => participant.user_id !== currentUserId)?.profiles
          ?? profiles.find((profile) => profile.id === threadParticipants.find((participant) => participant.user_id !== currentUserId)?.user_id)
          ?? null;
        const lastMessage = messages
          .filter((message) => message.thread_id === thread.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
        return { thread, participants: threadParticipants, peer, lastMessage };
      })
      .filter((conversation) => conversation.peer)
      .sort((a, b) => new Date(b.thread.updated_at).getTime() - new Date(a.thread.updated_at).getTime());
  }, [currentUserId, messages, participants, profiles, threads]);

  const firstThreadId = conversations[0]?.thread.id ?? '';

  useEffect(() => {
    if (initialThreadId && threads.some((thread) => thread.id === initialThreadId)) {
      setSelectedThreadId(initialThreadId);
      return;
    }
    if (!selectedThreadId && firstThreadId) setSelectedThreadId(firstThreadId);
    if (selectedThreadId && !threads.some((thread) => thread.id === selectedThreadId)) setSelectedThreadId(firstThreadId);
  }, [firstThreadId, initialThreadId, selectedThreadId, threads]);

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? null;
  const selectedConversation = conversations.find((conversation) => conversation.thread.id === selectedThreadId) ?? null;
  const activeMessages = useMemo(() => {
    return messages
      .filter((message) => message.thread_id === selectedThreadId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, selectedThreadId]);

  const filteredProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return profiles
      .filter((profile) => profile.id !== currentUserId)
      .filter((profile) => {
        if (!normalized) return true;
        return [profile.display_name, profile.username, profile.description, profile.motto]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      });
  }, [currentUserId, profiles, query]);

  const expired = selectedThread ? new Date(selectedThread.expires_at).getTime() <= now : false;

  async function startChat(peerUserId: string) {
    setStartingUserId(peerUserId);
    const threadId = await onStartChat(peerUserId);
    if (threadId) setSelectedThreadId(threadId);
    setStartingUserId('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedThread || expired || sending) return;
    if (!body.trim() && !file) return;

    setSending(true);
    await onSendMessage(selectedThread.id, { body, file });
    setBody('');
    setFile(null);
    setFileInputKey((key) => key + 1);
    setSending(false);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
      <div className="space-y-5">
        <NeonCard tone="blue">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-forge-blue">
                <MessageCircle size={19} />
                <h2 className="text-xl font-black text-white">Mensajes</h2>
              </div>
              <p className="mt-1 text-sm text-slate-400">Chats privados con caducidad de 24 horas y adjuntos seguros.</p>
            </div>
            <img src="/branding/logo-icon.png" alt="Icono DUALFORGE" className="size-9 object-contain opacity-80" />
          </div>

          <div className="mt-4 space-y-2">
            {conversations.length ? conversations.map((conversation) => (
              <button
                key={conversation.thread.id}
                className={`w-full rounded-md border p-3 text-left transition ${
                  selectedThreadId === conversation.thread.id
                    ? 'border-forge-blue/40 bg-forge-blue/10'
                    : 'border-white/10 bg-black/25 hover:border-forge-blue/30'
                }`}
                onClick={() => setSelectedThreadId(conversation.thread.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar profile={conversation.peer} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-black text-white">{conversation.peer?.display_name}</p>
                      <span className="shrink-0 text-xs text-forge-green">{timeLeft(conversation.thread.expires_at, now)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {conversation.lastMessage?.body || attachmentLabel(conversation.lastMessage?.attachment_kind) || 'Chat iniciado'}
                    </p>
                  </div>
                </div>
              </button>
            )) : (
              <EmptyState title="Aún no tienes chats" text="Busca a alguien y abre una conversación efímera." />
            )}
          </div>
        </NeonCard>

        <NeonCard tone="green">
          <div className="flex items-center gap-2 text-forge-green">
            <Users size={18} />
            <h3 className="text-lg font-black text-white">Buscar usuarios</h3>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              className="w-full rounded-md border border-white/10 bg-black/30 py-3 pl-10 pr-3 outline-none focus:border-forge-green"
              placeholder="Nombre o usuario"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="mt-4 max-h-[26rem] space-y-2 overflow-auto pr-1 scrollbar-thin">
            {filteredProfiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar profile={profile} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">{profile.display_name}</p>
                    <p className="truncate text-sm text-forge-blue">@{profile.username ?? 'sin_usuario'}</p>
                  </div>
                </div>
                <button
                  className="inline-flex shrink-0 items-center gap-2 rounded-md bg-forge-green px-3 py-2 text-sm font-black text-black disabled:opacity-50"
                  onClick={() => void startChat(profile.id)}
                  disabled={startingUserId === profile.id}
                >
                  <MessageCircle size={16} />
                  {startingUserId === profile.id ? 'Abriendo' : 'Chat'}
                </button>
              </div>
            ))}
            {!filteredProfiles.length ? <EmptyState title="Sin resultados" text="No hay perfiles con ese filtro." compact /> : null}
          </div>
        </NeonCard>
      </div>

      <NeonCard tone="violet" className="flex min-h-[42rem] flex-col">
        {selectedThread && selectedConversation?.peer ? (
          <>
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar profile={selectedConversation.peer} large />
                <div className="min-w-0">
                  <p className="truncate text-xl font-black text-white">{selectedConversation.peer.display_name}</p>
                  <p className="truncate text-sm text-forge-blue">@{selectedConversation.peer.username ?? 'sin_usuario'}</p>
                </div>
              </div>
              <div className="rounded-md border border-forge-violet/30 bg-forge-violet/10 px-3 py-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock3 size={16} className="text-forge-violet" />
                  <span>{timeLeft(selectedThread.expires_at, now)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatExpiration(selectedThread.expires_at)}</p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-auto py-4 pr-1 scrollbar-thin">
              {activeMessages.length ? activeMessages.map((message) => (
                <MessageBubble key={message.id} message={message} mine={message.sender_id === currentUserId} />
              )) : (
                <div className="flex h-full min-h-60 items-center justify-center">
                  <EmptyState title="Chat listo" text="Envía el primer mensaje antes de que expire la ventana." />
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {quickMessages.map((message) => (
                  <button
                    key={message}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-forge-violet/40 hover:text-white"
                    onClick={() => setBody(message)}
                    type="button"
                  >
                    <Sparkles size={13} />
                    {message}
                  </button>
                ))}
              </div>
              {file ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-forge-blue/30 bg-forge-blue/10 p-3 text-sm text-slate-200">
                  <span className="truncate">{file.name} · {formatBytes(file.size)}</span>
                  <button className="text-forge-blue hover:text-white" onClick={() => setFile(null)} type="button">Quitar</button>
                </div>
              ) : null}
              <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-white/10 bg-black/30 px-3 py-3 text-slate-300 hover:border-forge-blue/40 hover:text-white" title="Adjuntar archivo">
                  <Paperclip size={19} />
                  <input
                    key={fileInputKey}
                    className="sr-only"
                    type="file"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    disabled={expired}
                  />
                </label>
                <input
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-forge-violet"
                  placeholder={expired ? 'Este chat expiró' : 'Mensaje'}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  disabled={expired}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-forge-violet px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={expired || sending || (!body.trim() && !file)}
                >
                  <Send size={18} />
                  {sending ? 'Enviando' : 'Enviar'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex min-h-[34rem] flex-1 items-center justify-center">
            <EmptyState title="Elige una conversación" text="Abre un chat privado desde la lista de usuarios." />
          </div>
        )}
      </NeonCard>
    </div>
  );
}

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <article className={`max-w-[86%] rounded-lg border p-3 ${mine ? 'border-forge-violet/30 bg-forge-violet/15' : 'border-white/10 bg-black/30'}`}>
        {message.body ? <p className="whitespace-pre-line text-sm text-slate-100">{message.body}</p> : null}
        {message.attachment_path ? <AttachmentPreview message={message} /> : null}
        <p className="mt-2 text-[11px] text-slate-500">{formatMessageTime(message.created_at)}</p>
      </article>
    </div>
  );
}

function AttachmentPreview({ message }: { message: ChatMessage }) {
  const label = message.attachment_name ?? attachmentLabel(message.attachment_kind) ?? 'Adjunto';

  if (!message.attachment_url) {
    return (
      <div className="mt-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400">
        {label}
      </div>
    );
  }

  if (message.attachment_kind === 'image') {
    return <img src={message.attachment_url} alt={label} className="mt-3 max-h-80 rounded-md border border-white/10 object-contain" />;
  }

  if (message.attachment_kind === 'audio') {
    return <audio src={message.attachment_url} controls className="mt-3 w-full" />;
  }

  if (message.attachment_kind === 'video') {
    return <video src={message.attachment_url} controls className="mt-3 max-h-80 w-full rounded-md border border-white/10" />;
  }

  return (
    <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-forge-blue hover:text-white">
      <FileIcon size={17} />
      <span className="truncate">{label}</span>
    </a>
  );
}

function Avatar({ profile, large = false }: { profile: Profile | null | undefined; large?: boolean }) {
  const size = large ? 'size-12' : 'size-10';
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={`Avatar de ${profile.display_name}`} className={`${size} rounded-md object-cover`} />;
  }

  return (
    <div className={`flex ${size} items-center justify-center rounded-md border border-white/10 bg-white/[0.04]`}>
      <img src="/branding/logo-icon.png" alt="Icono DUALFORGE" className={`${large ? 'size-7' : 'size-6'} object-contain`} />
    </div>
  );
}

function EmptyState({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return (
    <div className={`rounded-md border border-white/10 bg-white/[0.03] text-center ${compact ? 'p-3' : 'p-5'}`}>
      <img src="/branding/logo-icon.png" alt="Icono DUALFORGE" className="mx-auto size-8 object-contain opacity-75" />
      <p className="mt-2 font-black text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{text}</p>
    </div>
  );
}

function attachmentLabel(kind: ChatAttachmentKind | null | undefined) {
  if (kind === 'image') return 'Imagen';
  if (kind === 'audio') return 'Audio';
  if (kind === 'video') return 'Video';
  if (kind === 'file') return 'Archivo';
  return '';
}

export function detectAttachmentKind(file: File): ChatAttachmentKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'file';
}

function timeLeft(expiresAt: string, now: number) {
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) return 'Expirado';
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.max(0, Math.floor((remaining % 3_600_000) / 60_000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatExpiration(value: string) {
  return `Hasta ${new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))}`;
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
