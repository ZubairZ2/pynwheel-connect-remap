class AddColumnApplyNowToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :apply_now, :boolean, :default => false
  end
end
