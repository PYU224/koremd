<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ t('nearbyShare.title') }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="$emit('close')">
          <ion-icon :icon="close"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding" :scrollY="true" :fullscreen="true">
    <ion-card class="nearby-share-card">
      <!-- 開始画面 -->
      <div v-if="!isSharing" class="start-screen">
        <ion-card-header>
          <ion-card-title>{{ t('nearbyShare.modeSelection') }}</ion-card-title>
        </ion-card-header>
        
        <ion-card-content>
          <!-- モード選択 -->
          <div class="mode-selection">
            <ion-segment v-model="shareMode" value="send">
              <ion-segment-button value="send">
                <ion-label>{{ t('nearbyShare.sendMode') }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="receive">
                <ion-label>{{ t('nearbyShare.receiveMode') }}</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>

          <p class="description">
            {{ shareMode === 'send' ? 
              t('nearbyShare.sendDescription') : 
              t('nearbyShare.receiveDescription') }}
          </p>
          
          <ion-button 
            expand="block" 
            @click="handleStart"
            :disabled="(shareMode === 'send' && !markdownContent) || isSharing"
            color="primary"
          >
            <ion-icon :icon="shareMode === 'send' ? send : download" slot="start"></ion-icon>
            {{ isSharing ? t('nearbyShare.starting') : t('nearbyShare.startSharing') }}
          </ion-button>

          <ion-text v-if="shareMode === 'send' && !markdownContent" color="warning" class="warning-text">
            <p><small>{{ t('nearbyShare.noContent') }}</small></p>
          </ion-text>
        </ion-card-content>
      </div>

      <!-- 共有画面 -->
      <div v-else class="sharing-screen">
        <ion-card-header>
          <ion-card-title>
            {{ currentMode === 'send' ? t('nearbyShare.currentModeSend') : t('nearbyShare.currentModeReceive') }}
            <span v-if="shareMode !== currentMode" class="mode-override">
              {{ t('nearbyShare.autoAdjusted', { 
                mode: shareMode === 'send' ? t('nearbyShare.originalSend') : t('nearbyShare.originalReceive')
              }) }}
            </span>
          </ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <!-- ✅ 最優先: 接続情報と送信ボタンを最上部に配置 -->
          <div v-if="isConnected" class="connection-info-priority" ref="sendButtonSection">
            <!-- 送信ボタン（Client側のみ） -->
            <div v-if="!isGroupOwner" class="send-action-section">
              <ion-chip color="success" class="connection-status-chip">
                <ion-icon :icon="cloudDownload"></ion-icon>
                <ion-label>✅ {{ t('nearbyShare.connectionComplete') }}</ion-label>
              </ion-chip>

              <p class="connection-ready-message">
                <strong>{{ t('nearbyShare.ipAddress') }}:</strong> {{ groupOwnerAddress }}<br>
                <strong>{{ t('nearbyShare.contentPreview', { length: markdownContent?.length || 0 }) }}</strong>
              </p>

              <ion-button
                expand="block"
                color="success"
                size="large"
                @click="handleSend"
                @touchstart="handleSendTouchStart"
                @touchend="handleSendTouchEnd"
                @pointerdown="handleSendPointerDown"
                :disabled="!markdownContent || progress.status === 'transferring'"
                :class="['primary-send-button', isConnected ? 'button-ready' : 'button-preparing']"
                style="pointer-events: auto !important; touch-action: manipulation !important; z-index: 9999 !important; position: relative !important;"
              >
                <ion-icon :icon="send" slot="start"></ion-icon>
                <strong>{{ isConnected ? t('nearbyShare.tapToSend') : t('nearbyShare.connecting') }}</strong>
              </ion-button>

              <ion-text v-if="markdownContent" color="medium">
                <p class="content-preview">
                  <small>{{ t('nearbyShare.contentPreview', { length: markdownContent.length }) }}</small>
                </p>
              </ion-text>
            </div>

            <!-- 受信側（Group Owner）のメッセージ -->
            <div v-if="isGroupOwner" class="waiting-section">
              <ion-chip color="success" class="connection-status-chip">
                <ion-icon :icon="cloudUpload"></ion-icon>
                <ion-label>{{ t('nearbyShare.receivingWaiting') }}</ion-label>
              </ion-chip>
              
              <div class="waiting-message">
                <ion-icon :icon="cloudDownload" color="success" size="large"></ion-icon>
                <p>{{ t('nearbyShare.waitingForConnection') }}</p>
                <p class="connection-details">
                  <small>{{ t('nearbyShare.connectTo') }}: {{ groupOwnerAddress }}</small>
                </p>
              </div>
            </div>
          </div>

          <!-- 状態表示 -->
          <div class="status-section">
            <ion-chip :color="getStatusColor()">
              <ion-icon :icon="getStatusIcon()"></ion-icon>
              <ion-label>{{ progress.message || t('nearbyShare.waitingMessage') }}</ion-label>
            </ion-chip>
          </div>

          <!-- 進捗バー -->
          <div v-if="progress.progress !== undefined" class="progress-section">
            <ion-progress-bar 
              :value="progress.progress"
              :color="progress.status === 'complete' ? 'success' : 'primary'"
            ></ion-progress-bar>
            <p class="progress-text">
              {{ Math.round(progress.progress * 100) }}%
              <span v-if="progress.bytesTransferred && progress.totalBytes">
                ({{ formatBytes(progress.bytesTransferred) }} / {{ formatBytes(progress.totalBytes) }})
              </span>
            </p>
          </div>

          <!-- 停止ボタン -->
          <ion-button 
            expand="block" 
            color="danger" 
            @click="handleStop"
            class="stop-button"
          >
            <ion-icon :icon="stopCircle" slot="start"></ion-icon>
            {{ t('nearbyShare.stopSharing') }}
          </ion-button>

          <!-- デバイスリスト -->
          <div v-if="!isConnected && peers.length > 0" class="devices-section">
            <h3>{{ t('nearbyShare.availableDevices', { count: peers.length }) }}</h3>
            <ion-list>
              <ion-item 
                v-for="peer in peers" 
                :key="peer.deviceAddress"
                button
                @click="handleConnect(peer.deviceAddress)"
                class="device-item"
                :disabled="peer.status !== 'available'"
              >
                <ion-icon :icon="phonePortrait" slot="start"></ion-icon>
                <ion-label>
                  <h2>{{ peer.deviceName }}</h2>
                  <p>{{ peer.deviceAddress }}</p>
                  <p v-if="peer.status !== 'available'" class="status-text">
                    {{ t('nearbyShare.status') }}: {{ getStatusText(peer.status) }}
                  </p>
                </ion-label>
                <ion-badge 
                  slot="end" 
                  :color="getStatusBadgeColor(peer.status)"
                >
                  {{ getStatusText(peer.status) }}
                </ion-badge>
              </ion-item>
            </ion-list>
          </div>

          <div v-else-if="!isConnected" class="no-devices">
            <ion-icon :icon="search" size="large" color="medium"></ion-icon>
            <p>{{ t('nearbyShare.searching') }}</p>
          </div>

          <!-- エラー表示 -->
          <ion-card v-if="error" color="danger" class="error-card">
            <ion-card-content>
              <ion-icon :icon="alertCircle"></ion-icon>
              <p><strong>{{ t('nearbyShare.error') }}</strong></p>
              <p>{{ error }}</p>
            </ion-card-content>
          </ion-card>

          <!-- 使い方 -->
          <div class="instructions">
            <h4>{{ t('nearbyShare.howToUse') }}</h4>
            <ol>
              <li>{{ t('nearbyShare.step1') }}</li>
              <li>{{ t('nearbyShare.step2') }}</li>
              <li>{{ t('nearbyShare.step3') }}</li>
              <li>{{ t('nearbyShare.step4') }}</li>
            </ol>
            <p class="note">
              <small>{{ t('nearbyShare.note') }}</small>
            </p>
          </div>
        </ion-card-content>
      </div>
    </ion-card>
  </ion-content>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { toastController } from '@ionic/vue';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonChip,
  IonProgressBar,
  IonText,
  IonSegment,
  IonSegmentButton,
} from '@ionic/vue';
import {
  close,
  phonePortrait,
  search,
  alertCircle,
  stopCircle,
  send,
  download,
  cloudUpload,
  cloudDownload,
  checkmarkCircle,
  warningOutline,
  closeCircle,
} from 'ionicons/icons';
import { useWifiDirectShare } from '@/composables/useWifiDirectShare';

