# One Pynwheel Touch layout for a property, per screen type: a device type
# (mobile / ipad / desktop) and an orientation (portrait / landscape), so at
# most six per property. `settings` is stored exactly as the app sends it; the
# server never reads inside it.
class TouchSetting < ApplicationRecord
  MAX_BYTES = 100.kilobytes

  DEVICE_TYPES        = %w[mobile ipad desktop].freeze
  DEVICE_ORIENTATIONS = %w[portrait landscape].freeze

  belongs_to :community

  validates :device_type,        inclusion: { in: DEVICE_TYPES }
  validates :device_orientation, inclusion: { in: DEVICE_ORIENTATIONS }

  def as_app_json
    {
      device_type:        device_type,
      device_orientation: device_orientation,
      settings:           settings,
      device_details:     device_details,
      updated_at:         updated_at
    }
  end
end
