import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Copy, 
  Download, 
  Eye, 
  EyeOff, 
  ExternalLink 
} from 'lucide-react';
import { WorkoutSession } from '../../types/workout';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { 
  syncWorkoutToGoogleDrive, 
  copyMarkdownToClipboard, 
  downloadMarkdownFile 
} from '../../services/driveSync';
import { generateWorkoutMarkdown, getWorkoutFilename, previousTops } from '../../utils/markdownGenerator';

interface WorkoutSummaryModalProps {
  session: WorkoutSession;
  onClose: () => void;
  onNavigateToSettings: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  session,
  onClose,
  onNavigateToSettings
}) => {
  const settings = useWorkoutStore(state => state.settings);
  const history = useWorkoutStore(state => state.history);
  const updateSessionSyncStatus = useWorkoutStore(state => state.updateSessionSyncStatus);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const prevTops = previousTops(history, session.id);
  const markdownContent = generateWorkoutMarkdown(session, prevTops, history);
  const filename = getWorkoutFilename(session);

  useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    if (settings.gasWebhookUrl && settings.autoSyncOnFinish) {
      handleSync();
    }
  }, []);

  const handleSync = async () => {
    if (!settings.gasWebhookUrl) {
      setSyncResult({
        success: false,
        message: 'Google Apps Script Webhook URL이 설정되지 않았습니다.'
      });
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    const res = await syncWorkoutToGoogleDrive(session, settings.gasWebhookUrl, settings.gasSharedSecret, prevTops);
    setIsSyncing(false);
    setSyncResult({
      success: res.success,
      message: res.message || (res.success ? '저장 완료' : '저장 실패')
    });

    if (res.success) {
      updateSessionSyncStatus(session.id, 'synced');
    } else {
      updateSessionSyncStatus(session.id, 'failed', res.message);
    }
  };

  const handleCopy = async () => {
    const success = await copyMarkdownToClipboard(session, prevTops);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="border w-full max-w-lg rounded-3xl p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--card-border)',
          color: 'var(--canvas-text)'
        }}
      >
        
        {/* Header */}
        <div 
          className="space-y-1 border-b pb-4"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            오늘 운동 완료 👏
          </h2>
          <p className="text-xs opacity-60">
            수고하셨습니다. Jeff Nippard 점진적 과부하 분석과 함께 마크다운이 정리되었습니다.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div 
            className="border rounded-2xl p-3 text-center"
            style={{ 
              backgroundColor: 'var(--card-soft-bg)', 
              borderColor: 'var(--card-border)' 
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase block">
              소요 시간
            </span>
            <p className="text-2xl font-bold">
              {session.durationMinutes} <span className="text-xs font-normal opacity-50">분</span>
            </p>
          </div>

          <div 
            className="border rounded-2xl p-3 text-center"
            style={{ 
              backgroundColor: 'var(--card-soft-bg)', 
              borderColor: 'var(--card-border)' 
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase block">
              총 볼륨
            </span>
            <p className="text-2xl font-bold">
              {session.totalVolumeKg.toLocaleString()} <span className="text-xs font-normal opacity-50">kg</span>
            </p>
          </div>

          <div 
            className="border rounded-2xl p-3 text-center"
            style={{ 
              backgroundColor: 'var(--card-soft-bg)', 
              borderColor: 'var(--card-border)' 
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase block">
              완료 세트
            </span>
            <p className="text-2xl font-bold">
              {session.totalSets} <span className="text-xs font-normal opacity-50">세트</span>
            </p>
          </div>
        </div>

        {/* Google Drive Status Card */}
        <div 
          className="border rounded-2xl p-4 space-y-3"
          style={{ 
            backgroundColor: 'var(--card-soft-bg)', 
            borderColor: 'var(--card-border)' 
          }}
        >
          <div 
            className="flex items-center justify-between border-b pb-2"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <span className="text-xs font-bold">
              Google Drive 저장 현황
            </span>
            <span className="font-mono text-[11px] opacity-60">
              Wiki/raw/건강/
            </span>
          </div>

          {settings.gasWebhookUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] opacity-60 truncate max-w-[200px]">
                  {filename}
                </span>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="tactile-btn h-8 px-3 rounded-full text-xs font-bold shadow-sm"
                  style={{ 
                    backgroundColor: 'var(--primary-btn-bg)', 
                    color: 'var(--primary-btn-text)' 
                  }}
                >
                  {isSyncing ? '전송 중...' : syncResult?.success ? '다시 전송' : '지금 전송'}
                </button>
              </div>

              {syncResult && (
                <div className={`p-2.5 text-xs rounded-xl font-medium border ${
                  syncResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  <p>{syncResult.message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs opacity-60">
                Google Apps Script Webhook URL이 설정되지 않았습니다.
              </p>
              <button
                onClick={onNavigateToSettings}
                className="nike-btn-outline w-full text-xs font-bold flex items-center justify-center space-x-1"
              >
                <span>Google Drive Webhook 설정하기</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* Actions: Copy & Download */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleCopy}
            className="nike-btn-secondary text-xs flex items-center justify-center space-x-1.5 font-bold"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? '복사 완료! ✅' : '마크다운 복사'}</span>
          </button>

          <button
            onClick={() => downloadMarkdownFile(session, prevTops)}
            className="nike-btn-secondary text-xs flex items-center justify-center space-x-1.5 font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.md 파일 받기</span>
          </button>
        </div>

        {/* Markdown Preview Accordion */}
        <div 
          className="border rounded-2xl overflow-hidden"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs opacity-60 hover:opacity-100 transition-all font-bold"
          >
            <span className="flex items-center space-x-1.5">
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>생성된 마크다운 전문 미리보기</span>
            </span>
          </button>

          {showPreview && (
            <div 
              className="p-3 border-t"
              style={{ 
                backgroundColor: 'var(--card-soft-bg)', 
                borderColor: 'var(--card-border)' 
              }}
            >
              <pre className="text-[10px] font-mono opacity-80 leading-relaxed overflow-x-auto max-h-48 whitespace-pre select-text">
                {markdownContent}
              </pre>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="nike-btn-primary w-full shadow-lg"
        >
          확인 완료
        </button>

      </div>
    </div>
  );
};
