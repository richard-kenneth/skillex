import type { AudioDevice, AudioDeviceType } from './AudioDeviceDetectorModule.types';

declare const navigator: any;

function mapWebKindToType(kind: string): AudioDeviceType {
  if (kind === 'audioinput') return 'builtin_mic';
  if (kind === 'audiooutput') return 'builtin_speaker';
  return 'unknown';
}

export async function getConnectedDevices(): Promise<AudioDevice[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d: any) => d.kind === 'audioinput' || d.kind === 'audiooutput')
      .map((d: any, index: number) => ({
        id: d.deviceId || `web-audio-${index}`,
        name: d.label || (d.kind === 'audioinput' ? 'Web Microphone' : 'Web Speaker'),
        type: mapWebKindToType(d.kind),
        isInput: d.kind === 'audioinput',
        isOutput: d.kind === 'audiooutput',
      }));
  } catch {
    return [];
  }
}

export default {
  getConnectedDevices,
};
