'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  SENDER_ROLE,
  type ChatState,
} from '@/types/chat';
import {
  createSessionChannel,
  attachChatListeners,
  broadcastMessage,
  broadcastTyping,
  getOrCreateSessionId,
  clearSessionId,
} from '@/lib/chat';

const TYPING_DEBOUNCE_MS = 1_000;
const TYPING_STOP_DELAY_MS = 2_000;

export interface UseChatReturn extends ChatState {
  sessionId: string;
  sendMessage: (text: string) => Promise<void>;
  notifyTyping: () => void;
}

export function useChat(): UseChatReturn {
  const [sessionId] = useState<string>(getOrCreateSessionId);

  const [state, setState] = useState<ChatState>({
    messages: [],
    isAdminTyping: false,
    isAdminOnline: false,
    isConnected: false,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingSentRef = useRef<boolean>(false);

  useEffect(() => {
    const channel = createSessionChannel(sessionId);

    attachChatListeners(channel, {
      onMessage(message) {
        if (message.sender === SENDER_ROLE.ADMIN) {
          setState(prev => ({
            ...prev,
            messages: [...prev.messages, message],
            isAdminTyping: false,
          }));
        }
      },
      onTyping(_sessionId, sender, isTyping) {
        if (sender === SENDER_ROLE.ADMIN) {
          setState(prev => ({ ...prev, isAdminTyping: isTyping }));
        }
      },
      onAdminPresence(isOnline) {
        setState(prev => ({ ...prev, isAdminOnline: isOnline }));
      },
    });

    channel.subscribe((status) => {
      setState(prev => ({ ...prev, isConnected: status === 'SUBSCRIBED' }));
    });

    channelRef.current = channel;

    const typingTimeout = typingTimeoutRef.current;
    const typingDebounce = typingDebounceRef.current;

    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      if (typingDebounce) clearTimeout(typingDebounce);
      channel.unsubscribe();
      clearSessionId();
    };
  }, [sessionId]);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!channelRef.current || !text.trim()) return;

    if (isTypingSentRef.current) {
      isTypingSentRef.current = false;
      await broadcastTyping(channelRef.current, {
        sessionId,
        sender: SENDER_ROLE.USER,
        isTyping: false,
      });
    }

    const message = await broadcastMessage(channelRef.current, {
      sessionId,
      text,
      sender: SENDER_ROLE.USER,
    });

    setState(prev => ({ ...prev, messages: [...prev.messages, message] }));
  }, [sessionId]);

  const notifyTyping = useCallback((): void => {
    if (!channelRef.current) return;

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);

    typingDebounceRef.current = setTimeout(async () => {
      if (!channelRef.current) return;

      if (!isTypingSentRef.current) {
        isTypingSentRef.current = true;
        await broadcastTyping(channelRef.current, {
          sessionId,
          sender: SENDER_ROLE.USER,
          isTyping: true,
        });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        if (!channelRef.current || !isTypingSentRef.current) return;
        isTypingSentRef.current = false;
        await broadcastTyping(channelRef.current, {
          sessionId,
          sender: SENDER_ROLE.USER,
          isTyping: false,
        });
      }, TYPING_STOP_DELAY_MS);
    }, TYPING_DEBOUNCE_MS);
  }, [sessionId]);

  return {
    ...state,
    sessionId,
    sendMessage,
    notifyTyping,
  };
}