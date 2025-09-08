"use client";

import { useState } from "react";
import { Settings, User, Check, X } from "lucide-react";
import { useUser } from "../contexts/UserContext";

export default function NameChangeButton() {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const { userName, setUserName } = useUser();

  const handleEdit = () => {
    setNewName(userName || "");
    setIsEditing(true);
    setError("");
  };

  const handleSave = () => {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      setError("Please enter a name");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters long");
      return;
    }

    if (trimmedName.length > 50) {
      setError("Name must be less than 50 characters");
      return;
    }

    setUserName(trimmedName);
    setIsEditing(false);
    setNewName("");
    setError("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewName("");
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 bg-[var(--card-bg)] rounded-lg p-2 border border-[var(--card-border)]">
        <User className="w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter your name"
          className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none text-sm"
          maxLength={50}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="p-1 text-green-600 hover:text-green-700 transition-colors"
          title="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-red-600 hover:text-red-700 transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
        {error && (
          <span className="text-[var(--error-text)] text-xs">{error}</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleEdit}
      className="flex items-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--input-hover)] rounded-lg p-2 border border-[var(--card-border)] transition-colors group"
      title={
        userName ? `Change name (currently: ${userName})` : "Set your name"
      }
    >
      <User className="w-4 h-4 text-[var(--text-muted)]" />
      <span className="text-sm text-[var(--text-primary)]">
        {userName ? userName : "Set Name"}
      </span>
    </button>
  );
}