interface Props {
  markdownContent?: string;
}

const props = defineProps<Props>();
const { t } = useI18n();
const emit = defineEmits<{
  close: [];
}>();

const shareMode = ref<'send' | 'receive'>('send');

const {
  isSharing,
  isConnected,
  isGroupOwner,
  groupOwnerAddress,
  peers,
  progress,
  error,
  currentMode,
  startSharing,
  connectToDevice,
  sendMarkdown,
  stopSharing,
  formatBytes,
  debugLogger, // ✅ 変更: logger → debugLogger
} = useWifiDirectShare();

// ✅ デバッグ用: 重要な状態変化をログに記録

watch(isGroupOwner, (newVal, oldVal) => {
  console.log(`🔄 [NearbyShare] isGroupOwner changed: ${oldVal} → ${newVal}`);
  console.log(`   📍 Current mode: ${currentMode.value}`);
  console.log(`   🔗 Connected: ${isConnected.value}`);
  console.log(`   📡 Group Owner Address: ${groupOwnerAddress.value}`);
  debugLogger.addLog('debug', 'NearbyShare-UI', 'isGroupOwner changed', {
    from: oldVal,
    to: newVal,
    currentMode: currentMode.value,
    isConnected: isConnected.value,
    groupOwnerAddress: groupOwnerAddress.value
  });
});

