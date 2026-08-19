import { create } from 'zustand';
import type { UserProfile, UserRole } from '@/types';
import { DEMO_ROLES } from '@/lib/auth/roles';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loginAsRole: (role: UserRole) => void;
  loginWithCredentials: (email: string, password: string) => { success: boolean; error?: string };
  switchRole: (role: UserRole) => void;
  logout: () => void;
}

const STORAGE_KEY = 'aroc_auth_user';

function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEMO_ROLES.supply_chain_manager.profile; // Default to Supply Chain Manager for seamless initial demo load
    return JSON.parse(raw);
  } catch {
    return DEMO_ROLES.supply_chain_manager.profile;
  }
}

const initialUser = getStoredUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,

  loginAsRole: (role: UserRole) => {
    const config = DEMO_ROLES[role];
    if (!config) return;
    const profile = config.profile;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    set({ user: profile, isAuthenticated: true });
  },

  loginWithCredentials: (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Find matching demo role
    const matchedRole = (Object.keys(DEMO_ROLES) as UserRole[]).find((key) => {
      const cfg = DEMO_ROLES[key];
      return cfg.demoCredentials.email.toLowerCase() === cleanEmail;
    });

    if (matchedRole) {
      const profile = DEMO_ROLES[matchedRole].profile;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      set({ user: profile, isAuthenticated: true });
      return { success: true };
    }

    // Generic fallback for any email entered in demo mode:
    // If password is provided, infer role or default to supply chain manager
    if (password.length >= 1) {
      let inferredRole: UserRole = 'supply_chain_manager';
      if (cleanEmail.includes('ops') || cleanEmail.includes('operation')) inferredRole = 'operations_manager';
      else if (cleanEmail.includes('ana') || cleanEmail.includes('data')) inferredRole = 'analyst';

      const base = DEMO_ROLES[inferredRole].profile;
      const customProfile: UserProfile = {
        ...base,
        id: `usr-custom-${Date.now().toString().slice(-4)}`,
        name: cleanEmail.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || base.name,
        email: cleanEmail,
        initials: (cleanEmail.slice(0, 2) || 'US').toUpperCase(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customProfile));
      set({ user: customProfile, isAuthenticated: true });
      return { success: true };
    }

    return { success: false, error: 'Please enter a valid password (e.g. password123)' };
  },

  switchRole: (role: UserRole) => {
    const config = DEMO_ROLES[role];
    if (!config) return;
    const profile = config.profile;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    set({ user: profile, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, isAuthenticated: false });
  },
}));
