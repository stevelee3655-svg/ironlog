import { WorkoutSession, SyncResponse } from '../types/workout';
import { generateWorkoutMarkdown, getWorkoutFilename, TopSet } from '../utils/markdownGenerator';
import { localDateKey } from '../utils/date';

export const GAS_SCRIPT_CODE = `/**
 * IronLog -> Google Drive (Wiki/raw/건강/) 자동 동기화 Webhook
 * 
 * [배포 방법]
 * 1. Google Drive에서 [새로 만들기] -> [더보기] -> [Google Apps Script] 클릭
 * 2. 기존 코드를 모두 지우고 이 스크립트 전체를 붙여넣기
 * 3. SHARED_SECRET 상수에 원하는 임의의 비밀 문자열을 입력
 * 4. 오른쪽 상단 [배포] -> [새 배포] 클릭
 * 5. 유형 선택: [웹 앱] 선택
 * 6. 설정:
 *    - 설명: IronLog Webhook
 *    - 다음 사용자로 실행: [나 (내 계정)]
 *    - 액세스 권한: [모든 사용자 (Anyone)] <- 필수!
 * 7. [배포] 클릭 후 승인(액세스 허용) 진행
 * 8. 생성된 '웹 앱 URL' 및 '공유 비밀키'를 IronLog 앱 [설정] 탭에 똑같이 입력!
 */

// [필수] 아무 문자열이나 길게 지어 넣으세요. 앱 설정에도 같은 값을 넣습니다.
const SHARED_SECRET = "여기에_긴_임의_문자열을_넣으세요";
const FOLDER_PATH = "Wiki/raw/건강"; // 고정 경로 (요청 본문에서 받지 않음)

function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    if (!SHARED_SECRET || payload.secret !== SHARED_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "인증 실패: 공유 비밀키(secret)가 일치하지 않습니다."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const filename = payload.filename || ("운동_" + Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd") + ".md");
    const content = payload.content || "";

    // 폴더 경로 탐색 및 자동 생성 (Wiki -> raw -> 건강)
    const parts = FOLDER_PATH.split("/");
    let currentFolder = DriveApp.getRootFolder();

    for (let i = 0; i < parts.length; i++) {
      const partName = parts[i].trim();
      if (!partName) continue;
      
      const folders = currentFolder.getFoldersByName(partName);
      if (folders.hasNext()) {
        currentFolder = folders.next();
      } else {
        currentFolder = currentFolder.createFolder(partName);
      }
    }

    // 기존 동명 파일이 있으면 덮어쓰고, 없으면 새로 생성
    const existingFiles = currentFolder.getFilesByName(filename);
    let targetFile;
    if (existingFiles.hasNext()) {
      targetFile = existingFiles.next();
      targetFile.setContent(content);
    } else {
      targetFile = currentFolder.createFile(filename, content, MimeType.PLAIN_TEXT);
    }

    const response = {
      success: true,
      filename: filename,
      folder: currentFolder.getName(),
      fileUrl: targetFile.getUrl(),
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResponse = {
      success: false,
      message: error.toString(),
      timestamp: new Date().toISOString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "IronLog Google Drive Sync Webhook",
    message: "POST 요청을 통해 운동 기록을 전송하세요."
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

export async function syncWorkoutToGoogleDrive(
  session: WorkoutSession,
  webhookUrl: string,
  sharedSecret: string = '',
  prevTops: Record<string, TopSet> = {}
): Promise<SyncResponse> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return {
      success: false,
      message: 'Google Apps Script Webhook URL이 설정되지 않았습니다. [설정] 탭에서 URL을 등록해주세요.'
    };
  }

  const filename = getWorkoutFilename(session);
  const markdownContent = generateWorkoutMarkdown(session, prevTops);

  const payload = {
    action: 'save_workout',
    secret: sharedSecret,
    filename,
    content: markdownContent,
    metadata: {
      sessionId: session.id,
      date: session.date,
      totalVolumeKg: session.totalVolumeKg,
      totalSets: session.totalSets,
      targetMuscles: session.targetMuscles,
      durationMinutes: session.durationMinutes
    }
  };

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP 에러 발생 (${response.status} ${response.statusText})`);
    }

    const resJson = await response.json().catch(async () => {
      const text = await response.text();
      return { success: true, message: text };
    });

    if (resJson.success === false) {
      throw new Error(resJson.message || 'Google Drive 저장 실패');
    }

    return {
      success: true,
      filename,
      message: `성공적으로 'Wiki/raw/건강/${filename}'에 저장되었습니다.`,
      timestamp: new Date().toISOString()
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : '알 수 없는 네트워크 오류';
    return {
      success: false,
      filename,
      message: `전송 실패: ${errMsg}`
    };
  }
}

export async function testGasWebhookConnection(webhookUrl: string, sharedSecret: string = ''): Promise<SyncResponse> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'URL이 비어 있습니다.' };
  }

  try {
    const testSession: WorkoutSession = {
      id: 'test-ping',
      title: '연결 테스트',
      date: localDateKey(),
      startTime: new Date().toISOString(),
      durationMinutes: 1,
      exercises: [],
      totalVolumeKg: 0,
      totalSets: 0,
      targetMuscles: ['테스트'],
      syncStatus: 'pending'
    };

    const res = await syncWorkoutToGoogleDrive(testSession, webhookUrl, sharedSecret);
    return res;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : '연결 실패';
    return { success: false, message: errMsg };
  }
}

export async function copyMarkdownToClipboard(
  session: WorkoutSession,
  prevTops: Record<string, TopSet> = {}
): Promise<boolean> {
  try {
    const md = generateWorkoutMarkdown(session, prevTops);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(md);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = md;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch {
    return false;
  }
}

export function downloadMarkdownFile(
  session: WorkoutSession,
  prevTops: Record<string, TopSet> = {}
): void {
  const md = generateWorkoutMarkdown(session, prevTops);
  const filename = getWorkoutFilename(session);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
