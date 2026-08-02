import { useEffect, useState, useCallback } from 'react';
import {
  AudioDeviceDetectorEventEmitter,
  getConnectedDevices,
} from './AudioDeviceDetectorModule';
import type {
  AudioDevice,
  AudioDeviceEventPayload,
  AudioDevicesChangedPayload,
} from './AudioDeviceDetectorModule.types';

export interface UseAudioDeviceDetectorResult {
  connectedDevices: AudioDevice[];
  latestConnectedDevice: AudioDevice | null;
  latestDisconnectedDevice: AudioDevice | null;
  dismissLatestDevice: () => void;
  refreshDevices: () => Promise<void>;
}

export function useAudioDeviceDetector(): UseAudioDeviceDetectorResult {
  const [connectedDevices, setConnectedDevices] = useState<AudioDevice[]>([]);
  const [latestConnectedDevice, setLatestConnectedDevice] = useState<AudioDevice | null>(null);
  const [latestDisconnectedDevice, setLatestDisconnectedDevice] = useState<AudioDevice | null>(null);

  const refreshDevices = useCallback(async () => {
    const devices = await getConnectedDevices();
    setConnectedDevices(devices);
  }, []);

  const dismissLatestDevice = useCallback(() => {
    setLatestConnectedDevice(null);
    setLatestDisconnectedDevice(null);
  }, []);

  useEffect(() => {
    refreshDevices();

    const connectSub = AudioDeviceDetectorEventEmitter.addListener(
      'onAudioDeviceConnected',
      (event: AudioDeviceEventPayload) => {
        if (event?.device) {
          setLatestConnectedDevice(event.device);
        }
        if (event?.allDevices) {
          setConnectedDevices(event.allDevices);
        } else {
          refreshDevices();
        }
      }
    );

    const disconnectSub = AudioDeviceDetectorEventEmitter.addListener(
      'onAudioDeviceDisconnected',
      (event: AudioDeviceEventPayload) => {
        if (event?.device) {
          setLatestDisconnectedDevice(event.device);
        }
        if (event?.allDevices) {
          setConnectedDevices(event.allDevices);
        } else {
          refreshDevices();
        }
      }
    );

    const changeSub = AudioDeviceDetectorEventEmitter.addListener(
      'onAudioDevicesChanged',
      (event: AudioDevicesChangedPayload) => {
        if (event?.allDevices) {
          setConnectedDevices(event.allDevices);
        } else {
          refreshDevices();
        }
      }
    );

    return () => {
      connectSub?.remove();
      disconnectSub?.remove();
      changeSub?.remove();
    };
  }, [refreshDevices]);

  return {
    connectedDevices,
    latestConnectedDevice,
    latestDisconnectedDevice,
    dismissLatestDevice,
    refreshDevices,
  };
}
