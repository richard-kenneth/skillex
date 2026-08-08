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

export async function getActiveDevice(): Promise<AudioDevice | null> {
  if (NativeAudioDeviceDetector && NativeAudioDeviceDetector.getActiveDevice) {
    return await NativeAudioDeviceDetector.getActiveDevice();
  }
  return null;
}

export async function setAudioOutput(targetOutput: string): Promise<boolean> {
  if (NativeAudioDeviceDetector && NativeAudioDeviceDetector.setAudioOutput) {
    return await NativeAudioDeviceDetector.setAudioOutput(targetOutput);
  }
  return false;
}

export default NativeAudioDeviceDetector;
