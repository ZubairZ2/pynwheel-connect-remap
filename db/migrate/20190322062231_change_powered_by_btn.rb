class ChangePoweredByBtn < ActiveRecord::Migration[5.0]
  def change
    change_column :communities, :powered_by_btn, :boolean, :default => true
  end
end
