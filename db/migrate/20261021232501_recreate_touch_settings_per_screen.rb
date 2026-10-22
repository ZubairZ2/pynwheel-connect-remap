# Pynwheel Touch settings become one layout per screen type instead of one per
# property: a row per (property, device type, orientation), so a portrait kiosk
# and a landscape iPad each keep their own layout. See
# docs/touch-settings/v4-touch-settings-per-screen.md.
#
# Drops the v3 table rather than altering it: it shipped with no users, so
# there is no data to carry over, and a clean create is simpler than reshaping
# its columns and unique index.
class RecreateTouchSettingsPerScreen < ActiveRecord::Migration[7.2]
  def up
    drop_table :touch_settings, if_exists: true

    create_table :touch_settings do |t|
      t.integer :community_id,       null: false
      t.string  :device_type,        null: false   # mobile | ipad | desktop
      t.string  :device_orientation, null: false   # portrait | landscape
      t.jsonb   :settings,           null: false, default: {}
      # Optional info about the device that saved last.
      t.jsonb   :device_details,     null: false, default: {}
      t.timestamps
    end

    add_index :touch_settings, [:community_id, :device_type, :device_orientation],
              unique: true, name: "idx_touch_settings_screen"
    add_check_constraint :touch_settings, "device_type IN ('mobile', 'ipad', 'desktop')",
                         name: "touch_settings_device_type"
    add_check_constraint :touch_settings, "device_orientation IN ('portrait', 'landscape')",
                         name: "touch_settings_device_orientation"
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
