class AddAlertContactToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :alert_contact, :integer, default: 2
  end
end
