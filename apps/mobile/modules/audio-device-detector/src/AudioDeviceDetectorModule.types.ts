export type AudioDeviceType =
  | 'bluetooth'
  | 'wired_headset'
  | 'wired_headphones'
  | 'builtin_speaker'
  | 'builtin_earpiece'
  | 'builtin_mic'
  | 'usb_headset'
  | 'unknown';

export interface AudioDevice {
  id: string;
  name: string;
  type: AudioDeviceType;
  isInput: boolean;
  isOutput: boolean;
}

export interface AudioDeviceEventPayload {
  device: AudioDevice;
  allDevices: AudioDevice[];
  timestamp: number;
}

export interface AudioDevicesChangedPayload {
  allDevices: AudioDevice[];
  timestamp: number;
}

export type AudioDeviceDetectorEvents = {
  onAudioDeviceConnected: (event: AudioDeviceEventPayload) => void;
  onAudioDeviceDisconnected: (event: AudioDeviceEventPayload) => void;
  onAudioDevicesChanged: (event: AudioDevicesChangedPayload) => void;
};
