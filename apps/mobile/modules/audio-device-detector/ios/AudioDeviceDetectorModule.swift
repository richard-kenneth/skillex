import ExpoModulesCore
import AVFoundation

public class AudioDeviceDetectorModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("AudioDeviceDetector")

    Events(
      "onAudioDeviceConnected",
      "onAudioDeviceDisconnected",
      "onAudioDevicesChanged"
    )

    AsyncFunction("getConnectedDevices") { () -> [[String: Any]] in
      return self.fetchCurrentDevices()
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

  private func fetchCurrentDevices() -> [[String: Any]] {
    var devices: [[String: Any]] = []
    var seenIds = Set<String>()
    let session = AVAudioSession.sharedInstance()
    let route = session.currentRoute

    for output in route.outputs {
      let dict = self.portToDict(output, isInput: false)
      if let id = dict["id"] as? String {
        seenIds.insert(id)
      }
      devices.append(dict)
    }

    for input in route.inputs {
      let dict = self.portToDict(input, isInput: true)
      if let id = dict["id"] as? String {
        seenIds.insert(id)
      }
      devices.append(dict)
    }

    // Include pre-connected devices (e.g. Bluetooth connected before joining room)
    if let availableInputs = session.availableInputs {
      for input in availableInputs {
        let dict = self.portToDict(input, isInput: true)
        if let id = dict["id"] as? String, !seenIds.contains(id) {
          seenIds.insert(id)
          devices.append(dict)
        }
      }
    }

    return devices
  }

  private func startObservingAudioRoutes() {
    guard observer == nil else { return }

    observer = NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: AVAudioSession.sharedInstance(),
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
    guard let userInfo = notification.userInfo,
          let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
          let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
      return
    }

    let allDevices = fetchCurrentDevices()

    switch reason {
    case .newDeviceAvailable:
      let latestOutput = AVAudioSession.sharedInstance().currentRoute.outputs.last
      if let output = latestOutput {
        let deviceMap = self.portToDict(output, isInput: false)
        self.sendEvent("onAudioDeviceConnected", [
          "device": deviceMap,
          "allDevices": allDevices,
          "timestamp": Date().timeIntervalSince1970 * 1000
        ])
      }
    case .oldDeviceUnavailable:
      if let previousRoute = userInfo[AVAudioSessionRouteChangePreviousRouteKey] as? AVAudioSessionRouteDescription,
         let previousOutput = previousRoute.outputs.first {
        let deviceMap = self.portToDict(previousOutput, isInput: false)
        self.sendEvent("onAudioDeviceDisconnected", [
          "device": deviceMap,
          "allDevices": allDevices,
          "timestamp": Date().timeIntervalSince1970 * 1000
        ])
      }
    default:
      break
    }

    self.sendEvent("onAudioDevicesChanged", [
      "allDevices": allDevices,
      "timestamp": Date().timeIntervalSince1970 * 1000
    ])
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
