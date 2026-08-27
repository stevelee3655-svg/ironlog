import React, { useState } from 'react';
import { 
  Palette, 
  Download, 
  Upload 
} from 'lucide-react';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { AppTheme } from '../../types/workout';
import { testGasWebhookConnection } from '../../services/driveSync';
import { GasScriptModal } from './GasScriptModal';

const THEME_OPTIONS: { 
  id: AppTheme; 
  name: string; 
  desc: string; 
  primaryColor: string; 
  bgPreview: string; 
  textColor: string;
}[] = [
  { 
    id: 'nike', 
    name: 'Nike Minimal', 
    desc: '모던 흑백 & 깔끔한 여백 미학', 
    primaryColor: '#111111', 
    bgPreview: '#ffffff',
    textColor: '#111111'
  },
  { 
    id: 'stripe', 
    name: 'Stripe Indigo', 
    desc: '일렉트릭 인디고 & 정교한 핀테크 감성', 
    primaryColor: '#533afd', 
    bgPreview: '#f6f9fc',
    textColor: '#0d253d'
  },
  { 
    id: 'spacex', 
    name: 'SpaceX Cockpit', 
    desc: '스텔스 블랙 & 네온 사이안 HUD', 
    primaryColor: '#00e5ff', 
    bgPreview: '#000000',
    textColor: '#ffffff'
  },
  { 
    id: 'claude', 
    name: 'Claude Editorial', 
    desc: '따뜻한 테라코타 & 크림 페이퍼 에디토리얼', 
    primaryColor: '#cc785c', 
    bgPreview: '#faf9f5',
    textColor: '#141413'
  }
];

