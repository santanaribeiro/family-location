import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// Persistência manual (sem `zustand/middleware`, que traz `import.meta` e quebra o bundle web).
const STORAGE_KEY = 'family-location.chat-last-read';

interface ChatState {
  /** ISO da última mensagem lida, por família — só client-side (sem tabela nova). */
  lastRead: Record<string, string>;
  markRead: (familyId: string, timestampIso: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  lastRead: {},
  markRead: (familyId, timestampIso) => {
    const current = get().lastRead[familyId];
    if (current && current >= timestampIso) return;
    const next = { ...get().lastRead, [familyId]: timestampIso };
    set({ lastRead: next });
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
}));

// Hidrata do armazenamento local uma vez, ao carregar.
void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
  if (!saved) return;
  try {
    useChatStore.setState({ lastRead: JSON.parse(saved) });
  } catch {
    // ignora storage corrompido
  }
});
