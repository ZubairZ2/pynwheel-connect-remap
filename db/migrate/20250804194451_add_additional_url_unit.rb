class AddAdditionalUrlUnit < ActiveRecord::Migration[7.2]
  def change
    add_column :units, :additional_button, :string
    add_column :units, :additional_url, :string
  end
end
