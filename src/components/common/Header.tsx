import React from 'react';
import { Settings as SettingsIcon, Palette } from 'lucide-react';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { AppTheme } from '../../types/workout';

interface HeaderProps {
  onOpenSettings: () => void;
  onNavigateToWorkout: () => void;
}

const THEMES: { id: AppTheme; label: string; dotColor: string }[] = [
  { id: 'stripe', label: 'Stripe', dotColor: '#533afd' },
  { id: 'nike', label: 'Nike', dotColor: '#111111' },
  { id: 'spacex', label: 'SpaceX', dotColor: '#00e5ff' },
  { id: 'claude', label: 'Claude', dotColor: '#cc785c' }
];

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onNavigateToWorkout }) => {
  const activeSession = useWorkoutStore(state => state.activeSession);
  const settings = useWorkoutStore(state => state.settings);
  const updateSettings = useWorkoutStore(state => state.updateSettings);

  const cycleTheme = () => {
    const currentTheme = settings.theme || 'stripe';
    const currentIndex = THEMES.findIndex(t => t.id === currentTheme);
    const nextTheme = THEMES[(currentIndex + 1) % THEMES.length].id;
    updateSettings({ theme: nextTheme });
  };

  const currentThemeObj = THEMES.find(t => t.id === (settings.theme || 'stripe')) || THEMES[0];

  const isStripe = (settings.theme || 'stripe') === 'stripe';

  return (
    <header 
      className="sticky top-0 z-30 backdrop-blur-xl border-b pt-safe transition-colors duration-200 relative"
      style={{ 
        backgroundColor: 'var(--header-bg)', 
        borderColor: 'var(--header-border)' 
      }}
    >
      {/*
        스트라이프에서 가장 먼저 알아보는 것은 위쪽을 가로지르는 그라디언트 띠다
        (크림 → 셔벗 → 라벤더 → 인디고 → 루비). 헤더 뒤에 깔고 아래로 흰 화면에 녹인다.
        pointer-events-none이라 아래 버튼을 가리지 않는다.
      */}
      {isStripe && (
        <div
          aria-hidden="true"
          className="stripe-mesh pointer-events-none absolute inset-x-0 top-0 h-full opacity-[0.22]"
        />
      )}
      <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
        
        {/* Simple & Clean Wordmark */}
        <div className="flex items-center space-x-2.5">
          <span 
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--canvas-text)' }}
          >
            IronLog
          </span>

          {/* Quick Theme Switcher Pill */}
          <button
            onClick={cycleTheme}
            className="tactile-btn flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold"
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--card-border)',
              color: 'var(--canvas-text)'
            }}
            title="테마 변경 (Nike / Stripe / SpaceX / Claude)"
          >
            <span 
              className="w-2 h-2 rounded-full shrink-0" 
              style={{ backgroundColor: currentThemeObj.dotColor }}
            />
            <span className="opacity-90">{currentThemeObj.label}</span>
          </button>
        </div>

        {/* Right Status */}
        <div className="flex items-center space-x-2">
          {activeSession && (
            <button
              onClick={onNavigateToWorkout}
              className="tactile-btn flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm"
              style={{ 
                backgroundColor: 'var(--primary-btn-bg)', 
                color: 'var(--primary-btn-text)' 
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>운동 중</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            aria-label="설정"
            className="tactile-btn w-9 h-9 rounded-full border flex items-center justify-center transition-colors"
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--card-border)',
              color: 'var(--canvas-text)'
            }}
          >
            <SettingsIcon className="w-4 h-4 opacity-80" />
          </button>
        </div>
      </div>
    </header>
  );
};
