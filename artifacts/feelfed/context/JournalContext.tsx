import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  journalRepository, sampleJournal,
  type Appointment, type Entry, type JournalSnapshot, type Settings,
} from '@/lib/journal-repository';

type JournalContextValue = JournalSnapshot & {
  ready: boolean;
  error: string | null;
  retry: () => Promise<void>;
  addEntry: (input: Omit<Entry, 'id' | 'createdAt'>) => Promise<Entry>;
  updateEntry: (entry: Entry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  saveAppointment: (value: Appointment | null) => Promise<void>;
  saveQuestions: (value: string[]) => Promise<void>;
  loadSample: () => Promise<void>;
  clearSample: () => Promise<void>;
  deleteAll: () => Promise<void>;
};
const JournalContext = createContext<JournalContextValue | null>(null);

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<JournalSnapshot>({
    entries: [],
    settings: { onboarded: false, name: '', reminders: false, ambientAnimation: true },
    appointment: null, questions: [],
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setSnapshot(await journalRepository.read());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open this device journal.');
    } finally { setReady(true); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const perform = async (action: () => Promise<void>) => {
    try {
      await action();
      await reload();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The journal could not be saved.';
      setError(message);
      throw cause;
    }
  };
  const value: JournalContextValue = {
    ...snapshot, ready, error, retry: reload,
    async addEntry(input) {
      const entry: Entry = {
        ...input,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        createdAt: new Date().toISOString(),
      };
      await perform(() => journalRepository.putEntry(entry));
      return entry;
    },
    async updateEntry(entry) { await perform(() => journalRepository.putEntry(entry)); },
    async deleteEntry(id) { await perform(() => journalRepository.removeEntry(id)); },
    async saveSettings(patch) {
      await perform(() => journalRepository.setSettings({ ...snapshot.settings, ...patch }));
    },
    async saveAppointment(appointment) { await perform(() => journalRepository.setAppointment(appointment)); },
    async saveQuestions(questions) { await perform(() => journalRepository.setQuestions(questions)); },
    async loadSample() {
      await perform(async () => {
        for (const entry of sampleJournal()) await journalRepository.putEntry(entry);
      });
    },
    async clearSample() { await perform(() => journalRepository.removeSamples()); },
    async deleteAll() { await perform(() => journalRepository.clear()); },
  };
  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export function useJournal() {
  const context = useContext(JournalContext);
  if (!context) throw new Error('useJournal must be used inside JournalProvider');
  return context;
}