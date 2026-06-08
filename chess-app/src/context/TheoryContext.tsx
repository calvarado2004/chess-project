import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { lessons, getLessonsByCategory, loadLocalProgress, saveLocalProgress } from '../data';
import type { TheoryLesson, TheoryProgress } from '../data/theory/types';
import api from '../lib/api';
import { getApiUrl } from '../lib/auth';

interface TheoryContextType {
  lessons: TheoryLesson[];
  currentLesson: TheoryLesson | null;
  setCurrentLesson: (lesson: TheoryLesson | null) => void;
  progress: Record<string, TheoryProgress>;
  updateProgress: (lessonId: string, updates: Partial<TheoryProgress>) => void;
  completeLesson: (lessonId: string) => void;
  getLessonsByCategory: (category: string) => TheoryLesson[];
  isLoading: boolean;
}

const TheoryContext = createContext<TheoryContextType | null>(null);

export function TheoryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken } = useAuth();
  const [currentLesson, setCurrentLesson] = useState<TheoryLesson | null>(null);
  const [progress, setProgress] = useState<Record<string, TheoryProgress>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load progress from localStorage on mount
  useEffect(() => {
    const local = loadLocalProgress();
    setProgress(local);
    setIsLoading(false);

    // If authenticated, also fetch from API and merge
    if (isAuthenticated && accessToken) {
      fetchApiProgress(local);
    }
  }, [isAuthenticated, accessToken]);

  async function fetchApiProgress(localProgress: Record<string, TheoryProgress>) {
    try {
      // Uses the shared api instance (resolves origin for native/remote and
      // attaches the JWT automatically) instead of a bare relative URL.
      const response = await api.get(getApiUrl('/theory/progress'));
      const apiProgress = response.data as TheoryProgress[];
      
      // Merge: API progress takes precedence for completed lessons
      const merged: Record<string, TheoryProgress> = { ...localProgress };
      for (const p of apiProgress) {
        if (p.completed || !localProgress[p.lessonId]) {
          merged[p.lessonId] = p;
        }
      }
      setProgress(merged);
      saveLocalProgress(merged);
    } catch {
      // Silently fail - use local progress
    }
  }

  const updateProgress = useCallback((lessonId: string, updates: Partial<TheoryProgress>) => {
    setProgress(prev => {
      const existing = prev[lessonId] || { lessonId, completed: false, lastPositionIndex: 0, exerciseScore: 0 };
      const updated = {
        ...prev,
        [lessonId]: { ...existing, ...updates },
      };
      saveLocalProgress(updated);

      // Sync to API if authenticated
      if (isAuthenticated && accessToken) {
        syncToApi(updated[lessonId]);
      }

      return updated;
    });
  }, [isAuthenticated, accessToken]);

  const completeLesson = useCallback((lessonId: string) => {
    updateProgress(lessonId, { completed: true, completedAt: new Date().toISOString() });
  }, [updateProgress]);

  async function syncToApi(entry: TheoryProgress) {
    try {
      // API expects a single progress object, not an array.
      // Uses the shared api instance so it works on native/remote too.
      await api.post(getApiUrl('/theory/progress'), entry);
    } catch {
      // Silently fail - progress is saved locally
    }
  }

  return (
    <TheoryContext.Provider value={{
      lessons,
      currentLesson,
      setCurrentLesson,
      progress,
      updateProgress,
      completeLesson,
      getLessonsByCategory,
      isLoading,
    }}>
      {children}
    </TheoryContext.Provider>
  );
}

export function useTheory() {
  const context = useContext(TheoryContext);
  if (!context) {
    throw new Error('useTheory must be used within a TheoryProvider');
  }
  return context;
}
