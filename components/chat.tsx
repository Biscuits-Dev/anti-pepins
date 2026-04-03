'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage } from '@/types/chat';
import { SENDER_ROLE } from '@/types/chat';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  readonly message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === SENDER_ROLE.USER;
  const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs px-4 py-2 rounded-2xl ${
          isUser
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-900 rounded-bl-sm'
        }`}
      >
        <p className="text-sm leading-relaxed">{message.text}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-emerald-200' : 'text-slate-400'}`}>
          {time}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm">
        <div className="flex gap-1 items-center">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface AdminBadgeProps {
  readonly isOnline: boolean;
}

function AdminBadge({ isOnline }: AdminBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'
        }`}
      />
      <span className="text-xs text-slate-500">
        {isOnline ? 'Un bénévole est disponible' : 'Laissez votre message'}
      </span>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isAdminTyping, isAdminOnline, isConnected, sendMessage, notifyTyping } =
    useChat();

  // ── Auto-scroll ──────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAdminTyping]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || !isConnected) return;

      setInputValue('');
      await sendMessage(trimmed);
    },
    [inputValue, isConnected, sendMessage]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setInputValue(e.target.value);
      notifyTyping();
    },
    [notifyTyping]
  );

  const toggleOpen = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
        aria-expanded={isOpen}
        className="fixed bottom-6 right-6 w-16 h-16 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-all duration-200 flex items-center justify-center z-50"
      >
        <span className="text-2xl select-none" aria-hidden="true">
          {isOpen ? '✕' : '💬'}
        </span>
      </button>

      {/* Chat panel — <dialog> pour l'accessibilité */}
      <dialog
        aria-label="Chat d'assistance"
        open={isOpen}
        className={`fixed bottom-24 right-6 w-96 bg-white border border-slate-200 rounded-2xl shadow-xl transition-all duration-300 z-40 m-0 p-0 ${
          isOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-lg select-none">
              🤝
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Assistance Anti Pépins</h2>
              <AdminBadge isOnline={isAdminOnline} />
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer le chat"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Messages */}
        <div
          role="log"
          aria-live="polite"
          aria-label="Messages du chat"
          className="h-80 overflow-y-auto px-4 py-3 space-y-3 bg-white"
        >
          {messages.length === 0 && (
            <p className="text-center text-slate-400 text-sm pt-8">
              Bonjour 👋 Un bénévole vous répondra dès que possible.
            </p>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isAdminTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white rounded-b-2xl">
          <form onSubmit={handleSubmit} className="flex gap-2" noValidate>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={isConnected ? 'Tapez votre message…' : 'Connexion en cours…'}
              disabled={!isConnected}
              maxLength={1000}
              autoComplete="off"
              aria-label="Message"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 text-sm placeholder:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || !isConnected}
              aria-label="Envoyer"
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span aria-hidden="true">➤</span>
            </button>
          </form>
          <p className="text-xs text-slate-400 mt-2 text-center">
            La conversation est effacée à la fermeture de la page
          </p>
        </div>
      </dialog>

      {/* Backdrop */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-transparent z-30"
          onClick={close}
          aria-label="Fermer le chat"
          tabIndex={-1}
        />
      )}
    </>
  );
}