import React from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  sources: string[];
}

export const USERS: User[] = [
  {
    id: "jd79cqpj3th23bqt841hwr7rnx7yqms8",
    name: "Alice",
    email: "alice@acme.com",
    sources: ["gdrive", "confluence", "slack"],
  },
  {
    id: "jd7c1y3vwx246mamqs2rarry2h7ypzpd",
    name: "Bob",
    email: "bob@acme.com",
    sources: ["gdrive"],
  },
];

interface UserSelectorProps {
  currentUser: User;
  onUserChange: (user: User) => void;
}

export function UserSelector({ currentUser, onUserChange }: UserSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const user = USERS.find((u) => u.id === e.target.value);
    if (user) {
      onUserChange(user);
    }
  };

  return (
    <div className="user-selector">
      <h2>Current User</h2>
      <select value={currentUser.id} onChange={handleChange}>
        {USERS.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>

      <div className="user-info">
        <div className="email">{currentUser.email}</div>
        <div className="sources-label">Accessible Sources:</div>
        <div>
          {currentUser.sources.map((source) => (
            <span key={source} className="source-tag">
              {source}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
