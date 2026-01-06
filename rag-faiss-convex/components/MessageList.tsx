import React, { useEffect, useRef } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
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
