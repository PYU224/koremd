import { ref } from 'vue';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  category: string;
  message: string;
  data?: any;
}

// グローバルなログストレージ
const logEntries = ref<LogEntry[]>([]);
const isLogging = ref(true);
const maxLogEntries = 1000; // メモリ節約のため上限を設定

/**
 * デバッグログ管理用のComposable
 */
export function useDebugLogger() {
  /**
   * ログエントリを追加
   */
  const addLog = (
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any
  ) => {
    if (!isLogging.value) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };

    logEntries.value.push(entry);

    // コンソールにも出力（開発時用）
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    }[level];

    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`${emoji} [${category}] ${message}`, data || '');

    // 上限を超えたら古いログを削除
    if (logEntries.value.length > maxLogEntries) {
      logEntries.value = logEntries.value.slice(-maxLogEntries);
    }
  };

  /**
   * ログをフォーマットされたテキストとして取得
   */
  const getFormattedLogs = (): string => {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timestamp: new Date().toISOString()
    };

    let output = '=== WiFi Direct Debug Log ===\n';
    output += `Generated: ${deviceInfo.timestamp}\n`;
    output += `Device: ${deviceInfo.userAgent}\n`;
    output += `Platform: ${deviceInfo.platform}\n`;
    output += `Screen: ${deviceInfo.screenResolution}\n`;
    output += `Language: ${deviceInfo.language}\n`;
    output += `Total Entries: ${logEntries.value.length}\n`;
    output += '='.repeat(60) + '\n\n';

    logEntries.value.forEach((entry, index) => {
      const time = new Date(entry.timestamp).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      });

      output += `[${index + 1}] ${time} [${entry.level.toUpperCase()}] [${entry.category}]\n`;
      output += `    ${entry.message}\n`;
      
      if (entry.data) {
        output += `    Data: ${entry.data}\n`;
      }
      
      output += '\n';
    });

    return output;
  };

  /**
   * ログをファイルとして保存して共有
   */
  const exportLogs = async (): Promise<void> => {
    try {
      const formattedLogs = getFormattedLogs();
      const fileName = `wifi-direct-debug-${Date.now()}.txt`;

      // ファイルに書き込み
      const result = await Filesystem.writeFile({
        path: fileName,
        data: formattedLogs,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      addLog('info', 'Logger', `Log file created: ${fileName}`, { path: result.uri });

      // Share APIで共有
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: 'WiFi Direct Debug Log',
          text: 'デバッグログをエクスポートしました',
          url: result.uri,
          dialogTitle: 'ログを共有'
        });

        addLog('info', 'Logger', 'Log file shared successfully');
      } else {
        addLog('warning', 'Logger', 'Share API not available on this device');
        
        // Share APIが使えない場合は、ファイルの場所を通知
        alert(`ログファイルが作成されました:\n${result.uri}\n\nファイルマネージャーから手動で共有してください。`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog('error', 'Logger', `Failed to export logs: ${errorMessage}`, { error });
      throw error;
    }
  };

  /**
   * ログをクリア
   */
  const clearLogs = () => {
    logEntries.value = [];
    addLog('info', 'Logger', 'Logs cleared');
  };

  /**
   * ログ記録の有効/無効を切り替え
   */
  const toggleLogging = (enabled: boolean) => {
    isLogging.value = enabled;
    addLog('info', 'Logger', `Logging ${enabled ? 'enabled' : 'disabled'}`);
  };

  /**
   * 統計情報を取得
   */
  const getStats = () => {
    const stats = {
      total: logEntries.value.length,
      byLevel: {
        debug: 0,
        info: 0,
        warning: 0,
        error: 0
      },
      byCategory: {} as Record<string, number>
    };

    logEntries.value.forEach(entry => {
      stats.byLevel[entry.level]++;
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
    });

    return stats;
  };

  return {
    logEntries,
    isLogging,
    addLog,
    exportLogs,
    clearLogs,
    toggleLogging,
    getStats,
    getFormattedLogs
  };
}
