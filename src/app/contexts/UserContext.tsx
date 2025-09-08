"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface UserContextType {
  userName: string | null;
  setUserName: (name: string) => void;
  clearUserName: () => void;
  hasEnteredName: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [hasEnteredName, setHasEnteredName] = useState(false);

  useEffect(() => {
    // Check for saved user name in localStorage
    const savedName = localStorage.getItem("userName");
    if (savedName) {
      setUserNameState(savedName);
      setHasEnteredName(true);
    }
  }, []);

  const setUserName = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      setUserNameState(trimmedName);
      setHasEnteredName(true);
      localStorage.setItem("userName", trimmedName);
    }
  };

  const clearUserName = () => {
    setUserNameState(null);
    setHasEnteredName(false);
    localStorage.removeItem("userName");
  };

  return (
    <UserContext.Provider
      value={{ userName, setUserName, clearUserName, hasEnteredName }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
