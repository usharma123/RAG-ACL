import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface UserRowProps {
  user: {
    _id: Id<"users">;
    email?: string;
    role: string;
    allowedSources: string[];
    tenantId: string;
  };
  availableSources: string[];
  availableRoles: string[];
  onUpdate: () => void;
}

function UserRow({ user, availableSources, availableRoles, onUpdate }: UserRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [selectedSources, setSelectedSources] = useState<string[]>(user.allowedSources);
  const [saving, setSaving] = useState(false);

  const updateUser = useMutation(api.users.updateUser);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({
        userId: user._id,
        role: selectedRole,
        allowedSources: selectedSources,
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to update user:", error);
      alert("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedRole(user.role);
    setSelectedSources(user.allowedSources);
    setIsEditing(false);
  };

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  if (isEditing) {
    return (
      <tr className="admin-user-row editing">
        <td>{user.email || "(no email)"}</td>
        <td>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="admin-select"
          >
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </td>
        <td>
          <div className="source-checkboxes">
            {availableSources.map((source) => (
              <label key={source} className="source-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source)}
                  onChange={() => toggleSource(source)}
                />
                {source}
              </label>
            ))}
          </div>
        </td>
        <td>
          <div className="admin-actions">
            <button
              className="admin-btn save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="admin-btn cancel"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="admin-user-row">
      <td>{user.email || "(no email)"}</td>
      <td>
        <span className={`role-badge role-${user.role}`}>{user.role}</span>
      </td>
      <td>
        <div className="source-tags">
          {user.allowedSources.length > 0 ? (
            user.allowedSources.map((source) => (
              <span key={source} className="source-tag">
                {source}
              </span>
            ))
          ) : (
            <span className="source-tag muted">none</span>
          )}
        </div>
      </td>
      <td>
        <button className="admin-btn edit" onClick={() => setIsEditing(true)}>
          Edit
        </button>
      </td>
    </tr>
  );
}

export function AdminPanel() {
  const users = useQuery(api.users.listAll);
  const availableSources = useQuery(api.users.getAvailableSources);
  const availableRoles = useQuery(api.users.getAvailableRoles);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpdate = () => {
    setRefreshKey((k) => k + 1);
  };

  if (users === undefined || availableSources === undefined || availableRoles === undefined) {
    return (
      <div className="admin-panel">
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="admin-panel">
        <div className="admin-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="24" cy="16" r="8" opacity="0.5"/>
            <path d="M8 44v-4c0-6.627 7.163-12 16-12s16 5.373 16 12v4" opacity="0.5"/>
          </svg>
          <p>No users found or you don't have admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2>User Management</h2>
            <p>Manage user roles and document access permissions</p>
          </div>
        </div>
        <div className="admin-stats">
          <span className="admin-stat">{users.length} users</span>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Allowed Sources</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow
                key={user._id + refreshKey}
                user={user}
                availableSources={availableSources}
                availableRoles={availableRoles}
                onUpdate={handleUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-footer">
        <p className="admin-hint">
          Users can only access documents from their allowed sources.
        </p>
      </div>
    </div>
  );
}

// Component to become admin (for first user setup)
export function BecomeAdminButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const makeFirstAdmin = useMutation(api.users.makeFirstAdmin);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await makeFirstAdmin();
      setSuccess(true);
      // Reload to reflect new role
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to become admin");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <div className="admin-success">You are now an admin!</div>;
  }

  return (
    <div className="become-admin">
      <p>No admin exists yet. You can become the first admin:</p>
      <button
        className="admin-btn primary"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Processing..." : "Become Admin"}
      </button>
      {error && <div className="admin-error">{error}</div>}
    </div>
  );
}
