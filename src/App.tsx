import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { BottomNav, NavTab } from './components/common/BottomNav';
import { ActiveWorkoutView } from './components/workout/ActiveWorkoutView';
import { RoutineManager } from './components/routines/RoutineManager';
import { ExerciseManager } from './components/exercises/ExerciseManager';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { RestTimerBar } from './components/workout/RestTimerBar';
import { useWorkoutStore } from './store/useWorkoutStore';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('workout');
  const startRoutineSession = useWorkoutStore(state => state.startRoutineSession);
  const settings = useWorkoutStore(state => state.settings);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'nike');
  }, [settings.theme]);

  // TASKS.md 5: Auto-flush pending syncs on mount and when coming back online
  useEffect(() => {
    const flush = useWorkoutStore.getState().flushPendingSyncs;
    flush();
    const onOnline = () => { flush(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const handleStartRoutine = (routineId: string) => {
    startRoutineSession(routineId);
    setActiveTab('workout');
  };

  return (
    <div 
      data-theme={settings.theme || 'nike'}
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: 'var(--canvas-bg)', color: 'var(--canvas-text)' }}
    >
      {/* Top Header */}
      <Header
        onOpenSettings={() => setActiveTab('settings')}
        onNavigateToWorkout={() => setActiveTab('workout')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto px-5">
        {activeTab === 'workout' && (
          <ActiveWorkoutView
            onNavigateToRoutines={() => setActiveTab('routines')}
            onNavigateToExercises={() => setActiveTab('exercises')}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'routines' && (
          <RoutineManager onStartRoutine={handleStartRoutine} />
        )}

        {activeTab === 'exercises' && (
          <ExerciseManager />
        )}

        {activeTab === 'history' && (
          <HistoryView />
        )}

        {activeTab === 'settings' && (
          <SettingsView />
        )}
      </main>

      {/* Floating Rest Timer */}
      <RestTimerBar />

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
};

export default App;
