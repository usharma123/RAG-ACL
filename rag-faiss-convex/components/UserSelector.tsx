import React from "react";

export interface User {
  id: string;
  email: string;
  role: string;
  allowedSources: string[];
}

interface UserPanelProps {
  user: User;
  onLogout: () => void;
}

export function UserPanel({ user, onLogout }: UserPanelProps) {
  return (
    <div className="user-panel">
      <h2>Current User</h2>
      <div className="user-info">
        <div className="email">{user.email}</div>
        <div className="role">Role: {user.role}</div>
        <div className="sources-label">Accessible Sources:</div>
        <div>
          {user.allowedSources.map((source) => (
            <span key={source} className="source-tag">
              {source}
            </span>
          ))}
          {user.allowedSources.length === 0 && (
            <span className="source-tag muted">none</span>
          )}
        </div>
        <button className="sign-out-button" type="button" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
