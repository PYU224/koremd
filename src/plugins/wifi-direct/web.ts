import { WebPlugin } from '@capacitor/core';
import type { WifiDirectPlugin } from './definitions';

export class WifiDirectWeb extends WebPlugin implements WifiDirectPlugin {
  async initialize(): Promise<{ success: boolean }> {
    throw this.unimplemented('Wi-Fi Direct is not supported on web');
  }

  async discoverPeers(): Promise<{ success: boolean }> {
    throw this.unimplemented('Wi-Fi Direct is not supported on web');
  }

  async stopPeerDiscovery(): Promise<{ success: boolean }> {
    throw this.unimplemented('Wi-Fi Direct is not supported on web');
  }

  async connectToPeer(_options: { deviceAddress: string }): Promise<{
    success: boolean;
    deviceAddress: string;
  }> {
    throw this.unimplemented('Wi-Fi Direct is not supported on web');
  }

  async disconnect(): Promise<{ success: boolean }> {
    throw this.unimplemented('Wi-Fi Direct is not supported on web');
  }

  async sendFile(_options: {
    filePath: string;
    hostAddress: string;
    port?: number;
  }): Promise<{
    success: boolean;
    bytesTransferred: number;
    fileName: string;
  }> {
    throw this.unimplemented('Wi-Fi Direct is not supported on web');
  }

  async startFileServer(_options: {
    savePath: string;
    port?: number;
  }): Promise<{
    success: boolean;
    port: number;
  }> {
    throw this.unimplemented('Wi-Fi Direct is not supported on web');
  }

  async stopFileServer(): Promise<{ success: boolean }> {
    throw this.unimplemented('Wi-Fi Direct is not supported on web');
  }
}
