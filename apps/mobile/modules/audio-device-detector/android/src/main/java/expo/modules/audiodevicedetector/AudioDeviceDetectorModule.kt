package expo.modules.audiodevicedetector

import android.content.Context
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AudioDeviceDetectorModule : Module() {

  private var audioDeviceCallback: AudioDeviceCallback? = null
  private var isObserving = false

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("ReactApplicationContext is null")

  private val audioManager: AudioManager?
    get() = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("AudioDeviceDetector")

    Events(
      "onAudioDeviceConnected",
      "onAudioDeviceDisconnected",
      "onAudioDevicesChanged",
      "onActiveAudioOutputChanged"
    )

    AsyncFunction("getConnectedDevices") {
      return@AsyncFunction fetchConnectedDevices()
    }

    AsyncFunction("getActiveDevice") {
      return@AsyncFunction fetchActiveOutputDevice()
    }

    OnCreate {
      setupAudioDeviceCallback()
    }

    OnDestroy {
      teardownAudioDeviceCallback()
    }

    OnStartObserving {
      isObserving = true
      setupAudioDeviceCallback()
    }

    OnStopObserving {
      isObserving = false
      teardownAudioDeviceCallback()
    }
  }

  private fun fetchActiveOutputDevice(): Map<String, Any>? {
    val am = audioManager ?: return null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val commDevice = am.communicationDevice
      if (commDevice != null) {
        return deviceToMap(commDevice)
      }
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val devices = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      if (am.isBluetoothScoOn || am.isBluetoothA2dpOn) {
        val bt = devices.find { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP }
        if (bt != null) return deviceToMap(bt)
      }
      if (am.isWiredHeadsetOn) {
        val headset = devices.find { it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET || it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES }
        if (headset != null) return deviceToMap(headset)
      }
      if (am.isSpeakerphoneOn) {
        val speaker = devices.find { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
        if (speaker != null) return deviceToMap(speaker)
      }
      val earpiece = devices.find { it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE }
      if (earpiece != null) return deviceToMap(earpiece)

      val firstOutput = devices.firstOrNull()
      if (firstOutput != null) return deviceToMap(firstOutput)
    }
    return null
  }

  private fun fetchConnectedDevices(): List<Map<String, Any>> {
    val am = audioManager ?: return emptyList()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val devices = am.getDevices(AudioManager.GET_DEVICES_ALL)
      return devices.map { deviceToMap(it) }
    }
    return emptyList()
  }

  private fun setupAudioDeviceCallback() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && audioDeviceCallback == null) {
      val cb = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) {
          val allDevices = fetchConnectedDevices()
          val activeDevice = fetchActiveOutputDevice()
          for (device in addedDevices) {
            val deviceMap = deviceToMap(device)
            sendEvent(
              "onAudioDeviceConnected",
              mapOf(
                "device" to deviceMap,
                "allDevices" to allDevices,
                "timestamp" to System.currentTimeMillis()
              )
            )
          }
          if (activeDevice != null) {
            sendEvent(
              "onActiveAudioOutputChanged",
              mapOf(
                "activeDevice" to activeDevice,
                "allDevices" to allDevices,
                "timestamp" to System.currentTimeMillis()
              )
            )
          }
          sendEvent(
            "onAudioDevicesChanged",
            mapOf(
              "allDevices" to allDevices,
              "timestamp" to System.currentTimeMillis()
            )
          )
        }

        override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>) {
          val allDevices = fetchConnectedDevices()
          val activeDevice = fetchActiveOutputDevice()
          for (device in removedDevices) {
            val deviceMap = deviceToMap(device)
            sendEvent(
              "onAudioDeviceDisconnected",
              mapOf(
                "device" to deviceMap,
                "allDevices" to allDevices,
                "timestamp" to System.currentTimeMillis()
              )
            )
          }
          if (activeDevice != null) {
            sendEvent(
              "onActiveAudioOutputChanged",
              mapOf(
                "activeDevice" to activeDevice,
                "allDevices" to allDevices,
                "timestamp" to System.currentTimeMillis()
              )
            )
          }
          sendEvent(
            "onAudioDevicesChanged",
            mapOf(
              "allDevices" to allDevices,
              "timestamp" to System.currentTimeMillis()
            )
          )
        }
      }
      audioDeviceCallback = cb
      audioManager?.registerAudioDeviceCallback(cb, Handler(Looper.getMainLooper()))
    }
  }

  private fun teardownAudioDeviceCallback() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && audioDeviceCallback != null) {
      audioManager?.unregisterAudioDeviceCallback(audioDeviceCallback)
      audioDeviceCallback = null
    }
  }

  private fun deviceToMap(device: AudioDeviceInfo): Map<String, Any> {
    val name = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      device.productName.toString().ifBlank { getFallbackDeviceName(device.type) }
    } else {
      getFallbackDeviceName(device.type)
    }

    return mapOf(
      "id" to "${device.id}_${device.type}",
      "name" to name,
      "type" to getDeviceTypeName(device.type),
      "isInput" to device.isSource,
      "isOutput" to device.isSink
    )
  }

  private fun getDeviceTypeName(type: Int): String {
    return when (type) {
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "bluetooth"
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> "wired_headset"
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "wired_headphones"
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "builtin_speaker"
      AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "builtin_earpiece"
      AudioDeviceInfo.TYPE_BUILTIN_MIC -> "builtin_mic"
      AudioDeviceInfo.TYPE_USB_HEADSET,
      AudioDeviceInfo.TYPE_USB_DEVICE -> "usb_headset"
      else -> "unknown"
    }
  }

  private fun getFallbackDeviceName(type: Int): String {
    return when (type) {
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth Device"
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired Headset"
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "Wired Headphones"
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "Speaker"
      AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "Earpiece"
      AudioDeviceInfo.TYPE_BUILTIN_MIC -> "Built-in Microphone"
      AudioDeviceInfo.TYPE_USB_HEADSET,
      AudioDeviceInfo.TYPE_USB_DEVICE -> "USB Audio Device"
      else -> "Audio Device"
    }
  }
}
