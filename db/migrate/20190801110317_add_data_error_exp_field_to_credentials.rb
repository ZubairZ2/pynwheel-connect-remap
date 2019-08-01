class AddDataErrorExpFieldToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :data_error_exp, :string
  end
end
