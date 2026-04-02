'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Bonjour, un bénévole vas bientot arriver. En attendant, n\'hésitez pas à consulter notre base de données pour plus d\'informations.',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Merci pour votre message. Notre collectif va examiner votre cas et vous répondre dans les plus brefs délais. En attendant, n\'hésitez pas à consulter notre base de données pour plus d\'informations.',
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-emerald-600 text-white  -full shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center z-50 group"
        aria-label="Ouvrir le chat"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">
          {isOpen ? '✕' : '💬'}
        </span>
      </button>

      <div
        className={`fixed bottom-24 right-6 w-96 bg-white border border-slate-200  -lg shadow-xl transform transition-all duration-300 z-40 ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50  -t-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100  -full flex items-center justify-center">
              <span className="text-emerald-600 text-lg">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Assistance Anti Pepins</h3>
              <p className="text-xs text-slate-500">En ligne</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fermer le chat"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        <div className="h-80 overflow-y-auto p-4 space-y-3 bg-white">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2  -lg ${
                  message.sender === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-emerald-100' : 'text-slate-500'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-900 px-4 py-2  -lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-slate-400  -full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400  -full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400  -full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-200 bg-white  -b-lg">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tapez votre message..."
              className="flex-1 px-3 py-2 border border-slate-300  -lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="px-4 py-2 bg-emerald-600 text-white  -lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="text-lg">➤</span>
            </button>
          </form>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Notre collectif vous répondra rapidement
      </p>
        </div>
      </div>

      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-transparent z-30"
          onClick={() => setIsOpen(false)}
          aria-label="Fermer le chat"
        />
      )}
    </>
  );
}

export function EmbeddedChat({ className = '' }: Readonly<{ className?: string }>) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Bienvenue dans le chat d\'assistance ! Comment puis-je vous aider ?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Merci pour votre message. Pour une assistance plus rapide, vous pouvez également consulter notre page de support ou échanger avec un membre du collectif.',
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`bg-white border border-slate-200  -lg shadow-lg ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50  -t-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100  -full flex items-center justify-center">
            <span className="text-emerald-600 text-lg">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Chat d&apos;assistance</h3>
            <p className="text-xs text-slate-500">Service disponible 48h/24</p>
          </div>
        </div>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-white">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2  -lg ${
                message.sender === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-emerald-100' : 'text-slate-500'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-900 px-4 py-2  -lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-slate-400  -full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400  -full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400  -full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 bg-white  -b-lg">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tapez votre message..."
            className="flex-1 px-3 py-2 border border-slate-300  -lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2 bg-emerald-600 text-white  -lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-lg">➤</span>
          </button>
        </form>
      </div>
    </div>
  );
}