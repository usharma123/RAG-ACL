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

function UserAvatar({ email }: { email: string }) {
  const initial = email.charAt(0).toUpperCase();
  return (
    <div className="user-avatar">
      {initial}
    </div>
  );
}

export function UserPanel({ user, onLogout }: UserPanelProps) {
  return (
    <div className="user-panel">
      <h2>Account</h2>
      <div className="user-info">
        <div className="user-profile">
          <UserAvatar email={user.email} />
          <div className="user-details">
            <div className="email">{user.email}</div>
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
          </div>
        </div>
        <div className="user-sources">
          <div className="sources-label">Document Access</div>
          <div className="sources-list-compact">
            {user.allowedSources.length > 0 ? (
              user.allowedSources.map((source) => (
                <span key={source} className="source-tag">
                  {source}
                </span>
              ))
            ) : (
              <span className="source-tag muted">No sources assigned</span>
            )}
          </div>
        </div>
        <button className="sign-out-button" type="button" onClick={onLogout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}
