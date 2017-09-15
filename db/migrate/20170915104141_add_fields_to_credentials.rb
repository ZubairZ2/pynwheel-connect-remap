class AddFieldsToCredentials < ActiveRecord::Migration[5.0]
  def change
  	remove_column :credentials, :domain , :string
  	emove_column :credentials, :host , :string
    add_column :credentials, :url, :string
    add_column :credentials, :site_id, :string
    add_column :credentials, :c_code, :string
    add_column :credentials, :p_code, :string
  end
end
