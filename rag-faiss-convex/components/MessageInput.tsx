import React from "react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled: boolean;
}

export function MessageInput({ value, onChange, onSend, disabled }: MessageInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
      onChange("");
    }
  };

  return (
    <div className="message-input-container">
      <form className="message-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask a question about your documents..."
          disabled={disabled}
          autoFocus
        />
        <button type="submit" disabled={disabled || !value.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
