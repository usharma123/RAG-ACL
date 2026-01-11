import React, { useEffect, useRef } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  logId?: string;
  feedback?: "yes" | "no";
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  quickStarts: string[];
  onQuickStart: (question: string) => void;
  onFeedback: (logId: string, helpful: boolean) => void;
  feedbackPending: Record<string, boolean>;
}

export function MessageList({
  messages,
  isLoading,
  quickStarts,
  onQuickStart,
  onFeedback,
  feedbackPending,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="message-list">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="12" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"/>
              <path d="M16 24h32M16 32h24M16 40h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              <circle cx="48" cy="44" r="12" fill="currentColor" opacity="0.1"/>
              <path d="M44 44l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Start a conversation</h3>
          <p>
            Ask questions about your documents. The AI will retrieve relevant
            information from sources you have access to.
          </p>
          {quickStarts.length > 0 && (
            <div className="quick-starts">
              <div className="quick-starts-title">Suggested questions</div>
              <div className="quick-starts-grid">
                {quickStarts.map((question, index) => (
                  <button
                    key={question}
                    type="button"
                    className="quick-start-button"
                    onClick={() => onQuickStart(question)}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="quick-start-icon">→</span>
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="message-list" ref={listRef}>
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.role}`}>
          <div className="message-label">
            {message.role === "user" ? "You" : "Assistant"}
          </div>
          <div className="message-bubble">{message.content}</div>
          {message.role === "assistant" && message.logId && (
            <div className="feedback-bar">
              {message.feedback ? (
                <span className="feedback-status">Feedback recorded.</span>
              ) : (
                <>
                  <span>Was this helpful?</span>
                  <div className="feedback-buttons">
                    <button
                      type="button"
                      className="feedback-button"
                      onClick={() => onFeedback(message.logId!, true)}
                      disabled={feedbackPending[message.logId]}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className="feedback-button secondary"
                      onClick={() => onFeedback(message.logId!, false)}
                      disabled={feedbackPending[message.logId]}
                    >
                      No
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="message assistant">
          <div className="message-label">Assistant</div>
          <div className="loading-indicator">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
