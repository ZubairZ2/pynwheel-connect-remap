# The Pynwheel Touch settings for one property, plus the device that saved
# them last. `settings` is stored exactly as the app sends it; the server
# never reads inside it.
class TouchSetting < ApplicationRecord
  MAX_BYTES = 100.kilobytes

  belongs_to :community

  # Replaces the settings. The device info is replaced only when the app sent
  # one, so a save without it keeps the last known device.
  def assign_from_app(settings, device)
    self.settings = settings
    return unless device.is_a?(Hash)

    self.device      = device
    self.device      = device
    self.device_type = device["device_type"].to_s.strip.first(20).presence
    self.platform    = device["platform"].to_s.strip.first(20).presence
  end

  def as_app_json
    {
      success:     true,
      property_id: community_id,
      settings:    settings,
      device:      device,
      updated_at:  updated_at
    }
  end
end
