export interface WifiDirectPlugin {
  initialize(): Promise<{ success: boolean }>;
  discoverPeers(): Promise<{ success: boolean }>;
  stopPeerDiscovery(): Promise<{ success: boolean }>;
  connectToPeer(options: { deviceAddress: string; groupOwnerIntent?: number }): Promise<{ success: boolean; deviceAddress: string }>;
  disconnect(): Promise<{ success: boolean }>;
  createGroup(): Promise<{ success: boolean }>; // ✅ NEW: Autonomous GO
  removeGroup(): Promise<{ success: boolean }>; // ✅ NEW: Remove GO
  sendFile(options: { filePath: string; hostAddress: string; port?: number }): Promise<{ success: boolean; fileName: string; bytesTransferred: number }>;
  startFileServer(options: { savePath: string; port?: number }): Promise<{ success: boolean; port: number }>;
  stopFileServer(): Promise<{ success: boolean }>;
  addListener(eventName: string, listenerFunc: any): Promise<any>;
  removeAllListeners(): Promise<void>;
}

export interface WifiP2pDevice {
  deviceName: string;
  deviceAddress: string;
  status: string;
}