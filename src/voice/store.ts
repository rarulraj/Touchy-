import { create } from 'zustand';

interface VoiceStore {
  listening: boolean;
  heard: string;
  available: boolean;
  onFinal: ((text: string) => void) | null;
  setListening: (listening: boolean) => void;
  setHeard: (heard: string) => void;
  setAvailable: (available: boolean) => void;
  setOnFinal: (onFinal: ((text: string) => void) | null) => void;
  toggle: () => Promise<void>;
}

export const useVoice = create<VoiceStore>((set) => ({
  listening: false,
  heard: '',
  available: false,
  onFinal: null,
  setListening: (listening) => set({ listening }),
  setHeard: (heard) => set({ heard }),
  setAvailable: (available) => set({ available }),
  setOnFinal: (onFinal) => set({ onFinal }),
  toggle: async () => undefined,
}));