watch(isConnected, async (newVal, oldVal) => {
  console.log(`🔄 [NearbyShare] isConnected changed: ${oldVal} → ${newVal}`);
  if (newVal) {
    console.log(`   📍 Is Group Owner: ${isGroupOwner.value}`);
    console.log(`   📡 Address: ${groupOwnerAddress.value}`);
    
    // ✅ 接続確立時の通知
    if (!isGroupOwner.value) {
      // Client側（送信側）の場合
      
      // バイブレーション
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]); // 短・短・長のパターン
      }
      
      // トーストで通知
      const toast = await toastController.create({
        header: t('nearbyShare.connectionComplete'),
        message: t('nearbyShare.connectionCompleteMessage'),
        duration: 5000,
        position: 'top',
        color: 'success',
        buttons: [
          {
            text: 'OK',
            role: 'cancel'
          }
        ]
      });
      await toast.present();
      
      // 送信ボタンまでスクロール（100ms後）
      setTimeout(() => {
        const element = document.querySelector('.send-action-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Group Owner側（受信側）の場合
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
      
      const toast = await toastController.create({
        message: t('nearbyShare.waitingForSender'),
        duration: 3000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
    }
  }
  
  debugLogger.addLog('debug', 'NearbyShare-UI', 'isConnected changed', {
    from: oldVal,
    to: newVal,
    isGroupOwner: isGroupOwner.value,
    groupOwnerAddress: groupOwnerAddress.value
  });
});

watch(currentMode, (newVal, oldVal) => {
  console.log(`🔄 [NearbyShare] currentMode changed: ${oldVal} → ${newVal}`);
  console.log(`   📍 Is Group Owner: ${isGroupOwner.value}`);
  debugLogger.addLog('debug', 'NearbyShare-UI', 'currentMode changed', {
    from: oldVal,
    to: newVal,
    isGroupOwner: isGroupOwner.value
  });
});

// ✅ デバッグ用: 送信ボタンの表示条件を監視
const showSendButton = computed(() => {
  const show = !isGroupOwner.value && isConnected.value;
  console.log(`🔍 [NearbyShare] Send button should show: ${show}`);
  console.log(`   ├─ isGroupOwner: ${isGroupOwner.value}`);
  console.log(`   ├─ isConnected: ${isConnected.value}`);
  console.log(`   └─ markdownContent: ${!!props.markdownContent}`);
  
  debugLogger.addLog('debug', 'NearbyShare-UI', 'Send button visibility computed', {
    shouldShow: show,
    isGroupOwner: isGroupOwner.value,
    isConnected: isConnected.value,
    hasMarkdownContent: !!props.markdownContent
  });
  
  return show;
});

// 送信ボタンの表示状態が変わったときのログ
watch(showSendButton, (newVal) => {
  console.log(`🔘 [NearbyShare] Send button visibility: ${newVal}`);
});

// ✅ ログ出力ハンドラ
const handleStart = async () => {
  const timestamp = new Date().toISOString();
  const clickId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🟢 [${timestamp}] handleStart called (Click ID: ${clickId})`);
  console.log(`   shareMode: ${shareMode.value}`);
  console.log(`   isSharing: ${isSharing.value}`);
  
  // ✅ 重複実行の防止
  if (isSharing.value) {
    console.warn(`⚠️ [${timestamp}] Already sharing, ignoring duplicate click (Click ID: ${clickId})`);
    return;
  }
  
  console.log(`✅ [${timestamp}] Calling startSharing (Click ID: ${clickId})`);
  const success = await startSharing(shareMode.value);
  
  if (!success) {
    console.error(`❌ [${timestamp}] Failed to start Wi-Fi Direct sharing (Click ID: ${clickId})`);
  } else {
    console.log(`✅ [${timestamp}] Successfully started sharing (Click ID: ${clickId})`);
  }
};

const handleStop = async () => {
  await stopSharing();
};

const handleConnect = async (deviceAddress: string) => {
  await connectToDevice(deviceAddress);
};

const handleSend = async () => {
  console.log('🚀 [NearbyShare] Send button clicked');
  console.log(`   📄 Has content: ${!!props.markdownContent}`);
  console.log(`   📍 Is Group Owner: ${isGroupOwner.value}`);
  console.log(`   📡 Group Owner Address: ${groupOwnerAddress.value}`);
  
  debugLogger.addLog('info', 'NearbyShare-UI', 'Send button clicked', {
    hasContent: !!props.markdownContent,
    contentLength: props.markdownContent?.length || 0,
    isGroupOwner: isGroupOwner.value,
    isConnected: isConnected.value,
    groupOwnerAddress: groupOwnerAddress.value
  });
  
  if (props.markdownContent) {
    await sendMarkdown(props.markdownContent);
  } else {
    console.warn('⚠️ No markdown content to send');
    debugLogger.addLog('warning', 'NearbyShare-UI', 'No markdown content to send');
  }
};

// ✅ タッチイベントのデバッグ用
const handleSendTouchStart = () => {
  console.log('👆 [NearbyShare] Send button touch START');
  debugLogger.addLog('debug', 'NearbyShare-UI', 'Send button touch start');
};

const handleSendTouchEnd = async () => {
  console.log('👆 [NearbyShare] Send button touch END');
  debugLogger.addLog('debug', 'NearbyShare-UI', 'Send button touch end');
  
  // ✅ click が発火しないので、touchend で直接送信処理を実行
  console.log('🚀 [NearbyShare] Triggering send from touchend');
  debugLogger.addLog('info', 'NearbyShare-UI', 'Triggering send from touchend');
  await handleSend();
};

// ✅ Pointer イベントのデバッグ用
const handleSendPointerDown = () => {
  console.log('👇 [NearbyShare] Send button POINTER DOWN');
  debugLogger.addLog('debug', 'NearbyShare-UI', 'Send button pointer down');
};

const getStatusColor = () => {
  switch (progress.value.status) {
    case 'complete': return 'success';
    case 'error': return 'danger';
    case 'transferring': return 'warning';
    case 'connecting': return 'secondary';
    default: return 'primary';
  }
};

const getStatusIcon = () => {
  switch (progress.value.status) {
    case 'complete': return checkmarkCircle;
    case 'error': return closeCircle;
    case 'transferring': return send;
    case 'connecting': return warningOutline;
    default: return search;
  }
};

const getDeviceStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    'available': t('nearbyShare.deviceStatus.available'),
    'connected': t('nearbyShare.deviceStatus.connected'),
    'invited': t('nearbyShare.deviceStatus.invited'),
    'failed': t('nearbyShare.deviceStatus.failed'),
    'unavailable': t('nearbyShare.deviceStatus.unavailable'),
  };
  return statusMap[status] || status;
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'available': return 'success';
    case 'connected': return 'primary';
    case 'invited': return 'warning';
    case 'failed': return 'danger';
    case 'unavailable': return 'medium';
    default: return 'medium';
  }
};
</script>

<style scoped>
.nearby-share-card {
  /* height: 100%; を削除してスクロール可能に */
  min-height: auto;
}

.start-screen,
.sharing-screen {
  display: flex;
  flex-direction: column;
}

.mode-selection {
  margin-bottom: 20px;
}

ion-segment-button {
  min-height: 48px;
}

.description {
  text-align: center;
  color: var(--ion-color-medium);
  margin: 16px 0;
  font-size: 14px;
}

.warning-text {
  display: block;
  text-align: center;
  margin-top: 12px;
}

.status-section {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.progress-section {
  margin-bottom: 20px;
}

.progress-text {
  text-align: center;
  margin-top: 8px;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.stop-button {
  margin-bottom: 20px;
}

.connection-info {
  background: var(--ion-color-light);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.connection-details {
  margin: 8px 0;
  font-size: 14px;
}

.content-preview {
  text-align: center;
  margin-top: 8px;
}

/* ✅ 追加: 受信待ちメッセージのスタイル */
.waiting-message {
  text-align: center;
  padding: 20px;
  margin-top: 16px;
  background: var(--ion-color-success-tint);
  border-radius: 8px;
}

.waiting-message ion-icon {
  margin-bottom: 12px;
}

.waiting-message p {
  color: var(--ion-color-success-shade);
  font-weight: 500;
  margin: 0;
}

.devices-section h3 {
  margin: 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.device-item {
  --padding-start: 16px;
  margin-bottom: 8px;
}

.device-item .status-text {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin-top: 4px;
}

.no-devices {
  text-align: center;
  padding: 40px 20px;
  color: var(--ion-color-medium);
}

.no-devices ion-icon {
  margin-bottom: 12px;
}

.error-card {
  margin-top: 16px;
}

.error-card ion-card-content {
  text-align: center;
}

.error-card ion-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.instructions {
  background: var(--ion-color-light);
  padding: 16px;
  border-radius: 8px;
  margin-top: 20px;
}

.instructions h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.instructions ol {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.6;
}

.instructions li {
  margin-bottom: 6px;
}

.instructions .note {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ion-color-light-shade);
  color: var(--ion-color-medium);
  font-style: italic;
}

.mode-override {
  font-size: 0.75em;
  color: var(--ion-color-warning);
  font-weight: normal;
  display: block;
  margin-top: 4px;
}

/* ✅ 優先接続情報セクション */
.connection-info-priority {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border: 2px solid var(--ion-color-success);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  pointer-events: auto !important; /* ✅ タップを受け取る */
  touch-action: manipulation; /* ✅ タッチイベント有効化 */
}

.send-action-section {
  text-align: center;
  pointer-events: auto !important; /* ✅ タップを受け取る */
  touch-action: manipulation; /* ✅ タッチイベント有効化 */
}

.waiting-section {
  text-align: center;
  pointer-events: auto !important; /* ✅ タップを受け取る */
}

.connection-status-chip {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  pointer-events: none; /* チップはイベントを通過させる */
}

.connection-ready-message {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin: 12px 0;
  font-size: 14px;
  line-height: 1.6;
}

.primary-send-button {
  margin: 16px 0;
  height: 60px;
  font-size: 18px;
  --border-radius: 12px;
  font-weight: 600;
  text-transform: none; /* 大文字変換を無効化 */
  /* ✅ タップイベントを確実に受け取る */
  pointer-events: auto !important;
  touch-action: manipulation !important;
  user-select: none; /* テキスト選択を防止 */
  -webkit-tap-highlight-color: rgba(0,0,0,0.1); /* タップ時のハイライト */
  transition: all 0.3s ease; /* スムーズな色変化 */
}

/* ✅ 接続前の準備中状態（薄い色） */
.primary-send-button.button-preparing {
  --background: #a5d6a7; /* 薄い黄緑 */
  --background-hover: #a5d6a7;
  --background-activated: #a5d6a7;
  --color: #2e7d32; /* 濃い緑の文字 */
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.2); /* 薄い影 */
  opacity: 0.7;
}

/* ✅ 接続後の送信可能状態（濃い色） */
.primary-send-button.button-ready {
  --background: #2e7d32; /* 濃い緑 */
  --background-hover: #1b5e20; /* さらに濃く */
  --background-activated: #0d3d14; /* 最も濃く */
  --color: white; /* 白いテキスト */
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.6); /* 濃い影 */
  opacity: 1;
  animation: pulse-ready 2s infinite; /* 脈動アニメーション */
}

@keyframes pulse-ready {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.6);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.8);
    transform: scale(1.02);
  }
}

.primary-send-button ion-icon {
  font-size: 24px;
  margin-right: 8px;
  pointer-events: none; /* アイコンはイベントを親に委譲 */
}

/* タップ可能であることを強調 */
.primary-send-button:not([disabled]) {
  cursor: pointer;
  padding: 20px;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  }
  50% {
    box-shadow: 0 4px 20px rgba(76, 175, 80, 0.6);
  }
}

/* スクロール可能なコンテンツ */
ion-content {
  --overflow: scroll !important;
  /* タップイベントを確実に届ける */
  pointer-events: auto !important;
}

.sharing-screen {
  max-height: none !important;
  pointer-events: auto !important;
}

.nearby-share-card {
  margin-bottom: 20px;
  overflow: visible;
  pointer-events: auto !important;
}

ion-card-content {
  max-height: none !important;
  pointer-events: auto !important;
}

/* スマホでのスクロール改善 */
@media (max-width: 768px) {
  .connection-info-priority {
    /* ❌ position: sticky を削除 - タップをブロックしている可能性 */
    position: relative; /* static の代わりに relative を使用 */
    z-index: 999; /* 非常に高い値に変更 */
    margin-bottom: 20px;
    background: white;
    pointer-events: auto !important; /* タップを確実に受け取る */
    touch-action: manipulation; /* タッチイベントを有効化 */
  }
  
  .primary-send-button {
    height: 65px;
    font-size: 19px;
    pointer-events: auto !important; /* タップを確実に受け取る */
    touch-action: manipulation; /* タッチイベントを有効化 */
    position: relative;
    z-index: 1000; /* さらに高い値 */
  }
  
  /* 送信アクションセクション全体もタップ可能に */
  .send-action-section {
    pointer-events: auto !important;
    touch-action: manipulation;
    position: relative;
    z-index: 999;
  }
}
</style>