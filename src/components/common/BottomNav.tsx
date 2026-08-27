import React from 'react';
import { Dumbbell, Layers, BookOpen, History, Settings } from 'lucide-react';
import { useWorkoutStore } from '../../store/useWorkoutStore';

export type NavTab = 'workout' | 'routines' | 'exercises' | 'history' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const activeSession = useWorkoutStore(state => state.activeSession);

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    {
      id: 'workout',
      label: '운동',
      icon: <Dumbbell className="w-5 h-5" />,
      badge: !!activeSession
    },
    {
      id: 'routines',
      label: '루틴',
      icon: <Layers className="w-5 h-5" />
    },
    {
      id: 'exercises',
      label: '종목',
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      id: 'history',
      label: '기록',
      icon: <History className="w-5 h-5" />
    },
    {
      id: 'settings',
      label: '설정',
      icon: <Settings className="w-5 h-5" />
    }
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl border-t pb-safe transition-colors duration-200"
      style={{ 
        backgroundColor: 'var(--nav-bg)', 
        borderColor: 'var(--nav-border)' 
      }}
    >
      <div className="max-w-lg mx-auto grid grid-cols-5 h-16 px-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`tactile-btn relative flex flex-col items-center justify-center space-y-1 transition-all ${
                isActive ? 'font-bold scale-105' : 'opacity-40 hover:opacity-80'
              }`}
              style={{ color: 'var(--canvas-text)' }}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && (
                  <span 
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white" 
                    style={{ backgroundColor: 'var(--primary-btn-bg)' }}
                  />
                )}
              </div>
              <span className="text-[11px] tracking-tight font-medium">
                {tab.label}
              </span>
              {isActive && (
                <span 
                  className="absolute bottom-1 w-5 h-[2.5px] rounded-full" 
                  style={{ backgroundColor: 'var(--primary-btn-bg)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
