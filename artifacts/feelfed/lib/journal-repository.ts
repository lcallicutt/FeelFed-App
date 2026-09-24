import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

export type EntryKind = 'moment' | 'ate' | 'drink' | 'energy' | 'moved' | 'note' | 'followup';
export type Entry = {
  id: string;
  createdAt: string;
  kind: EntryKind;
  note?: string;
  fullness?: number;
  energy?: number;
  hydration?: number;
  what?: string;
  texture?: string;
  portion?: string;
  fullnessBefore?: number;
  fullnessAfter?: number;
  symptoms?: string[];
  photoUri?: string;
  drinkType?: string;
  amount?: string;
  contexts?: string[];
  activity?: string;
  duration?: number;
  effort?: string;
  energyBefore?: number;
  energyAfter?: number;
  status?: string;
  reasons?: string[];
  mealId?: string;
  sample?: boolean;
  notificationId?: string;
};
export type Settings = { onboarded: boolean; name: string; reminders: boolean; ambientAnimation: boolean };
export type Appointment = { date: string; label?: string; lastVisit?: string };
export type JournalSnapshot = {
  entries: Entry[];
  settings: Settings;
  appointment: Appointment | null;
  questions: string[];
};

const defaults: JournalSnapshot = {
  entries: [],
  settings: { onboarded: false, name: '', reminders: false, ambientAnimation: true },
  appointment: null,
  questions: [],
};

export interface JournalRepository {
  read(): Promise<JournalSnapshot>;
  putEntry(entry: Entry): Promise<void>;
  removeEntry(id: string): Promise<void>;
  setSettings(settings: Settings): Promise<void>;
  setAppointment(appointment: Appointment | null): Promise<void>;
  setQuestions(questions: string[]): Promise<void>;
  removeSamples(): Promise<void>;
  clear(): Promise<void>;
}

const storageKey = 'feelfed-device-journal-v1';
const webRepository: JournalRepository = {
  async read() {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return { ...defaults, entries: [], questions: [] };
    const value = JSON.parse(raw) as Partial<JournalSnapshot>;
    return { ...defaults, ...value, settings: { ...defaults.settings, ...value.settings } };
  },
  async putEntry(entry) {
    const data = await this.read();
    data.entries = [entry, ...data.entries.filter(item => item.id !== entry.id)];
    await AsyncStorage.setItem(storageKey, JSON.stringify(data));
  },
  async removeEntry(id) {
    const data = await this.read();
    data.entries = data.entries.filter(item => item.id !== id && item.mealId !== id);
    await AsyncStorage.setItem(storageKey, JSON.stringify(data));
  },
  async setSettings(settings) {
    const data = await this.read();
    data.settings = settings;
    await AsyncStorage.setItem(storageKey, JSON.stringify(data));
  },
  async setAppointment(appointment) {
    const data = await this.read();
    data.appointment = appointment;
    await AsyncStorage.setItem(storageKey, JSON.stringify(data));
  },
  async setQuestions(questions) {
    const data = await this.read();
    data.questions = questions;
    await AsyncStorage.setItem(storageKey, JSON.stringify(data));
  },
  async removeSamples() {
    const data = await this.read();
    data.entries = data.entries.filter(item => !item.sample);
    await AsyncStorage.setItem(storageKey, JSON.stringify(data));
  },
  async clear() {
    await AsyncStorage.removeItem(storageKey);
  },
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | undefined;
async function database() {
  dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync('feelfed.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, sample INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS entries_by_date ON entries(created_at DESC);
      CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    return db;
  })();
  return dbPromise;
}
async function preference<T>(key: string, fallback: T): Promise<T> {
  const row = await (await database()).getFirstAsync<{ value: string }>('SELECT value FROM preferences WHERE key = ?', key);
  return row ? JSON.parse(row.value) as T : fallback;
}
async function savePreference(key: string, value: unknown) {
  await (await database()).runAsync(
    'INSERT INTO preferences(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    key, JSON.stringify(value),
  );
}
const nativeRepository: JournalRepository = {
  async read() {
    const rows = await (await database()).getAllAsync<{ data: string }>('SELECT data FROM entries ORDER BY created_at DESC');
    const [settings, appointment, questions] = await Promise.all([
      preference('settings', defaults.settings),
      preference<Appointment | null>('appointment', null),
      preference<string[]>('questions', []),
    ]);
    return { entries: rows.map(row => JSON.parse(row.data) as Entry), settings, appointment, questions };
  },
  async putEntry(entry) {
    await (await database()).runAsync(
      'INSERT INTO entries(id,created_at,sample,data) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET created_at=excluded.created_at,sample=excluded.sample,data=excluded.data',
      entry.id, entry.createdAt, entry.sample ? 1 : 0, JSON.stringify(entry),
    );
  },
  async removeEntry(id) {
    const db = await database();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM entries WHERE id = ?', id);
      const rows = await db.getAllAsync<{ id: string; data: string }>('SELECT id,data FROM entries');
      for (const row of rows) {
        if ((JSON.parse(row.data) as Entry).mealId === id) await db.runAsync('DELETE FROM entries WHERE id = ?', row.id);
      }
    });
  },
  setSettings: settings => savePreference('settings', settings),
  setAppointment: appointment => savePreference('appointment', appointment),
  setQuestions: questions => savePreference('questions', questions),
  async removeSamples() { await (await database()).runAsync('DELETE FROM entries WHERE sample = 1'); },
  async clear() {
    const db = await database();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM entries');
      await db.runAsync('DELETE FROM preferences');
    });
  },
};

export const journalRepository: JournalRepository = Platform.OS === 'web' ? webRepository : nativeRepository;

export function sampleJournal(): Entry[] {
  const result: Entry[] = [];
  for (let day = 13; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(8, 40, 0, 0);
    const stamp = (hour: number) => {
      const at = new Date(date);
      at.setHours(hour, day % 3 === 0 ? 20 : 45);
      return at.toISOString();
    };
    result.push({
      id: `sample-ate-${day}`, createdAt: stamp(12), kind: 'ate', sample: true,
      what: ['Oatmeal', 'Soup', 'Toast and eggs', 'Rice and vegetables'][day % 4],
      texture: ['Soft', 'Liquid', 'Solid', 'Solid'][day % 4],
      portion: ['A few bites', 'About a quarter', 'About half', 'About three quarters'][day % 4],
      fullnessBefore: 2 + day % 3, fullnessAfter: 5 + day % 4,
      symptoms: day % 4 === 0 ? ['Full'] : day % 5 === 0 ? ['Tired'] : ['Comfortable'],
    });
    result.push({
      id: `sample-drink-${day}`, createdAt: stamp(15), kind: 'drink', sample: true,
      drinkType: day % 3 === 0 ? 'Smoothie' : 'Water', amount: day % 2 === 0 ? 'Half a glass' : 'A few sips',
    });
    result.push({
      id: `sample-moment-${day}`, createdAt: stamp(18), kind: 'moment', sample: true,
      fullness: 3 + day % 6, energy: 2 + day % 6, hydration: 3 + day % 5,
    });
    if (day % 3 === 0) result.push({
      id: `sample-moved-${day}`, createdAt: stamp(10), kind: 'moved', sample: true,
      activity: day % 2 === 0 ? 'Walking' : 'Stretching', duration: 10 + day,
      effort: 'Easy', energyBefore: 3, energyAfter: 4, status: 'Completed',
    });
  }
  return result;
}