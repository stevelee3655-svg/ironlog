import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { GAS_SCRIPT_CODE } from '../../services/driveSync';

interface GasScriptModalProps {
  onClose: () => void;
}

export const GasScriptModal: React.FC<GasScriptModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(GAS_SCRIPT_CODE);
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
          className="flex items-center justify-between border-b pb-3"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div>
            <div className="text-[10px] font-bold opacity-50 uppercase tracking-wider">
              GOOGLE DRIVE SYNC // GAS SCRIPT
            </div>
            <h3 className="text-2xl font-bold">
              Google Apps Script 연동 코드
            </h3>
          </div>

          <button
            onClick={onClose}
            className="tactile-btn p-1.5 opacity-60 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Guide */}
        <div 
          className="p-4 rounded-2xl border space-y-2.5 text-xs"
          style={{ 
            backgroundColor: 'var(--card-soft-bg)', 
            borderColor: 'var(--card-border)' 
          }}
        >
          <h4 className="font-bold text-xs">
            ⚡ 1분 간편 연동 가이드
          </h4>

          <ol className="space-y-2 list-decimal list-inside leading-relaxed opacity-80">
            <li>
              Google Drive (<a href="https://drive.google.com" target="_blank" rel="noreferrer" className="underline font-semibold inline-flex items-center">drive.google.com <ExternalLink className="w-2.5 h-2.5 ml-0.5" /></a>) 접속 → <strong>[새로 만들기] → [더보기] → [Google Apps Script]</strong>
            </li>
            <li>
              아래 스크립트 전체를 <strong>[코드 복사]</strong>하여 기본 코드를 대체하고, 스크립트 상단의 <code>SHARED_SECRET</code>에 비밀 문자열을 입력 후 저장 (<kbd className="bg-black/10 px-1 py-0.5 rounded">Ctrl+S</kbd>)
            </li>
            <li>
              <strong>[필수]</strong> 이 비밀 문자열을 스크립트와 앱 [설정] 양쪽에 똑같이 넣어야 인증이 완료됩니다.
            </li>
            <li>
              우측 상단 <strong>[배포] → [새 배포]</strong> → 유형: <strong>웹 앱 (Web App)</strong>
            </li>
            <li>
              설정: 다음 사용자로 실행: <strong>나 (Me)</strong> / 액세스 권한: <strong>모든 사용자 (Anyone)</strong>
            </li>
            <li>
              발급된 <strong>웹 앱 URL (`https://script.google.com/.../exec`)</strong>을 복사하여 IronLog [설정]에 등록
            </li>
          </ol>
        </div>

        {/* Code Snippet Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-60 font-semibold">Code.gs 소스 코드</span>
            <button
              onClick={handleCopy}
              className="nike-btn-outline h-8 px-3 text-xs flex items-center space-x-1 font-bold"
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사 완료! ✅' : '코드 복사'}</span>
            </button>
          </div>

          <pre 
            className="text-[10px] font-mono leading-relaxed p-4 rounded-2xl border overflow-x-auto max-h-56 select-text"
            style={{ 
              backgroundColor: 'var(--card-soft-bg)', 
              borderColor: 'var(--card-border)' 
            }}
          >
            {GAS_SCRIPT_CODE}
          </pre>
        </div>

      </div>
    </div>
  );
};
