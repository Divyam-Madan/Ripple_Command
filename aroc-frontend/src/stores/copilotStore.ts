import { create } from 'zustand';
import { sendCopilotChat } from '@/lib/api/copilot';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls_made?: string[];
  fallback_mode?: boolean;
  timestamp: string;
  isError?: boolean;
}

interface CopilotStore {
  isOpen: boolean;
  isTyping: boolean;
  messages: ChatMessage[];
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  sendMessage: (content: string, userRole?: string) => Promise<void>;
  clearMessages: () => void;
}

const INITIAL_GREETING: ChatMessage = {
  id: 'msg-welcome-01',
  role: 'assistant',
  content: `### 🤖 AROC Neural Copilot Online
Powered by **OpenRouter & Live Digital Twin Intelligence**.

I'm here to answer doubts across the entire supply chain network, simulate disruptions in real time, query live consignments, and explain optimization concepts.

**Try asking me:**
- ⚡ *"What happens if Motherson Sumi (S03) is delayed 12h?"*
- 📦 *"Show me delayed shipments and risk levels"*
- 💰 *"How do we recover from the ₹57,00,000 financial exposure?"*
- 🧠 *"Explain how CP-SAT optimization works"*`,
  tool_calls_made: [],
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export const useCopilotStore = create<CopilotStore>((set, get) => ({
  isOpen: true, // Default open on right corner sidebar for immediate visibility
  isTyping: false,
  messages: [INITIAL_GREETING],

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),

  sendMessage: async (content: string, userRole?: string) => {
    const trimmed = content.trim();
    if (!trimmed || get().isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentMsgs = get().messages;
    set({
      messages: [...currentMsgs, userMsg],
      isTyping: true,
      isOpen: true, // Auto open if sending from prompt chips
    });

    try {
      const apiMessages = [...currentMsgs, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendCopilotChat({
        messages: apiMessages,
        user_role: userRole || 'supply_chain_manager',
      });

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: res.content,
        tool_calls_made: res.tool_calls_made || [],
        fallback_mode: res.fallback_mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isTyping: false,
      }));
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Connection Notice**: Could not complete real-time neural request (${err.message || 'Network issue'}). Please verify backend connection or retry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };

      set((state) => ({
        messages: [...state.messages, errorMsg],
        isTyping: false,
      }));
    }
  },

  clearMessages: () => set({ messages: [INITIAL_GREETING] }),
}));
