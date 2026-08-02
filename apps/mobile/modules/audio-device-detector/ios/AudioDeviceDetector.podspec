Pod::Spec.new do |s|
  s.name           = 'AudioDeviceDetector'
  s.version        = '1.0.0'
  s.summary        = 'Local Expo module to detect connected audio devices and route changes on iOS.'
  s.description    = 'Local Expo module to detect connected audio devices and route changes on iOS.'
  s.homepage       = 'https://github.com/richardkenneth10/skil-ex2'
  s.license        = 'MIT'
  s.author         = { 'Developer' => 'dev@example.com' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'

  s.swift_version  = '5.0'
end
