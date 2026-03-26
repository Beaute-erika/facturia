"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";

export interface AgentContextType {
  type: "general" | "client" | "devis" | "facture" | "chantier";
  id?: string;
  label?: string;
  data?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

export interface UsageState {
  used:  number;
  limit: number;
  plan:  string;
}

interface AgentState {
  isOpen:           boolean;
  context:          AgentContextType | undefined;
  messages:         ChatMessage[];
  isLoading:        boolean;
  isLoadingHistory: boolean;
  historyLoaded:    boolean;
  error:            string | null;
  usage:            UsageState | null;
}

interface AgentActions {
  openAgent:     (ctx?: AgentContextType) => void;
  closeAgent:    () => void;
  sendMessage:   (content: string) => Promise<void>;
  clearMessages: () => void;
  refreshUsage:  () => Promise<void>;
}

const AgentCtx = createContext<(AgentState & AgentActions) | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function contextKey(ctx?: AgentContextType) {
  return `${ctx?.type ?? "general"}::${ctx?.id ?? ""}`;
}

async function loadHistory(ctx?: AgentContextType): Promise<ChatMessage[]> {
  const type = ctx?.type ?? "general";
  const id   = ctx?.id   ?? "";
  const params = new URLSearchParams({ type, id });
  try {
    const res = await fetch(`/api/agent/memory?${params}`);
    if (!res.ok) return [];
    const data = await res.json() as { messages: ChatMessage[] };
    return data.messages ?? [];
  } catch {
    return [];
  }
}

async function saveMessages(
  ctx: AgentContextType | undefined,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  if (!messages.length) return;
  try {
    await fetch("/api/agent/memory", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        contextType: ctx?.type ?? "general",
        contextId:   ctx?.id   ?? "",
        messages,
      }),
    });
  } catch {
    // Non-blocking — memory save failure doesn't break UX
  }
}

async function deleteHistory(ctx?: AgentContextType) {
  const type = ctx?.type ?? "general";
  const id   = ctx?.id   ?? "";
  try {
    await fetch(`/api/agent/memory?type=${type}&id=${id}`, { method: "DELETE" });
  } catch {}
}

async function fetchUsage(): Promise<UsageState | null> {
  try {
    const res = await fetch("/api/agent/usage");
    if (!res.ok) return null;
    return await res.json() as UsageState;
  } catch {
    return null;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AgentProvider({ children }: { children: ReactNode }) {
  const [isOpen,           setIsOpen]           = useState(false);
  const [context,          setContext]           = useState<AgentContextType | undefined>();
  const [messages,         setMessages]          = useState<ChatMessage[]>([]);
  const [isLoading,        setIsLoading]         = useState(false);
  const [isLoadingHistory, setIsLoadingHistory]  = useState(false);
  const [historyLoaded,    setHistoryLoaded]      = useState(false);
  const [error,            setError]             = useState<string | null>(null);
  const [usage,            setUsage]             = useState<UsageState | null>(null);

  const messagesRef = useRef<ChatMessage[]>([]);
  const contextRef  = useRef<AgentContextType | undefined>();

  messagesRef.current = messages;
  contextRef.current  = context;

  // Load history + usage whenever context changes and panel is open
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsLoadingHistory(true);
    setHistoryLoaded(false);

    Promise.all([loadHistory(context), fetchUsage()]).then(([hist, usageData]) => {
      if (cancelled) return;
      setMessages(hist);
      setHistoryLoaded(true);
      setIsLoadingHistory(false);
      if (usageData) setUsage(usageData);
    });

    return () => { cancelled = true; };
  }, [isOpen, context]);

  const openAgent = useCallback((ctx?: AgentContextType) => {
    setContext((prev) => {
      const same = contextKey(prev) === contextKey(ctx);
      if (!same) {
        setMessages([]);
        setHistoryLoaded(false);
      }
      return ctx;
    });
    setError(null);
    setIsOpen(true);
  }, []);

  const closeAgent = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearMessages = useCallback(async () => {
    await deleteHistory(contextRef.current);
    setMessages([]);
    setHistoryLoaded(false);
    setError(null);
  }, []);

  const refreshUsage = useCallback(async () => {
    const usageData = await fetchUsage();
    if (usageData) setUsage(usageData);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id:   `u-${Date.now()}`,
      role: "user",
      content: content.trim(),
    };
    const assistantPlaceholder: ChatMessage = {
      id:      `a-${Date.now()}`,
      role:    "assistant",
      content: "",
      pending: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsLoading(true);
    setError(null);

    const historyForApi = messagesRef.current
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, content: m.content }));
    historyForApi.push({ role: "user", content: content.trim() });

    let fullText = "";

    try {
      const res = await fetch("/api/agent/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages: historyForApi,
          context:  contextRef.current
            ? { type: contextRef.current.type, id: contextRef.current.id, label: contextRef.current.label, data: contextRef.current.data }
            : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        // Refresh usage on quota error so UI shows updated state
        if (res.status === 429) {
          const quotaErr = err as { error: string; quota?: UsageState };
          if (quotaErr.quota) setUsage(quotaErr.quota);
        }
        throw new Error((err as { error: string }).error || `HTTP ${res.status}`);
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        setMessages((prev) =>
          prev.map((m) => m.id === assistantPlaceholder.id ? { ...m, content: fullText, pending: true } : m)
        );
      }

      // Finalize
      setMessages((prev) =>
        prev.map((m) => m.id === assistantPlaceholder.id ? { ...m, content: fullText, pending: false } : m)
      );

      // Persist the new pair to DB (fire-and-forget)
      saveMessages(contextRef.current, [
        { role: "user",      content: content.trim() },
        { role: "assistant", content: fullText },
      ]);

      // Refresh usage counter in background
      fetchUsage().then((u) => { if (u) setUsage(u); });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantPlaceholder.id));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return (
    <AgentCtx.Provider value={{
      isOpen, context, messages, isLoading, isLoadingHistory, historyLoaded,
      error, usage, openAgent, closeAgent, sendMessage, clearMessages, refreshUsage,
    }}>
      {children}
    </AgentCtx.Provider>
  );
}

const NOOP_AGENT: AgentState & AgentActions = {
  isOpen:           false,
  context:          undefined,
  messages:         [],
  isLoading:        false,
  isLoadingHistory: false,
  historyLoaded:    false,
  error:            null,
  usage:            null,
  openAgent:        () => {},
  closeAgent:       () => {},
  sendMessage:      async () => {},
  clearMessages:    () => {},
  refreshUsage:     async () => {},
};

export function useAgent() {
  const ctx = useContext(AgentCtx);
  if (!ctx) {
    if (process.env.NODE_ENV === "development") {
      console.error("useAgent must be used inside AgentProvider");
    }
    return NOOP_AGENT;
  }
  return ctx;
}
