import { registerPlugin } from '@capacitor/core';
import type { WifiDirectPlugin } from './definitions';

export const WifiDirect = registerPlugin<WifiDirectPlugin>('WifiDirect');
export * from './definitions';
