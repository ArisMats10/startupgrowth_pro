import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { generateBusinessAdvice } from '../../../services/aiAnalysisService';
import { useAuth } from '../../../context/authContext.jsx';
import {
  appendAdvisorConversationMessages,
  createAdvisorConversation,
  deleteAdvisorConversation,
  getLatestAdvisorConversation,
} from '../../../services/advisorConversationService';

const AIBusinessAdvisor = () => {
  const { user } = useAuth();

  const defaultGreeting = useMemo(
    () => [
      {
        id: 1,
        type: 'bot',
        message: "Hello! I'm your AI business advisor. How can I help you today?",
        timestamp: new Date(),
      },
    ],
    []
  );

  const [conversationId, setConversationId] = useState(null);
  const [chatMessages, setChatMessages] = useState(defaultGreeting);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [persistenceDisabled, setPersistenceDisabled] = useState(false);

  const getFriendlyError = (err) => {
    const raw = String(err?.message || '').trim();
    if (!raw) return 'Sorry, I could not generate a response right now. Please try again.';
    if (/rate limit|quota|429/i.test(raw)) return 'AI is rate-limited right now. Please try again in a minute.';
    if (/OPENAI_API_KEY is not set/i.test(raw)) {
      return 'AI server is not configured. Add OPENAI_API_KEY to backend/.env and restart the backend server.';
    }
    if (/AI provider authentication failed|OpenAI authentication failed|status\s*:\s*503/i.test(raw)) {
      return 'AI server configuration error: verify OPENAI_API_KEY in backend/.env, then restart the backend server.';
    }
    if (/temporarily unavailable|\b503\b/i.test(raw)) {
      return 'AI service is temporarily unavailable. Please try again later.';
    }
    return 'Sorry, I could not generate a response right now. Please try again.';
  };

  const isLoggedIn = Boolean(user);
  const canPersist = isLoggedIn && !persistenceDisabled;

  const formatTime = (date) => {
    return date?.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage?.trim() || loading) return;

    const userPrompt = newMessage;

    const userMessage = {
      id: chatMessages?.length + 1,
      type: 'user',
      message: userPrompt,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);

    try {
      const aiResponse = await generateBusinessAdvice(chatMessages, userPrompt);
      if (!String(aiResponse || '').trim()) {
        throw new Error('Empty AI response');
      }

      const botMessage = {
        id: chatMessages.length + 2,
        type: 'bot',
        message: String(aiResponse),
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, botMessage]);

      // Persist messages after the bot responds (logged-in users only)
      if (canPersist) {
        try {
          let ensuredConversationId = conversationId;
          if (!ensuredConversationId) {
            const created = await createAdvisorConversation({ messages: defaultGreeting });
            ensuredConversationId = created?._id || null;
            setConversationId(ensuredConversationId);
          }

          if (ensuredConversationId) {
            await appendAdvisorConversationMessages({
              conversationId: ensuredConversationId,
              messages: [
                { type: 'user', message: userMessage.message, timestamp: userMessage.timestamp },
                { type: 'bot', message: botMessage.message, timestamp: botMessage.timestamp },
              ],
            });
          }
        } catch (persistError) {
          const status = persistError?.response?.status;
          if (status === 401) {
            setPersistenceDisabled(true);
            setConversationId(null);
          }
          console.warn('Failed to persist advisor conversation:', persistError);
        }
      }
    } catch (error) {
      const errorMessage = {
        id: chatMessages.length + 2,
        type: 'bot',
        message: getFriendlyError(error),
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewConversation = async () => {
    setChatMessages(defaultGreeting);
    setNewMessage('');

    if (!isLoggedIn) {
      setConversationId(null);
      return;
    }

    if (persistenceDisabled) {
      setConversationId(null);
      return;
    }

    setIsSyncing(true);
    try {
      if (conversationId) {
        try {
          await deleteAdvisorConversation({ conversationId });
        } catch (deleteError) {
          // If it was already deleted / not found, proceed to create a new one.
          console.warn('Failed to delete old conversation (continuing):', deleteError);
        }
      }

      const created = await createAdvisorConversation({ messages: defaultGreeting });
      setConversationId(created?._id || null);
      const msgs = created?.messages?.length ? created.messages : defaultGreeting;
      setChatMessages(
        msgs.map((m, idx) => ({
          id: idx + 1,
          type: m.type,
          message: m.message,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }))
      );
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadOrInit() {
      setConversationId(null);
      setChatMessages(defaultGreeting);

      if (!isLoggedIn) {
        setPersistenceDisabled(false);
        return;
      }

      setPersistenceDisabled(false);

      setIsSyncing(true);
      try {
        const latest = await getLatestAdvisorConversation();
        if (cancelled) return;

        if (latest?._id) {
          setConversationId(latest._id);
          const msgs = Array.isArray(latest.messages) && latest.messages.length ? latest.messages : defaultGreeting;
          setChatMessages(
            msgs.map((m, idx) => ({
              id: idx + 1,
              type: m.type,
              message: m.message,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            }))
          );
          return;
        }

        const created = await createAdvisorConversation({ messages: defaultGreeting });
        if (cancelled) return;
        setConversationId(created?._id || null);
        const msgs = created?.messages?.length ? created.messages : defaultGreeting;
        setChatMessages(
          msgs.map((m, idx) => ({
            id: idx + 1,
            type: m.type,
            message: m.message,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }))
        );
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401) {
          setPersistenceDisabled(true);
        }
        console.warn('Failed to load advisor conversation (falling back to local):', error);
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }

    loadOrInit();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?._id, user?.id, defaultGreeting]);

  return (
    <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Icon name="MessageSquare" size={20} className="text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">AI Business Advisor</h2>
            <p className="text-sm text-muted-foreground">Ask questions and get strategy guidance</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartNewConversation}
            disabled={loading || isSyncing}
          >
            Start new conversation
          </Button>

          {(loading || isSyncing) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              <span>{loading ? 'Thinking…' : 'Syncing…'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="h-[28rem] overflow-y-auto space-y-3 pr-2">
          {chatMessages?.map((msg) => (
            <div key={msg?.id} className={`flex ${msg?.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[38rem] px-4 py-3 rounded-lg ${
                  msg?.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg?.message}</p>
                <p className="text-xs opacity-70 mt-1">{formatTime(msg?.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e?.target?.value)}
              placeholder="Ask me anything about your business…"
              className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" size="sm" disabled={!newMessage?.trim() || loading}>
              <Icon name="Send" size={16} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIBusinessAdvisor;
