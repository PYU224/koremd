import { ref, onUnmounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { toastController, alertController } from '@ionic/vue';
import { WifiDirect } from '@/plugins/wifi-direct';
import type { 
  WifiP2pDevice, 
} from '@/plugins/wifi-direct/definitions';
import { useDebugLogger } from '@/composables/useDebugLogger'; // ✅ 追加
import { useI18n } from 'vue-i18n';

interface ShareProgress {
  status: 'idle' | 'discovering' | 'connecting' | 'transferring' | 'complete' | 'error';
  message: string;
  progress?: number;
  bytesTransferred?: number;
  totalBytes?: number;
}

interface EventLog {
  time: string;
  type: 'info' | 'success' | 'error' | 'warning';
  icon: string;
  message: string;
}

export function useWifiDirectShare() {
  const { t } = useI18n(); // ✅ 追加
  
  // ✅ デバッグロガーを初期化
  const debugLogger = useDebugLogger();
  
  const isSharing = ref(false);
  const peers = ref<WifiP2pDevice[]>([]);
  const isConnected = ref(false);
  const isGroupOwner = ref(false);
  const groupOwnerAddress = ref<string | null>(null);
  const error = ref<string | null>(null);
  const progress = ref<ShareProgress>({ status: 'idle', message: '' });
  const eventLog = ref<EventLog[]>([]);
  const currentMode = ref<'send' | 'receive' | null>(null); // ✅ 修正: デフォルトをnullに
  const isServerStarting = ref(false); // ✅ 追加: サーバー起動中フラグ

  const listeners: any[] = [];

  // ✅ 既存のaddLogを残しつつ、詳細ログも記録
  function addLog(type: EventLog['type'], message: string, data?: any) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };

    eventLog.value.push({
      time,
      type,
      icon: icons[type],
      message
    });

    // 最新50件のみ保持
    if (eventLog.value.length > 50) {
      eventLog.value = eventLog.value.slice(-50);
    }

    // ✅ 詳細ログも記録（ファイル出力用）
    const logLevel = type === 'success' ? 'info' : type;
    debugLogger.addLog(logLevel, 'WiFiDirect', message, data);
  }

  // 利用可能かチェック
  async function checkAvailability(): Promise<boolean> {
    return Capacitor.getPlatform() === 'android';
  }

  // 権限アラートを表示
  async function showPermissionAlert() {
    alertController.create({
       header: t('nearbyShare.systemMessages.permissionRequired'),
       message: t('nearbyShare.systemMessages.permissionMessage'),
       buttons: ['OK']
    });
    await alert.present();
  }

  // イベントリスナーをセットアップ
  function setupListeners() {
    // ピア変更イベント
    const peersListener = WifiDirect.addListener('peersChanged', (data) => {
      console.log('🔍 peersChanged event received:', data);
      debugLogger.addLog('debug', 'WiFiDirect', 'peersChanged event received', data);
      
      // 空配列の場合は既存のピアを保持
      if (data.peers && data.peers.length > 0) {
        peers.value = data.peers;
        addLog('info', t('nearbyShare.systemMessages.devicesFound', { count: data.peers.length }), { peerCount: data.peers.length, peers: data.peers });
        console.log('✅ Peers found:', data.peers);
      } else {
        // 空配列の場合は無視（既存のピアを保持）
        console.log('⚠️ Empty peers array received, keeping existing peers:', peers.value.length);
        debugLogger.addLog('warning', 'WiFiDirect', 'Empty peers array received', { existingPeers: peers.value.length });
      }
    });
    listeners.push(peersListener);

    // 接続変更イベント
    let isProcessingConnection = false; // ✅ 追加: 重複処理を防ぐフラグ
    let hasShownRoleAlert = false; // ✅ 追加: 役割変更アラートの重複表示を防ぐ
    
    const connectionListener = WifiDirect.addListener('connectionChanged', async (data) => {
      // ✅ 詳細ログ
      debugLogger.addLog('debug', 'WiFiDirect', 'connectionChanged event received', data);
      
      // ✅ 追加: すでに処理中の場合はスキップ（多重発火対策）
      if (isProcessingConnection && data.groupFormed) {
        console.log('⏭️ Connection event already being processed, skipping duplicate');
        debugLogger.addLog('info', 'WiFiDirect', 'Skipping duplicate connectionChanged event');
        return;
      }

      if (data.groupFormed) {
        isProcessingConnection = true; // ✅ 処理開始
      }

      isConnected.value = data.groupFormed;
      isGroupOwner.value = data.isGroupOwner;
      groupOwnerAddress.value = data.groupOwnerAddress;

      if (data.groupFormed) {
        // ✅ 修正: 役割が期待と異なる場合でも接続を維持し、currentModeを実際の役割に更新
        const actualMode: 'send' | 'receive' = data.isGroupOwner ? 'receive' : 'send';
        const expectedMode: 'send' | 'receive' = currentMode.value || 'send'; // ✅ nullの場合のデフォルト
        
        if (expectedMode !== actualMode) {
          console.log(`⚠️ Role switched! Expected: ${expectedMode}, Actual: ${actualMode}`);
            const modeText = t(`nearbyShare.systemMessages.${actualMode}Mode`);
            addLog('warning', t('nearbyShare.systemMessages.roleAdjusted', { mode: modeText }), {
            expected: expectedMode,
            actual: actualMode,
            isGroupOwner: data.isGroupOwner,
            groupOwnerAddress: data.groupOwnerAddress
          }); // ✅ データ追加
          
          // ✅ 重要: currentModeを実際の役割に更新
          currentMode.value = actualMode;
          
          // ✅ 修正: アラートの重複表示を防ぐ
          if (!hasShownRoleAlert) {
            hasShownRoleAlert = true;
            const modeText = t(`nearbyShare.systemMessages.${actualMode}Mode`);
            await alertController.create({
              header: t('nearbyShare.systemMessages.roleAdjustedTitle'),
              message: t('nearbyShare.systemMessages.roleAdjustedMessage', { mode: modeText }),
              buttons: ['OK']
            });
            await alert.present();
          }
        } else {
          addLog('success', t('nearbyShare.systemMessages.connectionEstablished'), {
            mode: actualMode,
            isGroupOwner: data.isGroupOwner,
            groupOwnerAddress: data.groupOwnerAddress
          }); // ✅ データ追加
        }

        progress.value = { 
          status: 'transferring', 
          message: t('nearbyShare.systemMessages.connectionEstablished') 
        };

        if (data.isGroupOwner) {
          // Group Owner: ファイル受信の準備
          if (isServerStarting.value) {
            console.log('⚠️ Server is already starting, skipping');
            isProcessingConnection = false; // ✅ 処理完了
            return;
          }
          
          console.log('This device is Group Owner, starting file server');
          addLog('info', t('nearbyShare.systemMessages.receivingMode'));
          
          // サーバー起動
          setTimeout(async () => {
            await startReceiving();
            isProcessingConnection = false; // ✅ 処理完了
          }, 200);
        } else {
          // Client: 送信準備完了
          console.log('Connected as client to:', data.groupOwnerAddress);
          addLog('success', t('nearbyShare.systemMessages.sendingMode', { address: data.groupOwnerAddress }));
          
          isProcessingConnection = false; // ✅ 処理完了
        }

        const toast = await toastController.create({
          message: data.isGroupOwner ? 
            'ファイルを受信できる状態です' : 
            'ファイルを送信できる状態です',
          duration: 2000,
          position: 'bottom'
        });
        await toast.present();
      } else {
        addLog('warning', t('nearbyShare.systemMessages.connectionDisconnected'));
        progress.value = {
          status: 'idle',
          message: t('nearbyShare.systemMessages.connectionDisconnected')
        };
        isProcessingConnection = false; // ✅ リセット
        hasShownRoleAlert = false; // ✅ リセット
      }
    });
    listeners.push(connectionListener);

    // 転送進捗イベント
    const progressListener = WifiDirect.addListener('transferProgress', (data) => {
      const percent = Math.round(data.progress * 100);
      progress.value = {
        status: 'transferring',
        message: t('nearbyShare.systemMessages.transferring', { percent }),
        bytesTransferred: data.bytesTransferred,
        totalBytes: data.totalBytes,
        progress: data.progress
      };
    });
    listeners.push(progressListener);

    // ファイル受信完了イベント
    const fileReceivedListener = WifiDirect.addListener('fileReceived', async (data) => {
      console.log('File received:', data.fileName);
      console.log('File size:', data.bytesReceived);
      console.log('File content length:', data.fileContent?.length);

      addLog('success', t('nearbyShare.systemMessages.fileReceived', { fileName: data.fileName }));
      progress.value = {
        status: 'complete',
        message: t('nearbyShare.systemMessages.fileReceived', { fileName: data.fileName })
      };

      try {
        // イベントから直接ファイル内容を取得
        if (!data.fileContent) {
          throw new Error('ファイル内容が空です');
        }

        // fileStoreに追加
        const { useFileStore } = await import('@/stores/fileStore');
        const fileStore = useFileStore();
        
        // ファイル名から拡張子とタイムスタンプを除去
        let displayName = data.fileName
          .replace(/\.md$/, '')
          .replace(/^markdown_\d+_\d+/, 'received_file');
        
        // タイムスタンプがあれば整形
        const timestampMatch = data.fileName.match(/(\d{8})_(\d{4})/);
        if (timestampMatch) {
          const date = timestampMatch[1]; // YYYYMMDD
          const time = timestampMatch[2]; // HHMM
          displayName = `受信_${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}_${time.slice(0,2)}:${time.slice(2,4)}`;
        }
        
        // ファイルを作成して内容を設定
        const newFile = fileStore.createFile(displayName);
        fileStore.updateFile(newFile.id, data.fileContent);

        console.log('File added to store:', displayName);

        await alertController.create({
          header: t('nearbyShare.systemMessages.fileReceivedTitle'),
          message: t('nearbyShare.systemMessages.fileReceivedMessage', { 
            fileName: data.fileName, 
            size: formatBytes(data.bytesReceived) 
          }),
          buttons: ['OK']
        });
        await alert.present();
      } catch (err: any) {
        console.error('Failed to process received file:', err);
        addLog('error', t('nearbyShare.systemMessages.fileProcessingFailed', { error: err.message }));
        await alertController.create({
          header: t('nearbyShare.error'),
          message: t('nearbyShare.systemMessages.fileProcessingFailed', { error: err.message }),
          buttons: ['OK']
        });
        await alert.present();
      }
    });
    listeners.push(fileReceivedListener);

    // ファイル受信エラーイベント
    const errorListener = WifiDirect.addListener('fileReceiveError', (data) => {
      console.error('File receive error:', data.error);
      addLog('error', t('nearbyShare.systemMessages.receiveError', { error: data.error }));
      error.value = `ファイルの受信に失敗: ${data.error}`;
      progress.value = { status: 'error', message: error.value };
    });
    listeners.push(errorListener);
  }

  // リスナーを削除
  function removeListeners() {
    listeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    listeners.length = 0;
  }

  // 共有を開始
  async function startSharing(mode: 'send' | 'receive' = 'send'): Promise<boolean> {
    // ✅ 詳細ログ: 関数呼び出し時の状態
    const timestamp = new Date().toISOString();
    const callId = Math.random().toString(36).substr(2, 9);
    console.log(`🔵 [${timestamp}] startSharing called (ID: ${callId})`);
    console.log(`   Mode: ${mode}`);
    console.log(`   isSharing.value: ${isSharing.value}`);
    
    debugLogger.addLog('debug', 'WiFiDirect', `startSharing called (ID: ${callId})`, {
      mode,
      isSharing: isSharing.value,
      timestamp
    });
    
    // ✅ 重複実行の防止
    if (isSharing.value) {
      console.warn(`⚠️ [${timestamp}] Already sharing, ignoring duplicate start request (ID: ${callId})`);
      debugLogger.addLog('warning', 'WiFiDirect', `Duplicate start request ignored (ID: ${callId})`, {
        mode,
        isSharing: isSharing.value
      });
      return false;
    }
    
    console.log(`✅ [${timestamp}] Check passed, proceeding with start (ID: ${callId})`);
    
    // ✅ CRITICAL: isSharing を即座に true に設定（重複実行を確実に防ぐ）
    isSharing.value = true;
    console.log(`🔒 [${timestamp}] isSharing set to TRUE (ID: ${callId})`);
    debugLogger.addLog('info', 'WiFiDirect', `isSharing set to TRUE (ID: ${callId})`);
    
    error.value = null;
    eventLog.value = [];

    // ✅ 修正: modeを最初に設定して、デフォルト値の影響を防ぐ
    currentMode.value = mode;
    
    // ✅ 追加: 期待されるgroupOwnerIntentをログに記録
    const expectedIntent = mode === 'send' ? 0 : 15;
    debugLogger.addLog('info', 'WiFiDirect', `Starting sharing in ${mode} mode (ID: ${callId})`, {
      mode,
      expectedGroupOwnerIntent: expectedIntent,
      callId,
      note: mode === 'send' ? 'Will be Client (connect to others)' : 'Will be Group Owner (wait for connections)'
    });

    if (!await checkAvailability()) {
      error.value = 'Wi-Fi Directは Android でのみ利用可能です';
      return false;
    }

    try {
      addLog('info', t('nearbyShare.systemMessages.initializing'));
      progress.value = { status: 'discovering', message: t('nearbyShare.systemMessages.initializing') };

      // Wi-Fi Directを初期化
      await WifiDirect.initialize();
      
      // イベントリスナーをセットアップ
      setupListeners();

      // ✅ NEW: 受信モードの場合、Autonomous Group Ownerとして起動
      if (mode === 'receive') {
        debugLogger.addLog('info', 'WiFiDirect', 'Creating Autonomous Group Owner for receive mode');
        
        try {
          // グループを作成（Group Ownerとして起動）
          // @ts-ignore - createGroup is added in updated plugin
          await WifiDirect.createGroup();
          addLog('success', t('nearbyShare.systemMessages.groupOwnerStarted'));
          debugLogger.addLog('success', 'WiFiDirect', 'Autonomous GO created successfully');
          
        } catch (err: any) {
          // エラーが発生した場合は通常のネゴシエーションにフォールバック
          console.warn('Failed to create Autonomous GO, falling back to negotiation:', err);
          debugLogger.addLog('warning', 'WiFiDirect', 'Autonomous GO failed, using negotiation', {
            error: err.message
          });
        }
      }

      // ピア検索を開始
      addLog('info', t('nearbyShare.systemMessages.searchingDevices'));
      await WifiDirect.discoverPeers();

      // ✅ 削除: isSharing.value = true; (既にチェック直後に設定済み)
      // ✅ 削除: currentMode.value = mode; (既に最初に設定済み)
    progress.value = { status: 'discovering', message: t('nearbyShare.systemMessages.searchingDevices') };

      const toast = await toastController.create({
        message: t('nearbyShare.systemMessages.searchingNearby'),
        duration: 2000,
        position: 'bottom'
      });
      await toast.present();

      return true;

    } catch (err: any) {
      console.error('Failed to start sharing:', err);
      addLog('error', t('nearbyShare.systemMessages.startFailed', { error: err.message }));
      error.value = err?.message || '共有の開始に失敗しました';
      progress.value = { status: 'error', message: error.value };
      
      // ✅ エラー時はisSharingをfalseに戻す
      isSharing.value = false;
      console.log(`🔓 [ERROR] isSharing reset to FALSE`);
      debugLogger.addLog('warning', 'WiFiDirect', 'isSharing reset to FALSE due to error');

      if (err?.message?.includes('permission') || err?.message?.includes('位置情報')) {
        await showPermissionAlert();
      }

      return false;
    }
  }

  // 共有を停止
  async function stopSharing(): Promise<void> {
    try {
      addLog('info', t('nearbyShare.systemMessages.stopping'));
      
      // リスナーを先に削除
      removeListeners();
      
      // サーバーを停止
      try {
        await WifiDirect.stopFileServer();
        // ポートが完全に解放されるまで待つ
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.log('No file server to stop:', err);
      }
      
      // 接続を切断
      if (isConnected.value) {
        await WifiDirect.disconnect();
      }
      
      // ✅ NEW: グループを削除（Autonomous GO対応）
      try {
        // @ts-ignore - removeGroup is added in updated plugin
        await WifiDirect.removeGroup();
        debugLogger.addLog('info', 'WiFiDirect', 'Group removed successfully');
      } catch (err) {
        console.log('No group to remove:', err);
      }
      
      // ピア検索を停止
      await WifiDirect.stopPeerDiscovery();
      
      // 状態をリセット
      isSharing.value = false;
      isConnected.value = false;
      isGroupOwner.value = false;
      groupOwnerAddress.value = null;
      peers.value = [];
      currentMode.value = null; // ✅ 追加: currentModeをnullにリセット
      progress.value = { status: 'idle', message: '' };
      isServerStarting.value = false;  // ✅ サーバー起動フラグをリセット

      // 少し待機してから完了通知
      await new Promise(resolve => setTimeout(resolve, 500));

      addLog('success', t('nearbyShare.systemMessages.sharingStopped'));

      const toast = await toastController.create({
        message: t('nearbyShare.systemMessages.sharingStopped'),
        duration: 2000,
        position: 'bottom'
      });
      await toast.present();

    } catch (err: any) {
      console.error('Failed to stop sharing:', err);
      addLog('error', t('nearbyShare.systemMessages.stopFailed', { error: err.message }));
      error.value = err?.message || '共有の停止に失敗しました';
    }
  }

  // デバイスに接続
  async function connectToDevice(deviceAddress: string): Promise<void> {
    try {
      // ✅ currentModeがnullの場合のフォールバック
      const mode = currentMode.value || 'send';
      
      addLog('info', t('nearbyShare.systemMessages.connectingToDevice', { address: deviceAddress }), { 
        deviceAddress, 
        currentMode: mode
      });
      progress.value = { status: 'connecting', message: t('nearbyShare.systemMessages.connecting') };

      // ✅ 修正: モードに応じた groupOwnerIntent を設定
      // 送信モード: 0 (Clientを希望) 
      // 受信モード: 15 (Group Ownerを希望)
      // ただし、最終的な役割はネゴシエーションで決まる
      const intent = mode === 'send' ? 0 : 15;
      
      console.log(`Connecting with mode: ${mode}, groupOwnerIntent: ${intent}`);
      debugLogger.addLog('info', 'WiFiDirect', `Initiating connection`, {
        deviceAddress,
        mode: mode,
        groupOwnerIntent: intent
      });
      
      const modeText = t(`nearbyShare.systemMessages.${mode}Mode`);
      addLog('info', t('nearbyShare.systemMessages.connectingInMode', { mode: modeText }), {
        groupOwnerIntent: intent
      });
      
      await WifiDirect.connectToPeer({ 
        deviceAddress,
        groupOwnerIntent: intent
      });

      const toast = await toastController.create({
        message: t('nearbyShare.systemMessages.connectionStarted'),
        duration: 2000,
        position: 'bottom'
      });
      await toast.present();

    } catch (err: any) {
      console.error('Failed to connect to device:', err);
      addLog('error', t('nearbyShare.systemMessages.connectionFailed', { error: err.message }), { error: err });
      debugLogger.addLog('error', 'WiFiDirect', `Connection failed: ${err.message}`, { error: err });
      error.value = err?.message || 'デバイスへの接続に失敗しました';
    }
  }

  // ファイル受信を開始
  async function startReceiving(): Promise<void> {
    // ✅ 重複起動防止
    if (isServerStarting.value) {
      console.log('⚠️ Server is already starting, skipping');
      return;
    }

    try {
      isServerStarting.value = true;

      const timestamp = Date.now();
      const fileName = `markdown_${timestamp}.md`;
      const relativePath = `received/${fileName}`;

      // receivedディレクトリを作成
      try {
        await Filesystem.mkdir({
          directory: Directory.Data,
          path: 'received',
          recursive: true
        });
      } catch (mkdirError) {
        // ディレクトリが既に存在する場合は無視
      }

      // Directory.Data の絶対パスを取得
      const dataDir = await Filesystem.getUri({
        directory: Directory.Data,
        path: ''
      });
      
      // 完全な保存パスを構築
      const saveFilePath = `${dataDir.uri.replace('file://', '')}/${relativePath}`;
      
      console.log('DEBUG: Save path:', saveFilePath);
      console.log('DEBUG: Relative path:', relativePath);

      await WifiDirect.startFileServer({
        savePath: saveFilePath,
        port: 8988
      });

      console.log('File server started, waiting for file...');
      isServerStarting.value = false; // ✅ 起動完了

    } catch (err: any) {
      console.error('Failed to start receiving:', err);
      addLog('error', t('nearbyShare.systemMessages.receiveStartFailed', { error: err.message }));
      error.value = err?.message || 'ファイル受信の開始に失敗しました';
      isServerStarting.value = false; // ✅ エラー時もフラグをリセット
    }
  }

  // Markdownを送信
  async function sendMarkdown(content: string): Promise<void> {
    debugLogger.addLog('info', 'WiFiDirect', 'sendMarkdown called', {
      contentLength: content.length,
      isConnected: isConnected.value,
      isGroupOwner: isGroupOwner.value,
      groupOwnerAddress: groupOwnerAddress.value
    });

    if (!content) {
      error.value = '送信するコンテンツがありません';
      debugLogger.addLog('error', 'WiFiDirect', 'No content to send');
      return;
    }

    if (!isConnected.value) {
      error.value = '接続が確立されていません';
      debugLogger.addLog('error', 'WiFiDirect', 'Not connected');
      return;
    }

    // ✅ 修正: nullチェックを追加
    if (!groupOwnerAddress.value) {
      error.value = 'Group Ownerのアドレスが取得できていません';
      addLog('error', 'Group Owner address is null');
      debugLogger.addLog('error', 'WiFiDirect', 'Group Owner address is null', {
        isConnected: isConnected.value,
        isGroupOwner: isGroupOwner.value
      });
      return;
    }

    try {
      addLog('info', t('nearbyShare.systemMessages.sendingFile'), { 
        contentLength: content.length,
        destination: groupOwnerAddress.value 
      });
      progress.value = { 
        status: 'transferring', 
        message: t('nearbyShare.systemMessages.sendingMarkdown'),
        progress: 0
      };

      // 一時ファイルを作成
      const timestamp = Date.now();
      const fileName = `markdown_${timestamp}.md`;
      
      await Filesystem.writeFile({
        path: fileName,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // ファイルパスを取得
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      const filePath = fileUri.uri.replace('file://', '');

      console.log('Sending file:', filePath);
      console.log('To:', groupOwnerAddress.value);
      
      debugLogger.addLog('info', 'WiFiDirect', 'Sending file', {
        fileName,
        filePath,
        hostAddress: groupOwnerAddress.value,
        port: 8988,
        fileSize: content.length
      });

      // ファイルを送信
      await WifiDirect.sendFile({
        filePath,
        hostAddress: groupOwnerAddress.value,
        port: 8988
      });

      addLog('success', t('nearbyShare.systemMessages.sendSuccess'), { fileName });
      debugLogger.addLog('info', 'WiFiDirect', 'File sent successfully', { fileName });
      progress.value = { 
        status: 'complete', 
        message: t('nearbyShare.systemMessages.sendComplete'),
        progress: 1
      };

      // 一時ファイルを削除
      try {
        await Filesystem.deleteFile({
          path: fileName,
          directory: Directory.Cache
        });
      } catch (deleteErr) {
        console.warn('Failed to delete temp file:', deleteErr);
      }

      const toast = await toastController.create({
        message: t('nearbyShare.systemMessages.sendComplete'),
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

    } catch (err: any) {
      console.error('Failed to send markdown:', err);
      addLog('error', t('nearbyShare.systemMessages.sendFailed', { error: err.message }));
      error.value = err?.message || 'Markdownの送信に失敗しました';
      progress.value = { status: 'error', message: error.value };

      const alert = await alertController.create({
        header: t('nearbyShare.error'),
        message: `File transfer failed: ${err.message}`,
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  // バイト数をフォーマット
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // クリーンアップ
  onUnmounted(() => {
    removeListeners();
    if (isSharing.value) {
      stopSharing();
    }
  });

  return {
    isSharing,
    peers,
    isConnected,
    isGroupOwner,
    groupOwnerAddress,
    error,
    progress,
    eventLog,
    currentMode,
    startSharing,
    stopSharing,
    connectToDevice,
    sendMarkdown,
    formatBytes,
    debugLogger, // ✅ 追加: デバッグロガーをエクスポート
  };
}