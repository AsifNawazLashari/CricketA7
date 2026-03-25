import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppUser, UserRole } from '../types';

interface InviteToken {
  token: string;
  role: UserRole;
  teamId?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  hasRole: (...roles: UserRole[]) => boolean;
  setRole: (role: UserRole) => void;
  signIn: (displayName: string, role: UserRole, teamId?: string) => void;
  signOut: () => void;
  isOrganizer: () => boolean;
  isCaptain: () => boolean;
  generateToken: (role: UserRole, teamId?: string) => string;
  validateToken: (token: string) => InviteToken | null;
  pendingTokens: InviteToken[];
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  hasRole: () => false,
  setRole: () => {},
  signIn: () => {},
  signOut: () => {},
  isOrganizer: () => false,
  isCaptain: () => false,
  generateToken: () => '',
  validateToken: () => null,
  pendingTokens: [],
});

// Simple in-memory token store
const tokenStore: Map<string, InviteToken> = new Map();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [pendingTokens, setPendingTokens] = useState<InviteToken[]>([]);

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const setRole = (role: UserRole) => {
    setUser((prev) => prev ? { ...prev, role } : prev);
  };

  const signIn = (displayName: string, role: UserRole, teamId?: string) => {
    setUser({
      uid: `user-${Date.now()}`,
      email: `${displayName.toLowerCase().replace(/\s+/g, '.')}@cricket.app`,
      displayName,
      role,
      teamId,
    });
  };

  const signOut = () => setUser(null);

  const isOrganizer = () => hasRole('developer', 'organizer');
  const isCaptain = () => hasRole('captain');

  const generateToken = (role: UserRole, teamId?: string): string => {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const invite: InviteToken = { token, role, teamId };
    tokenStore.set(token, invite);
    setPendingTokens((prev) => [...prev, invite]);
    return token;
  };

  const validateToken = (token: string): InviteToken | null => {
    const invite = tokenStore.get(token.toUpperCase());
    if (invite) {
      tokenStore.delete(token.toUpperCase());
      setPendingTokens((prev) => prev.filter((t) => t.token !== token));
      return invite;
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ user, hasRole, setRole, signIn, signOut, isOrganizer, isCaptain, generateToken, validateToken, pendingTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
