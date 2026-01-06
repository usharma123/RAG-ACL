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
          <h3>Start a conversation</h3>
          <p>
            Ask questions about your documents. The AI will only use information
            from sources you have access to.
          </p>
          {quickStarts.length > 0 && (
            <div className="quick-starts">
              <div className="quick-starts-title">Quick start questions</div>
              <div className="quick-starts-grid">
                {quickStarts.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="quick-start-button"
                    onClick={() => onQuickStart(question)}
                  >
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
