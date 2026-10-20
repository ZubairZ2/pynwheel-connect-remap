# The booking rules the October 20, 2026 Settings design adds on top of the
# legacy scheduler columns (Scheduling::Settings): a buffer between tours, a
# minimum notice, a booking horizon, the Pynwheel Tour app's Schedule-screen
# options, the booking button's text colour and icon, and dated closures.
# Additive only: every default reproduces today's behaviour (no buffer, no
# notice, no horizon, the app's current demo defaults, a white button label),
# so a legacy server that never reads these columns keeps working unchanged,
# and the legacy Tour Settings page writes its own named columns only.
class AddBookingWindowAndAppOptions < ActiveRecord::Migration[7.2]
  def change
    add_column :tour_settings, :buffer_minutes, :integer, default: 0, null: false
    add_column :tour_settings, :minimum_notice_minutes, :integer, default: 0, null: false
    add_column :tour_settings, :booking_horizon_days, :integer
    add_column :tour_settings, :app_after_hours_label, :boolean, default: true, null: false
    add_column :tour_settings, :app_allow_shorter_tour, :boolean, default: true, null: false
    add_column :tour_settings, :app_party_size_limit, :integer, default: 6, null: false
    add_column :tour_settings, :app_ask_unit, :boolean, default: true, null: false
    add_column :tour_settings, :app_show_text_booking, :boolean, default: true, null: false

    add_column :scheduler_widget_settings, :btn_text_color, :string, default: '#ffffff'
    add_column :scheduler_widget_settings, :btn_icon, :string

    create_table :tour_closures do |t|
      t.integer :community_id, null: false
      t.date :date, null: false
      t.string :label
      t.boolean :closed_all_day, default: true, null: false
      t.string :start_time
      t.string :end_time
      t.timestamps
    end
    add_index :tour_closures, :community_id
    add_index :tour_closures, %i[community_id date start_time], unique: true
  end
end
