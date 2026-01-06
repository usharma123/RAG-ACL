import React, { useState, useCallback } from "react";
import { UserSelector, User, USERS } from "./UserSelector";
import { MessageList, Message } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { SourcePanel, SourceScore } from "./SourcePanel";

interface ChatResponse {
  answer: string;
  retrieved: Array<{ sourceKey: string; score: number }>;
}

export function Chat() {
  const [currentUser, setCurrentUser] = useState<User>(USERS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSources, setLastSources] = useState<SourceScore[]>([]);

  const sendMessage = useCallback(async (text: string) => {
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
          "x-user-id": currentUser.id,
        },
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
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setLastSources(
        data.retrieved.map((r) => ({
          sourceKey: r.sourceKey,
          score: r.score,
        }))
      );
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
  }, [currentUser.id, isLoading]);

  const handleUserChange = useCallback((user: User) => {
    setCurrentUser(user);
    setMessages([]);
    setLastSources([]);
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>RAG-ACL Chat</h1>
          <p>Secure document retrieval</p>
        </div>

        <div className="sidebar-section">
          <UserSelector
            currentUser={currentUser}
            onUserChange={handleUserChange}
          />
        </div>

        <SourcePanel sources={lastSources} />
      </aside>

      <main className="main-chat">
        <header className="chat-header">
          <h2>Chat with your documents</h2>
        </header>

        <MessageList messages={messages} isLoading={isLoading} />

        <MessageInput onSend={sendMessage} disabled={isLoading} />
      </main>
    </div>
  );
}
