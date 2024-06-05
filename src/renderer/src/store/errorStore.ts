import { create } from 'zustand';

interface ErrorStore {
  messages: { timestamp: string; message: string }[];
  code?: number;
  pending: boolean;
  postError: (message: string, code?: number) => void;
  acknowledge: () => void;
}

const useErrorStore = create<ErrorStore>((set) => ({
  messages: [],
  code: 0,
  pending: false,
  postError: (message, code = 0) => {
    const d = new Date();
    const stamp =
      d.getUTCHours().toString().padStart(2, '0') +
      d.getUTCMinutes().toString().padStart(2, '0') +
      'Z';
    set((state) => ({
      messages: [...state.messages, { timestamp: stamp, message }],
      code,
      pending: true
    }));
  },
  acknowledge: () => {
    set({ messages: [], code: 0, pending: false });
  }
}));

export default useErrorStore;
