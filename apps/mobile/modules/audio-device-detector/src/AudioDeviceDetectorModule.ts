import { requireNativeModule, EventEmitter } from 'expo-modules-core';
import type {
  AudioDevice,
  AudioDeviceDetectorEvents,
} from './AudioDeviceDetectorModule.types';

let NativeAudioDeviceDetector: any = null;

try {
  NativeAudioDeviceDetector = requireNativeModule('AudioDeviceDetector');
} catch (e) {
  // Fallback if native module is not linked (e.g. standard Expo Go)
  NativeAudioDeviceDetector = {
    getConnectedDevices: async (): Promise<AudioDevice[]> => [],
  };
}

export const AudioDeviceDetectorEventEmitter =
  new EventEmitter<AudioDeviceDetectorEvents>(NativeAudioDeviceDetector);

export async function getConnectedDevices(): Promise<AudioDevice[]> {
  if (NativeAudioDeviceDetector && NativeAudioDeviceDetector.getConnectedDevices) {
    return await NativeAudioDeviceDetector.getConnectedDevices();
  }
  return [];
}

export default NativeAudioDeviceDetector;
