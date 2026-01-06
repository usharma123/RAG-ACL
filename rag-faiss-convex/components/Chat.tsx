import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignIn } from "./SignIn";
import { UserPanel, User } from "./UserSelector";
import { MessageList, Message } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { SourcePanel, SourceHit } from "./SourcePanel";
import { SourceViewer, SourceDocument } from "./SourceViewer";
import { AdminPanel, BecomeAdminButton } from "./AdminPanel";

interface ChatResponse {
  answer: string;
  retrieved: SourceHit[];
  logId: string;
}

const BASE_SUGGESTIONS = [
  "What are the office hours?",
  "Where can I find the onboarding checklist?",
  "How do I request access to internal tools?",
];

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  engineer: [
    "Where is the incident response runbook?",
    "What is the deploy process?",
  ],
  finance: [
    "What is the reimbursement policy?",
    "What are the latest budget updates?",
  ],
  hr: [
    "What are the first week onboarding steps?",
    "Where are the benefits documents?",
  ],
};

const SOURCE_SUGGESTIONS: Record<string, string[]> = {
  gdrive: ["Summarize the Q1 budget notes.", "What is the hiring plan?"],
  confluence: [
    "Where is the onboarding runbook?",
    "What is the incident response process?",
  ],
  slack: ["Any recent deploy blockers?", "What did the finance team discuss?"],
  public: ["What are the office hours?"],
  finance: ["What is the reimbursement policy?"],
};

function buildSuggestions(user: User): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  const add = (items: string[] | undefined) => {
    if (!items) return;
    for (const item of items) {
      if (!seen.has(item)) {
        seen.add(item);
        suggestions.push(item);
      }
    }
  };

  add(BASE_SUGGESTIONS);
  add(ROLE_SUGGESTIONS[user.role]);
  for (const source of user.allowedSources) {
    add(SOURCE_SUGGESTIONS[source]);
  }

  return suggestions;
}

type View = "chat" | "admin";

function ChatContent() {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.currentUser);
  
  const [view, setView] = useState<View>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSources, setLastSources] = useState<SourceHit[]>([]);
  const [draft, setDraft] = useState("");
  const [feedbackPending, setFeedbackPending] = useState<Record<string, boolean>>({});
  const [activeSource, setActiveSource] = useState<SourceHit | null>(null);
  const [activeDoc, setActiveDoc] = useState<SourceDocument | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Convert Convex user to UI User type
  const user: User | null = currentUser
    ? {
        id: currentUser._id,
        email: currentUser.email || "",
        role: currentUser.role,
        allowedSources: currentUser.allowedSources,
      }
    : null;

  useEffect(() => {
    if (!activeSource) return;

    let cancelled = false;
    const fetchDoc = async () => {
      setDocLoading(true);
      setDocError(null);
      setActiveDoc(null);
      try {
        const response = await fetch(`/api/documents/${activeSource.docId}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Document fetch failed: ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setActiveDoc(data);
        }
      } catch (error) {
        console.error("Document load failed:", error);
        if (!cancelled) {
          setDocError("Unable to load the document section.");
        }
      } finally {
        if (!cancelled) {
          setDocLoading(false);
        }
      }
    };

    fetchDoc();

    return () => {
      cancelled = true;
    };
  }, [activeSource]);

  const suggestions = useMemo(() => (user ? buildSuggestions(user) : []), [user]);
  const quickStarts = useMemo(() => suggestions.slice(0, 4), [suggestions]);
  const askSuggestions = useMemo(() => suggestions.slice(0, 6), [suggestions]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setLastSources([]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ message: text }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: ChatResponse = await response.json();

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer,
          logId: data.logId,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setLastSources(data.retrieved || []);
      } catch (error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, there was an error processing your request. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
        console.error("Chat error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const handleQuickStart = useCallback((question: string) => {
    setDraft(question);
  }, []);

  const handleFeedback = useCallback(async (logId: string, helpful: boolean) => {
    if (!logId) return;
    setFeedbackPending((prev) => ({ ...prev, [logId]: true }));
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ logId, helpful }),
      });
      if (!response.ok) {
        throw new Error(`Feedback error: ${response.status}`);
      }
      setMessages((prev) =>
        prev.map((message) =>
          message.logId === logId
            ? { ...message, feedback: helpful ? "yes" : "no" }
            : message
        )
      );
    } catch (error) {
      console.error("Feedback submission failed:", error);
    } finally {
      setFeedbackPending((prev) => {
        const next = { ...prev };
        delete next[logId];
        return next;
      });
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const closeSourceViewer = useCallback(() => {
    setActiveSource(null);
    setActiveDoc(null);
    setDocError(null);
  }, []);

  // Still loading user data from Convex
  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>RAG-ACL</h1>
          <p>Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>RAG-ACL Chat</h1>
          <p>Secure document retrieval</p>
        </div>

        <div className="sidebar-section">
          <UserPanel user={user} onLogout={handleLogout} />
        </div>

        {/* Navigation tabs for admin */}
        {isAdmin && (
          <div className="sidebar-section">
            <div className="nav-tabs">
              <button
                className={`nav-tab ${view === "chat" ? "active" : ""}`}
                onClick={() => setView("chat")}
              >
                Chat
              </button>
              <button
                className={`nav-tab ${view === "admin" ? "active" : ""}`}
                onClick={() => setView("admin")}
              >
                Admin
              </button>
            </div>
          </div>
        )}

        {/* Become admin button for first user */}
        {!isAdmin && user.allowedSources.length === 0 && (
          <div className="sidebar-section">
            <BecomeAdminButton />
          </div>
        )}

        {view === "chat" && (
          <>
            <div className="sidebar-section">
              <div className="ask-panel">
                <h2>What can I ask?</h2>
                <div className="ask-list">
                  {askSuggestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="ask-item"
                      onClick={() => setDraft(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <SourcePanel sources={lastSources} onOpenSource={setActiveSource} />
          </>
        )}
      </aside>

      <main className="main-chat">
        {view === "chat" ? (
          <>
            <header className="chat-header">
              <h2>Chat with your documents</h2>
            </header>

            <MessageList
              messages={messages}
              isLoading={isLoading}
              quickStarts={quickStarts}
              onQuickStart={handleQuickStart}
              onFeedback={handleFeedback}
              feedbackPending={feedbackPending}
            />

            <MessageInput
              value={draft}
              onChange={setDraft}
              onSend={sendMessage}
              disabled={isLoading}
            />
          </>
        ) : (
          <AdminPanel />
        )}
      </main>

      {activeSource && (
        <SourceViewer
          hit={activeSource}
          document={activeDoc}
          loading={docLoading}
          error={docError}
          onClose={closeSourceViewer}
        />
      )}
    </div>
  );
}

export function Chat() {
  return (
    <>
      <AuthLoading>
        <div className="auth-screen">
          <div className="auth-card">
            <h1>RAG-ACL</h1>
            <p>Loading...</p>
          </div>
        </div>
      </AuthLoading>
      
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      
      <Authenticated>
        <ChatContent />
      </Authenticated>
    </>
  );
}
