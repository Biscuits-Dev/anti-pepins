'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  SENDER_ROLE,
  PRESENCE_STATUS,
  type AdminChatSession,
} from '@/types/chat';
import {
  createAdminChannel,
  createSessionChannel,
  attachChatListeners,
  broadcastMessage,
  broadcastTyping,
  broadcastPresence,
} from '@/lib/chat';

const TYPING_STOP_DELAY_MS = 2_500;
const STORAGE_KEY = 'admin_chat_sessions';

function loadSessions(): Map<string, AdminChatSession> {
  if (globalThis.window === undefined) return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const entries = JSON.parse(raw) as [string, AdminChatSession][];
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveSessions(sessions: Map<string, AdminChatSession>): void {
  if (globalThis.window === undefined) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sessions.entries())));
  } catch {
  }
}

export interface AdminChatState {
  readonly sessions: Map<string, AdminChatSession>;
  readonly activeSessionId: string | null;
  readonly isConnected: boolean;
}

export interface UseAdminChatReturn extends AdminChatState {
  setActiveSession: (sessionId: string) => void;
  replyToSession: (sessionId: string, text: string) => Promise<void>;
  notifyTyping: (sessionId: string) => void;
  clearSessions: () => void;
}

export function useAdminChat(): UseAdminChatReturn {
  const [sessions, setSessions] = useState<Map<string, AdminChatSession>>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const replyChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const adminChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const isTypingSentRef = useRef<Map<string, boolean>>(new Map());

  const upsertSession = useCallback(
    (sessionId: string, updater: (prev: AdminChatSession) => AdminChatSession): void => {
      setSessions(prev => {
        const next = new Map(prev);
        const existing = next.get(sessionId) ?? {
          sessionId,
          messages: [],
          isUserTyping: false,
          lastActivity: new Date().toISOString(),
        };
        next.set(sessionId, updater(existing));
        saveSessions(next);
        return next;
      });
    },
    []
  );

  const clearSessions = useCallback((): void => {
    setSessions(new Map());
    setActiveSessionId(null);
    if (globalThis.window !== undefined) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const ensureReplyChannel = useCallback((sessionId: string): RealtimeChannel => {
    const existing = replyChannelsRef.current.get(sessionId);
    if (existing) return existing;

    const channel = createSessionChannel(sessionId);
    channel.subscribe();
    replyChannelsRef.current.set(sessionId, channel);
    return channel;
  }, []);

  useEffect(() => {
    const adminChannel = createAdminChannel();

    attachChatListeners(adminChannel, {
      onMessage(message) {
        if (message.sender === SENDER_ROLE.USER) {
          ensureReplyChannel(message.sessionId);
          upsertSession(message.sessionId, prev => ({
            ...prev,
            messages: [...prev.messages, message],
            lastActivity: message.timestamp,
            isUserTyping: false,
          }));
        }
      },
      onTyping(sessionId, sender, isTyping) {
        if (sender === SENDER_ROLE.USER) {
          upsertSession(sessionId, prev => ({ ...prev, isUserTyping: isTyping }));
        }
      },
    });

    adminChannel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {
        broadcastPresence(adminChannel, SENDER_ROLE.ADMIN, PRESENCE_STATUS.ONLINE).catch(console.error);
      }
    });

    adminChannelRef.current = adminChannel;

    const typingTimeouts = typingTimeoutsRef.current;
    const replyChannels = replyChannelsRef.current;

    return () => {
      broadcastPresence(adminChannel, SENDER_ROLE.ADMIN, PRESENCE_STATUS.OFFLINE).catch(console.error);
      typingTimeouts.forEach(clearTimeout);
      replyChannels.forEach(channel => { channel.unsubscribe().catch(console.error); });
      adminChannel.unsubscribe().catch(console.error);
    };
  }, [ensureReplyChannel, upsertSession]);

  const replyToSession = useCallback(
    async (sessionId: string, text: string): Promise<void> => {
      if (!text.trim()) return;

      const channel = ensureReplyChannel(sessionId);

      if (isTypingSentRef.current.get(sessionId)) {
        isTypingSentRef.current.set(sessionId, false);
        await broadcastTyping(channel, {
          sessionId,
          sender: SENDER_ROLE.ADMIN,
          isTyping: false,
        });
      }

      const message = await broadcastMessage(channel, {
        sessionId,
        text,
        sender: SENDER_ROLE.ADMIN,
      });

      upsertSession(sessionId, prev => ({
        ...prev,
        messages: [...prev.messages, message],
        lastActivity: message.timestamp,
      }));
    },
    [ensureReplyChannel, upsertSession]
  );

  const notifyTyping = useCallback(
    (sessionId: string): void => {
      const channel = ensureReplyChannel(sessionId);

      const sendTypingStop = async (): Promise<void> => {
        if (!isTypingSentRef.current.get(sessionId)) return;
        isTypingSentRef.current.set(sessionId, false);
        await broadcastTyping(channel, {
          sessionId,
          sender: SENDER_ROLE.ADMIN,
          isTyping: false,
        });
      };

      const existing = typingTimeoutsRef.current.get(sessionId);
      if (existing) clearTimeout(existing);

      if (!isTypingSentRef.current.get(sessionId)) {
        isTypingSentRef.current.set(sessionId, true);
        broadcastTyping(channel, {
          sessionId,
          sender: SENDER_ROLE.ADMIN,
          isTyping: true,
        }).catch(console.error);
      }

      typingTimeoutsRef.current.set(
        sessionId,
        setTimeout(() => sendTypingStop().catch(console.error), TYPING_STOP_DELAY_MS)
      );
    },
    [ensureReplyChannel]
  );

  return {
    sessions,
    activeSessionId,
    isConnected,
    setActiveSession: setActiveSessionId,
    replyToSession,
    notifyTyping,
    clearSessions,
  };
}