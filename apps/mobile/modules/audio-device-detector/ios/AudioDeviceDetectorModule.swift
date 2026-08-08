import ExpoModulesCore
import AVFoundation

public class AudioDeviceDetectorModule: Module {
  private var observer: NSObjectProtocol?
  private var previousDevices: [[String: Any]] = []
  private var previousActiveDeviceKey: String?

  public func definition() -> ModuleDefinition {
    Name("AudioDeviceDetector")

    Events(
      "onAudioDeviceConnected",
      "onAudioDeviceDisconnected",
      "onAudioDevicesChanged",
      "onActiveAudioOutputChanged"
    )

    AsyncFunction("getConnectedDevices") { () -> [[String: Any]] in
      return self.fetchCurrentDevices()
    }

    AsyncFunction("getActiveDevice") { () -> [String: Any]? in
      return self.fetchActiveOutputDevice()
    }

    OnCreate {
      self.startObservingAudioRoutes()
    }

    OnDestroy {
      self.stopObservingAudioRoutes()
    }

    OnStartObserving {
      self.startObservingAudioRoutes()
    }

    OnStopObserving {
      self.stopObservingAudioRoutes()
    }
  }

  private func fetchActiveOutputDevice() -> [String: Any]? {
    let session = AVAudioSession.sharedInstance()
    if let output = session.currentRoute.outputs.first {
      return self.portToDict(output, isInput: false)
    }
    return nil
  }

  private func fetchCurrentDevices() -> [[String: Any]] {
    var devices: [[String: Any]] = []
    var seenKeys = Set<String>()
    let session = AVAudioSession.sharedInstance()

    // 1. Include availableInputs (physically connected/paired devices)
    if let availableInputs = session.availableInputs {
      for input in availableInputs {
        let dict = self.portToDict(input, isInput: true)
        if let type = dict["type"] as? String, let id = dict["id"] as? String {
          let key = "\(type)_\(id)"
          if !seenKeys.contains(key) {
            seenKeys.insert(key)
            devices.append(dict)
          }
        }
      }
    }

    // 2. Include active route outputs & inputs
    let route = session.currentRoute
    for output in route.outputs {
      let dict = self.portToDict(output, isInput: false)
      if let type = dict["type"] as? String, let id = dict["id"] as? String {
        let key = "\(type)_\(id)"
        if !seenKeys.contains(key) {
          seenKeys.insert(key)
          devices.append(dict)
        }
      }
    }

    for input in route.inputs {
      let dict = self.portToDict(input, isInput: true)
      if let type = dict["type"] as? String, let id = dict["id"] as? String {
        let key = "\(type)_\(id)"
        if !seenKeys.contains(key) {
          seenKeys.insert(key)
          devices.append(dict)
        }
      }
    }

    return devices
  }

