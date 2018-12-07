class AddColumnFileToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :file, :string
  end
end
