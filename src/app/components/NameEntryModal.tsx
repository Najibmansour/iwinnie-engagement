"use client";

import { useState, useEffect } from "react";
import { User, Heart } from "lucide-react";
import { useUser } from "../contexts/UserContext";

interface NameEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NameEntryModal({
  isOpen,
  onClose,
}: NameEntryModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { setUserName } = useUser();

  useEffect(() => {
    if (isOpen) {
      // Focus the input when modal opens
      const timer = setTimeout(() => {
        const input = document.getElementById("name-input");
        if (input) {
          input.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter your name");
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
    setName("");
    setError("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-[var(--card-bg)] rounded-2xl shadow-2xl p-8 max-w-md w-full border border-[var(--card-border)]"
        onKeyDown={handleKeyDown}
      >
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="font-better-saturday text-3xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
              Welcome!
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="Enter your name"
                className="w-full pl-10 pr-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
                maxLength={50}
                autoComplete="name"
              />
            </div>
            {error && (
              <p className="text-[var(--error-text)] text-sm mt-1">{error}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-lg font-medium hover:from-[var(--accent-hover)] hover:to-[var(--accent-secondary)] transition-all"
            >
              Continue
            </button>
          </div>
        </form>

        <p className="text-xs text-[var(--text-muted)] text-center mt-4">
          You can change your name anytime
        </p>
      </div>
    </div>
  );
}
