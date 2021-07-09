class AddIsSmsEnabledInTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :is_sms_enabled, :boolean, :default => true
  end
end
