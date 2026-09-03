import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// Persistência manual (sem `zustand/middleware`, que traz `import.meta` e quebra o bundle web).
const STORAGE_KEY = 'family-location.active-family';

interface FamilyState {
  /** Família selecionada no app (persistida entre sessões). */
  activeFamilyId: string | null;
  setActiveFamily: (id: string | null) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  activeFamilyId: null,
  setActiveFamily: (id) => {
    set({ activeFamilyId: id });
    void (id ? AsyncStorage.setItem(STORAGE_KEY, id) : AsyncStorage.removeItem(STORAGE_KEY));
  },
}));

// Hidrata a família ativa do armazenamento local uma vez, ao carregar.
void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
  if (saved) useFamilyStore.setState({ activeFamilyId: saved });
});
