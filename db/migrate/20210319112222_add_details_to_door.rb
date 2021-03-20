class AddDetailsToDoor < ActiveRecord::Migration[5.0]
  def change
    add_column :doors, :lock_provider, :string, default: ""
    add_column :doors, :access_code, :string, default: ""
  end
end
