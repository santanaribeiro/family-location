import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FamilyState {
  /** Família selecionada no app (persistida entre sessões). */
  activeFamilyId: string | null;
  setActiveFamily: (id: string | null) => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      activeFamilyId: null,
      setActiveFamily: (id) => set({ activeFamilyId: id }),
    }),
    {
      name: 'family-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
