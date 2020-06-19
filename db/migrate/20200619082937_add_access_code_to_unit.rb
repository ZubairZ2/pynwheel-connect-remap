class AddAccessCodeToUnit < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :access_code, :string
  end
end
