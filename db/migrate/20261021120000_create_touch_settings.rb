# Pynwheel Touch settings, saved per property instead of only in each device's
# localStorage. See docs/touch-settings/v3-touch-settings-poc.md.
#
# One row per property. `settings` is the JSON the Touch app sends, stored
# as-is, so adding or removing a setting needs no migration. The device that
# saved last is kept alongside: device_type and platform as columns because
# reports filter on them, everything else it sent in `device`.
class CreateTouchSettings < ActiveRecord::Migration[7.2]
  def change
    create_table :touch_settings do |t|
      t.integer :community_id, null: false
      t.jsonb   :settings, null: false, default: {}
      t.string  :device_type   # phone | tablet | desktop
      t.string  :platform      # ios | android | pwa | web
      t.jsonb   :device, null: false, default: {}
      t.timestamps
    end

    add_index :touch_settings, :community_id, unique: true
  end
end