  private func startObservingAudioRoutes() {
    guard observer == nil else { return }

    previousDevices = fetchCurrentDevices()
    if let active = fetchActiveOutputDevice(), let type = active["type"] as? String, let id = active["id"] as? String {
      previousActiveDeviceKey = "\(type)_\(id)"
    }

    observer = NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      guard let self = self else { return }
      self.handleRouteChange(notification: notification)
    }
  }

  private func stopObservingAudioRoutes() {
    if let obs = observer {
      NotificationCenter.default.removeObserver(obs)
      observer = nil
    }
  }

  private func handleRouteChange(notification: Notification) {
    let currentDevices = fetchCurrentDevices()
    let activeDevice = fetchActiveOutputDevice()

    let currentKeys = Set(currentDevices.compactMap { dict -> String? in
      guard let type = dict["type"] as? String, let id = dict["id"] as? String else { return nil }
      return "\(type)_\(id)"
    })

    let previousKeys = Set(previousDevices.compactMap { dict -> String? in
      guard let type = dict["type"] as? String, let id = dict["id"] as? String else { return nil }
      return "\(type)_\(id)"
    })

    let currentTypes = Set(currentDevices.compactMap { $0["type"] as? String })
    let previousTypes = Set(previousDevices.compactMap { $0["type"] as? String })

    let addedDevices = currentDevices.filter { dict in
      guard let type = dict["type"] as? String, let id = dict["id"] as? String else { return false }
      let key = "\(type)_\(id)"
      return !previousKeys.contains(key) && !previousTypes.contains(type)
    }

    let removedDevices = previousDevices.filter { dict in
      guard let type = dict["type"] as? String, let id = dict["id"] as? String else { return false }
      let key = "\(type)_\(id)"
      return !currentKeys.contains(key) && !currentTypes.contains(type)
    }

    for device in addedDevices {
      if let type = device["type"] as? String,
         type == "bluetooth" || type == "wired_headset" || type == "wired_headphones" || type == "usb_headset" {
        self.sendEvent("onAudioDeviceConnected", [
          "device": device,
          "allDevices": currentDevices,
          "timestamp": Date().timeIntervalSince1970 * 1000
        ])
      }
    }

    for device in removedDevices {
      if let type = device["type"] as? String,
         type == "bluetooth" || type == "wired_headset" || type == "wired_headphones" || type == "usb_headset" {
        self.sendEvent("onAudioDeviceDisconnected", [
          "device": device,
          "allDevices": currentDevices,
          "timestamp": Date().timeIntervalSince1970 * 1000
        ])
      }
    }

    // Fallback: check userInfo for explicit oldDeviceUnavailable if diff didn't catch it
    if removedDevices.isEmpty,
       let userInfo = notification.userInfo,
       let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
       let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue),
       reason == .oldDeviceUnavailable {
      if let previousRoute = userInfo[AVAudioSessionRouteChangePreviousRouteKey] as? AVAudioSessionRouteDescription {
        for output in previousRoute.outputs {
          let dict = self.portToDict(output, isInput: false)
          if let type = dict["type"] as? String,
             type == "bluetooth" || type == "wired_headset" || type == "wired_headphones" || type == "usb_headset" {
            self.sendEvent("onAudioDeviceDisconnected", [
              "device": dict,
              "allDevices": currentDevices,
              "timestamp": Date().timeIntervalSince1970 * 1000
            ])
          }
        }
      }
    }

    // Emit active audio device change whenever route changes
    if let active = activeDevice {
      let activeKey = "\(active["type"] as? String ?? "")_\(active["id"] as? String ?? "")"
      if activeKey != previousActiveDeviceKey {
        previousActiveDeviceKey = activeKey
        self.sendEvent("onActiveAudioOutputChanged", [
          "activeDevice": active,
          "allDevices": currentDevices,
          "timestamp": Date().timeIntervalSince1970 * 1000
        ])
      }
    }

    self.sendEvent("onAudioDevicesChanged", [
      "allDevices": currentDevices,
      "timestamp": Date().timeIntervalSince1970 * 1000
    ])

    previousDevices = currentDevices
  }

  private func portToDict(_ port: AVAudioSessionPortDescription, isInput: Bool) -> [String: Any] {
    let portTypeStr: String
    switch port.portType {
    case .bluetoothHFP, .bluetoothA2DP, .bluetoothLE:
      portTypeStr = "bluetooth"
    case .headphones:
      portTypeStr = "wired_headphones"
    case .headsetMic:
      portTypeStr = "wired_headset"
    case .builtInSpeaker:
      portTypeStr = "builtin_speaker"
    case .builtInReceiver:
      portTypeStr = "builtin_earpiece"
    case .builtInMic:
      portTypeStr = "builtin_mic"
    case .usbAudio:
      portTypeStr = "usb_headset"
    case .airPlay:
      portTypeStr = "bluetooth"
    default:
      portTypeStr = "unknown"
    }

    return [
      "id": port.uid,
      "name": port.portName,
      "type": portTypeStr,
      "isInput": isInput,
      "isOutput": !isInput
    ]
  }
}


