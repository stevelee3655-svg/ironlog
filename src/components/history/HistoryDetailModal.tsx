import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff, 
  Cloud 
} from 'lucide-react';
import { WorkoutSession } from '../../types/workout';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { 
  syncWorkoutToGoogleDrive, 
  copyMarkdownToClipboard, 
  downloadMarkdownFile 
} from '../../services/driveSync';
import { generateWorkoutMarkdown, previousTops } from '../../utils/markdownGenerator';

interface HistoryDetailModalProps {
  session: WorkoutSession;
  onClose: () => void;
}

export const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({ session, onClose }) => {
  const settings = useWorkoutStore(state => state.settings);
  const history = useWorkoutStore(state => state.history);
  const updateSessionSyncStatus = useWorkoutStore(state => state.updateSessionSyncStatus);
  const deleteHistorySession = useWorkoutStore(state => state.deleteHistorySession);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);

  const prevTops = previousTops(history, session.id);
  const markdown = generateWorkoutMarkdown(session, prevTops, history);

  const handleSync = async () => {
    if (!settings.gasWebhookUrl) {
      setSyncMsg('Google Apps Script URL이 설정되지 않았습니다.');
      return;
    }

    setIsSyncing(true);
    setSyncMsg(null);

    const res = await syncWorkoutToGoogleDrive(session, settings.gasWebhookUrl, settings.gasSharedSecret, prevTops, history);
    setIsSyncing(false);
    setSyncMsg(res.message || (res.success ? 'Google Drive 전송 완료' : '전송 실패'));

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

  const handleDelete = () => {
    if (confirm('이 운동 기록을 삭제하시겠습니까?')) {
      deleteHistorySession(session.id);
      onClose();
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
          className="flex items-start justify-between border-b pb-3"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className="space-y-0.5">
            <div className="text-xs font-bold opacity-60">
              {session.date} {session.condition && `· 컨디션: ${session.condition}`}
            </div>
            <h3 className="text-2xl font-bold">
              {session.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="tactile-btn p-1.5 opacity-60 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div 
            className="border rounded-2xl p-3"
            style={{ 
              backgroundColor: 'var(--card-soft-bg)', 
              borderColor: 'var(--card-border)' 
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase block">운동 시간</span>
            <span className="text-xl font-bold">{session.durationMinutes} <span className="text-xs font-normal opacity-50">분</span></span>
          </div>
          <div 
            className="border rounded-2xl p-3"
            style={{ 
              backgroundColor: 'var(--card-soft-bg)', 
              borderColor: 'var(--card-border)' 
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase block">총 볼륨</span>
            <span className="text-xl font-bold">{session.totalVolumeKg.toLocaleString()} <span className="text-xs font-normal opacity-50">kg</span></span>
          </div>
          <div 
            className="border rounded-2xl p-3"
            style={{ 
              backgroundColor: 'var(--card-soft-bg)', 
              borderColor: 'var(--card-border)' 
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase block">완료 세트</span>
            <span className="text-xl font-bold">{session.totalSets} <span className="text-xs font-normal opacity-50">세트</span></span>
          </div>
        </div>

        {/* Google Drive Status */}
        <div 
          className="rounded-2xl border p-3.5 flex items-center justify-between"
          style={{ 
            backgroundColor: 'var(--card-soft-bg)', 
            borderColor: 'var(--card-border)' 
          }}
        >
          <div>
            <div className="flex items-center space-x-1.5">
              <Cloud className="w-3.5 h-3.5 opacity-60" />
              <span className="text-xs font-bold block">
                Google Drive 백업
              </span>
            </div>
            <p className="font-mono text-[11px] opacity-60">
              {session.syncStatus === 'synced' ? 'Wiki/raw/건강/ 저장 완료' : '전송 대기 중'}
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="nike-btn-outline h-8 px-3 text-xs font-bold"
          >
            {isSyncing ? '전송 중...' : session.syncStatus === 'synced' ? '재전송' : '지금 전송'}
          </button>
        </div>

        {syncMsg && (
          <p className="text-xs text-center p-2 rounded-xl border bg-black/5">
            {syncMsg}
          </p>
        )}

        {/* Exercises Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold opacity-60 uppercase tracking-wider">
            운동별 상세 세트 ({session.exercises.length}개 종목)
          </h4>
          <div 
            className="space-y-2 max-h-60 overflow-y-auto pr-1 divide-y"
            style={{ borderColor: 'var(--card-border)' }}
          >
            {session.exercises.map((ex, idx) => (
              <div key={ex.id} className="pt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">
                    {idx + 1}. {ex.exerciseName}
                  </span>
                  <span className="text-xs opacity-60">
                    {ex.muscleGroup}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  {ex.sets.map(s => (
                    <span
                      key={s.id}
                      className="px-2.5 py-1 rounded-lg border font-medium font-mono"
                      style={{
                        backgroundColor: s.isCompleted ? 'var(--card-bg)' : 'var(--card-soft-bg)',
                        borderColor: 'var(--card-border)',
                        fontWeight: s.isCompleted ? 700 : 400
                      }}
                    >
                      {s.setNumber}세트: {s.weightKg}kg × {s.reps}회 {s.actualRir !== undefined ? `@RIR${s.actualRir}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleCopy}
            className="nike-btn-secondary text-xs flex items-center justify-center space-x-1.5 font-bold h-11"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? '복사 완료! ✅' : '마크다운 복사'}</span>
          </button>

          <button
            onClick={() => downloadMarkdownFile(session, prevTops)}
            className="nike-btn-secondary text-xs flex items-center justify-center space-x-1.5 font-bold h-11"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.md 파일 받기</span>
          </button>
        </div>

        {/* View Markdown Accordion */}
        <div 
          className="border rounded-2xl overflow-hidden"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <button
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs opacity-70 hover:opacity-100 transition-all font-bold"
          >
            <span className="flex items-center space-x-1.5">
              {showMarkdown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>생성된 마크다운 전문 확인</span>
            </span>
          </button>

          {showMarkdown && (
            <div 
              className="p-3 border-t"
              style={{ 
                backgroundColor: 'var(--card-soft-bg)', 
                borderColor: 'var(--card-border)' 
              }}
            >
              <pre className="text-[10px] font-mono opacity-80 leading-relaxed overflow-x-auto max-h-48 whitespace-pre select-text">
                {markdown}
              </pre>
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="tactile-btn w-full py-2.5 text-xs font-bold opacity-40 hover:opacity-100 hover:text-red-500 transition-colors flex items-center justify-center space-x-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>이 운동 기록 삭제</span>
        </button>

      </div>
    </div>
  );
};
