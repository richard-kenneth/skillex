import { useEffect, useState, useCallback } from 'react';
import {
  AudioDeviceDetectorEventEmitter,
  getConnectedDevices,
  getActiveDevice,
} from './AudioDeviceDetectorModule';
import type {
  AudioDevice,
  AudioDeviceEventPayload,
  AudioDevicesChangedPayload,
  ActiveAudioDevicePayload,
} from './AudioDeviceDetectorModule.types';

export interface UseAudioDeviceDetectorResult {
  connectedDevices: AudioDevice[];
  activeDevice: AudioDevice | null;
  latestConnectedDevice: AudioDevice | null;
  latestDisconnectedDevice: AudioDevice | null;
  dismissLatestDevice: () => void;
  refreshDevices: () => Promise<void>;
  getActiveDevice: () => Promise<AudioDevice | null>;
}

export function useAudioDeviceDetector(): UseAudioDeviceDetectorResult {
  const [connectedDevices, setConnectedDevices] = useState<AudioDevice[]>([]);
  const [activeDevice, setActiveDevice] = useState<AudioDevice | null>(null);
  const [latestConnectedDevice, setLatestConnectedDevice] = useState<AudioDevice | null>(null);
  const [latestDisconnectedDevice, setLatestDisconnectedDevice] = useState<AudioDevice | null>(null);

  const refreshDevices = useCallback(async () => {
    const devices = await getConnectedDevices();
    const active = await getActiveDevice();
    setConnectedDevices(devices);
    if (active) {
      setActiveDevice(active);
    }
  }, []);

  const dismissLatestDevice = useCallback(() => {
    setLatestConnectedDevice(null);
    setLatestDisconnectedDevice(null);
  }, []);

  useEffect(() => {
    refreshDevices();

    const activeSub = AudioDeviceDetectorEventEmitter.addListener(
      'onActiveAudioOutputChanged',
      (event: ActiveAudioDevicePayload) => {
        if (event?.activeDevice) {
          setActiveDevice(event.activeDevice);
        }
        if (event?.allDevices) {
          setConnectedDevices(event.allDevices);
        }
      }
    );

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
      activeSub?.remove();
      connectSub?.remove();
      disconnectSub?.remove();
      changeSub?.remove();
    };
  }, [refreshDevices]);

  return {
    connectedDevices,
    activeDevice,
    latestConnectedDevice,
    latestDisconnectedDevice,
    dismissLatestDevice,
    refreshDevices,
    getActiveDevice,
  };
}
