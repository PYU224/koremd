import type { PluginListenerHandle } from '@capacitor/core';

export interface WifiDirectPlugin {
  /**
   * Initialize Wi-Fi Direct
   */
  initialize(): Promise<{ success: boolean }>;

  /**
   * Start discovering nearby peers
   */
  discoverPeers(): Promise<{ success: boolean }>;

  /**
   * Stop peer discovery
   */
  stopPeerDiscovery(): Promise<{ success: boolean }>;

  /**
   * Connect to a peer device
   */
  connectToPeer(options: { 
    deviceAddress: string;
    groupOwnerIntent?: number;
  }): Promise<{
    success: boolean;
    deviceAddress: string;
  }>;

  /**
   * Disconnect from current group
   */
  disconnect(): Promise<{ success: boolean }>;

  /**
   * Send a file to the connected peer
   */
  sendFile(options: {
    filePath: string;
    hostAddress: string;
    port?: number;
  }): Promise<{
    success: boolean;
    bytesTransferred: number;
    fileName: string;
  }>;

  /**
   * Start file server to receive files
   */
  startFileServer(options: {
    savePath: string;
    port?: number;
  }): Promise<{
    success: boolean;
    port: number;
  }>;

  /**
   * Stop file server
   */
  stopFileServer(): Promise<{ success: boolean }>;

  /**
   * Listen for Wi-Fi P2P state changes
   */
  addListener(
    eventName: 'wifiP2pStateChanged',
    listenerFunc: (data: WifiP2pStateChangedEvent) => void
  ): Promise<PluginListenerHandle>;

  /**
   * Listen for peer list changes
   */
  addListener(
    eventName: 'peersChanged',
    listenerFunc: (data: PeersChangedEvent) => void
  ): Promise<PluginListenerHandle>;

  /**
   * Listen for connection changes
   */
  addListener(
    eventName: 'connectionChanged',
    listenerFunc: (data: ConnectionChangedEvent) => void
  ): Promise<PluginListenerHandle>;

  /**
   * Listen for file transfer progress
   */
  addListener(
    eventName: 'transferProgress',
    listenerFunc: (data: TransferProgressEvent) => void
  ): Promise<PluginListenerHandle>;

  /**
   * Listen for file received event
   */
  addListener(
    eventName: 'fileReceived',
    listenerFunc: (data: FileReceivedEvent) => void
  ): Promise<PluginListenerHandle>;

  /**
   * Listen for file receive errors
   */
  addListener(
    eventName: 'fileReceiveError',
    listenerFunc: (data: FileReceiveErrorEvent) => void
  ): Promise<PluginListenerHandle>;

  /**
   * Remove all listeners
   */
  removeAllListeners(): Promise<void>;
}

export interface WifiP2pDevice {
  deviceName: string;
  deviceAddress: string;
  primaryDeviceType: string;
  secondaryDeviceType?: string;
  status: 'connected' | 'invited' | 'failed' | 'available' | 'unavailable' | 'unknown';
}

export interface WifiP2pStateChangedEvent {
  enabled: boolean;
}

export interface PeersChangedEvent {
  peers: WifiP2pDevice[];
}

export interface ConnectionChangedEvent {
  groupFormed: boolean;
  isGroupOwner: boolean;
  groupOwnerAddress: string | null;
}

export interface TransferProgressEvent {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

// ✅ 修正: fileContentプロパティを追加
export interface FileReceivedEvent {
  success: boolean;
  bytesReceived: number;
  filePath: string;
  fileName: string;
  fileContent?: string; // ✅ 追加: ファイルの内容（JavaプラグインからBase64またはUTF-8で送られる）
}

export interface FileReceiveErrorEvent {
  error: string;
}