export const SettingsView: React.FC = () => {
  const settings = useWorkoutStore(state => state.settings);
  const updateSettings = useWorkoutStore(state => state.updateSettings);
  const exercises = useWorkoutStore(state => state.exercises);
  const routines = useWorkoutStore(state => state.routines);
  const history = useWorkoutStore(state => state.history);

  const [webhookUrlInput, setWebhookUrlInput] = useState(settings.gasWebhookUrl || '');
  const [sharedSecretInput, setSharedSecretInput] = useState(settings.gasSharedSecret || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveWebhook = () => {
    updateSettings({ 
      gasWebhookUrl: webhookUrlInput.trim(),
      gasSharedSecret: sharedSecretInput.trim()
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!webhookUrlInput.trim()) {
      setTestResult({ success: false, message: 'URL을 먼저 입력해주세요.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGasWebhookConnection(webhookUrlInput.trim(), sharedSecretInput.trim());
    setIsTesting(false);
    setTestResult({
      success: res.success,
      message: res.success ? '연결 성공! Google Drive에 테스트 파일이 정상 생성되었습니다.' : `연결 실패: ${res.message}`
    });

    if (res.success) {
      updateSettings({ 
        gasWebhookUrl: webhookUrlInput.trim(),
        gasSharedSecret: sharedSecretInput.trim()
      });
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exercises,
      routines,
      history,
      settings
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IronLog_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('백업 파일을 복원하시겠습니까?')) {
          if (data.exercises) localStorage.setItem('ironlog_state_v1', JSON.stringify(data));
          window.location.reload();
        }
      } catch {
        alert('올바르지 않은 백업 파일 형식입니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-28 pt-4">
      {/* Header */}
      <div 
        className="border-b pb-4"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className="text-[11px] font-bold opacity-50 uppercase tracking-wider">
          SETTINGS
        </div>
        <h2 className="text-3xl font-bold tracking-tight uppercase">
          앱 설정
        </h2>
      </div>

      {/* 0. 4-Way Visual Theme Selector */}
      <div 
        className="p-5 rounded-2xl space-y-4 border shadow-sm"
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--card-border)' 
        }}
      >
        <div className="flex items-center space-x-2 border-b pb-2.5" style={{ borderColor: 'var(--card-border)' }}>
          <Palette className="w-4 h-4 opacity-70" />
          <h3 className="font-bold text-base">
            디자인 테마 선택
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {THEME_OPTIONS.map(th => {
            const isSelected = (settings.theme || 'nike') === th.id;
            return (
              <button
                key={th.id}
                onClick={() => updateSettings({ theme: th.id })}
                className="tactile-card p-3 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all relative overflow-hidden"
                style={{
                  backgroundColor: th.bgPreview,
                  borderColor: isSelected ? th.primaryColor : 'var(--card-border)',
                  borderWidth: isSelected ? '2px' : '1px',
                  color: th.textColor
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span 
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-white/40 shadow-sm" 
                    style={{ backgroundColor: th.primaryColor }}
                  />
                  {isSelected && (
                    <span 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-black"
                      style={{ backgroundColor: th.primaryColor }}
                    >
                      ✓
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-sm leading-tight">{th.name}</h4>
                  <p className="text-[10px] opacity-70 pt-0.5 leading-tight">{th.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Google Drive Webhook */}
      <div 
        className="p-5 rounded-2xl space-y-4 border shadow-sm"
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--card-border)' 
        }}
      >
        <div 
          className="flex items-center justify-between border-b pb-3"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div>
            <h3 className="font-bold text-base">
              Google Drive 자동 동기화
            </h3>
            <p className="font-mono text-[11px] opacity-60">저장 위치: Wiki/raw/건강/</p>
          </div>

          <button
            onClick={() => setIsScriptModalOpen(true)}
            className="nike-btn-outline h-8 px-3 text-xs font-bold"
          >
            스크립트 보기
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold block opacity-80">
            Google Apps Script 웹 앱 URL
          </label>
          <input
            type="url"
            value={webhookUrlInput}
            onChange={e => setWebhookUrlInput(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full border rounded-xl p-3 font-mono text-xs focus:outline-none"
            style={{ 
              backgroundColor: 'var(--input-bg)', 
              borderColor: 'var(--input-border)',
              color: 'var(--input-text)'
            }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold block opacity-80">
            공유 비밀키 (Shared Secret)
          </label>
          <input
            type="password"
            value={sharedSecretInput}
            onChange={e => setSharedSecretInput(e.target.value)}
            placeholder="스크립트의 SHARED_SECRET과 일치해야 합니다"
            className="w-full border rounded-xl p-3 font-mono text-xs focus:outline-none"
            style={{ 
              backgroundColor: 'var(--input-bg)', 
              borderColor: 'var(--input-border)',
              color: 'var(--input-text)'
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleSaveWebhook}
            className="nike-btn-primary h-11 text-xs font-bold shadow-sm"
          >
            {isSaved ? '저장 완료! ✅' : '설정 저장'}
          </button>

          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="nike-btn-outline h-11 text-xs font-bold"
          >
            {isTesting ? '테스트 중...' : '연결 테스트'}
          </button>
        </div>

        {testResult && (
          <div className={`p-3 text-xs rounded-xl font-medium ${
            testResult.success 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <p>{testResult.message}</p>
          </div>
        )}
      </div>

      {/* 2. Timer & Audio Preferences */}
      <div 
        className="p-5 rounded-2xl space-y-4 border shadow-sm"
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--card-border)' 
        }}
      >
        <h3 
          className="font-bold text-base border-b pb-2"
          style={{ borderColor: 'var(--card-border)' }}
        >
          휴식 타이머 & 알림
        </h3>

        <div 
          className="space-y-3.5 divide-y text-xs"
          style={{ borderColor: 'var(--card-border)' }}
        >
          {/* Auto Start */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="font-bold">세트 완료 시 타이머 자동 시작</p>
              <p className="text-[11px] opacity-60">체크를 누르면 휴식 시간 자동 카운트다운</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoStartTimer}
              onChange={e => updateSettings({ autoStartTimer: e.target.checked })}
              className="w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {/* Default Rest */}
          <div className="flex items-center justify-between pt-3.5">
            <div>
              <p className="font-bold">기본 휴식 시간</p>
              <p className="text-[11px] opacity-60">운동별 지정이 없을 때 기본 적용</p>
            </div>
            <div className="flex space-x-1.5">
              {[60, 90, 150, 210].map(sec => {
                const isSelected = settings.defaultRestSeconds === sec;
                return (
                  <button
                    key={sec}
                    onClick={() => updateSettings({ defaultRestSeconds: sec })}
                    className="tactile-btn px-3 py-1.5 text-xs font-bold rounded-full border transition-all"
                    style={{
                      backgroundColor: isSelected ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)',
                      borderColor: 'var(--card-border)',
                      color: isSelected ? 'var(--primary-btn-text)' : 'var(--canvas-text)'
                    }}
                  >
                    {sec === 210 ? '3분30초' : sec === 150 ? '2분30초' : `${sec}초`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between pt-3.5">
            <div>
              <p className="font-bold">사운드 효과</p>
              <p className="text-[11px] opacity-60">타이머 종료 및 세트 완료 사운드</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableSound}
              onChange={e => updateSettings({ enableSound: e.target.checked })}
              className="w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between pt-3.5">
            <div>
              <p className="font-bold">햅틱 진동</p>
              <p className="text-[11px] opacity-60">모바일 진동 알림</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableVibration}
              onChange={e => updateSettings({ enableVibration: e.target.checked })}
              className="w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {/* Auto Sync on Finish */}
          <div className="flex items-center justify-between pt-3.5">
            <div>
              <p className="font-bold">운동 완료 시 자동 전송</p>
              <p className="text-[11px] opacity-60">완료 버튼을 누르면 구글 드라이브로 즉시 전송</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSyncOnFinish}
              onChange={e => updateSettings({ autoSyncOnFinish: e.target.checked })}
              className="w-4 h-4 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Backup & Restore */}
      <div 
        className="p-5 rounded-2xl space-y-3 border shadow-sm"
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--card-border)' 
        }}
      >
        <h3 className="font-bold text-base">
          데이터 백업 & 복원
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleExportBackup}
            className="nike-btn-outline h-10 text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            <span>백업 다운로드</span>
          </button>

          <label className="nike-btn-outline h-10 text-xs font-bold cursor-pointer flex items-center justify-center">
            <Upload className="w-3.5 h-3.5 mr-1" />
            <span>백업 불러오기</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs opacity-50 space-y-0.5 pt-2">
        <p className="font-bold">IronLog</p>
        <p className="text-[11px]">The Muscle Ladder Intelligence Edition</p>
      </div>

      {isScriptModalOpen && (
        <GasScriptModal onClose={() => setIsScriptModalOpen(false)} />
      )}
    </div>
  );
};
