Pod::Spec.new do |s|
  s.name           = 'AudioDeviceDetector'
  s.version        = '1.0.0'
  s.summary        = 'Local Expo module to detect connected audio devices and route changes on iOS.'
  s.description    = 'Local Expo module to detect connected audio devices and route changes on iOS.'
  s.homepage       = 'https://github.com/richard-kenneth/skillex'
  s.license        = { :type => 'AGPL-3.0-only', :text => 'AGPL-3.0-only. See https://www.gnu.org/licenses/agpl-3.0.txt' }
  s.author         = { 'Richard Kenneth' => 'richard-kenneth@users.noreply.github.com' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'

  s.swift_version  = '5.0'
end
