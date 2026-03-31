import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadData, saveHabits, saveEntries, saveAchievements, saveTimerSessions, saveSettings } from '../utils/storage';
import { Habit, Entry, Achievement, TimerSession, Settings } from '../types';
import { checkAchievements } from '../utils/achievements';
import { getStreak } from '../utils/streaks';

interface HabitContextType {
  habits: Habit[];
  entries: Entry[];
  achievements: Achievement[];
  timerSessions: TimerSession[];
  settings: Settings;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateHabit: (habit: Habit) => void;
  deleteHabit: (id: number) => void;
  archiveHabit: (id: number) => void;
  unarchiveHabit: (id: number) => void;
  toggleHabit: (habitId: number, date: string, completed: boolean, frozen?: boolean, note?: string, mood?: string) => void;
  addTimerSession: (habitId: number | null, duration: number) => void;
  updateSettings: (newSettings: Partial<Settings>) => void;
  refreshData: () => void;
}

const HabitContext = createContext<HabitContextType | undefined>(undefined);

export const HabitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [timerSessions, setTimerSessions] = useState<TimerSession[]>([]);
  const [settings, setSettings] = useState<Settings>({ accent: 'emerald', sound: true, onboarded: false });

  const load = async () => {
    const data = await loadData();
    setHabits(data.habits);
    setEntries(data.entries);
    setAchievements(data.achievements);
    setTimerSessions(data.timerSessions);

    // Validate accent color
    const validAccents: Settings['accent'][] = ['emerald', 'amber', 'rose', 'cyan', 'violet'];
    let accent: Settings['accent'] = validAccents.includes(data.settings.accent as any) ? data.settings.accent : 'emerald';
    const validatedSettings: Settings = {
      ...data.settings,
      accent,
    };
    setSettings(validatedSettings);
  };

  useEffect(() => {
    load();
  }, []);

  const refreshData = () => load();

  const addHabit = async (habitData: Omit<Habit, 'id' | 'createdAt'>) => {
    const newId = Math.max(0, ...habits.map(h => h.id)) + 1;
    const newHabit: Habit = { ...habitData, id: newId, createdAt: Date.now() };
    const newHabits = [...habits, newHabit];
    setHabits(newHabits);
    await saveHabits(newHabits);
    // Check achievements after adding
    const newAch = checkAchievements(newHabits, entries, timerSessions, achievements);
    if (newAch !== achievements) {
      setAchievements(newAch);
      await saveAchievements(newAch);
    }
  };

  const updateHabit = async (habit: Habit) => {
    const newHabits = habits.map(h => (h.id === habit.id ? habit : h));
    setHabits(newHabits);
    await saveHabits(newHabits);
  };

  const deleteHabit = async (id: number) => {
    const newHabits = habits.filter(h => h.id !== id);
    const newEntries = entries.filter(e => e.habitId !== id);
    setHabits(newHabits);
    setEntries(newEntries);
    await saveHabits(newHabits);
    await saveEntries(newEntries);
    // Recheck achievements
    const newAch = checkAchievements(newHabits, newEntries, timerSessions, achievements);
    if (newAch !== achievements) {
      setAchievements(newAch);
      await saveAchievements(newAch);
    }
  };

  const archiveHabit = async (id: number) => {
    const newHabits = habits.map(h => (h.id === id ? { ...h, archived: true } : h));
    setHabits(newHabits);
    await saveHabits(newHabits);
  };

  const unarchiveHabit = async (id: number) => {
    const newHabits = habits.map(h => (h.id === id ? { ...h, archived: false } : h));
    setHabits(newHabits);
    await saveHabits(newHabits);
  };

  const toggleHabit = async (habitId: number, date: string, completed: boolean, frozen = false, note = '', mood = '') => {
    const existingIndex = entries.findIndex(e => e.habitId === habitId && e.date === date);
    let newEntries = [...entries];
    if (completed) {
      if (existingIndex === -1) {
        const newId = Math.max(0, ...entries.map(e => e.id)) + 1;
        newEntries.push({ id: newId, habitId, date, completed: true, frozen, note, mood });
      } else {
        newEntries[existingIndex] = { ...newEntries[existingIndex], completed: true, frozen, note, mood };
      }
    } else {
      if (existingIndex !== -1) {
        newEntries.splice(existingIndex, 1);
      }
    }
    setEntries(newEntries);
    await saveEntries(newEntries);
    // Check achievements
    const newAch = checkAchievements(habits, newEntries, timerSessions, achievements);
    if (newAch !== achievements) {
      setAchievements(newAch);
      await saveAchievements(newAch);
    }
  };

  const addTimerSession = async (habitId: number | null, duration: number) => {
    const newId = Math.max(0, ...timerSessions.map(s => s.id)) + 1;
    const newSession: TimerSession = {
      id: newId,
      habitId,
      date: new Date().toISOString().slice(0, 10),
      duration,
    };
    const newSessions = [...timerSessions, newSession];
    setTimerSessions(newSessions);
    await saveTimerSessions(newSessions);
    // Check achievements
    const newAch = checkAchievements(habits, entries, newSessions, achievements);
    if (newAch !== achievements) {
      setAchievements(newAch);
      await saveAchievements(newAch);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);
  };

  return (
    <HabitContext.Provider
      value={{
        habits,
        entries,
        achievements,
        timerSessions,
        settings,
        addHabit,
        updateHabit,
        deleteHabit,
        archiveHabit,
        unarchiveHabit,
        toggleHabit,
        addTimerSession,
        updateSettings,
        refreshData,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
};

export const useHabits = () => {
  const context = useContext(HabitContext);
  if (!context) throw new Error('useHabits must be used within HabitProvider');
  return context;
};
