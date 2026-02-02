import { WebPlugin } from '@capacitor/core';
import type { WifiDirectPlugin } from './definitions';

export class WifiDirectWeb extends WebPlugin implements WifiDirectPlugin {
  async initialize(): Promise<{ success: boolean }> {
    return { success: false };
  }
  async discoverPeers(): Promise<{ success: boolean }> {
    return { success: false };
  }
  async stopPeerDiscovery(): Promise<{ success: boolean }> {
    return { success: false };
  }
  async connectToPeer(_options: { deviceAddress: string; groupOwnerIntent?: number }): Promise<{ success: boolean; deviceAddress: string }> {
    return { success: false, deviceAddress: '' };
  }
  async disconnect(): Promise<{ success: boolean }> {
    return { success: false };
  }
  async createGroup(): Promise<{ success: boolean }> {
    return { success: false };
  }
  async removeGroup(): Promise<{ success: boolean }> {
    return { success: false };
  }
  async sendFile(_options: { filePath: string; hostAddress: string; port?: number }): Promise<{ success: boolean; fileName: string; bytesTransferred: number }> {
    return { success: false, fileName: '', bytesTransferred: 0 };
  }
  async startFileServer(_options: { savePath: string; port?: number }): Promise<{ success: boolean; port: number }> {
    return { success: false, port: 0 };
  }
  async stopFileServer(): Promise<{ success: boolean }> {
    return { success: false };
  }
  async addListener(_eventName: string, _listenerFunc: any): Promise<any> {
    return undefined;
  }
  async removeAllListeners(): Promise<void> {
    return;
  }
}