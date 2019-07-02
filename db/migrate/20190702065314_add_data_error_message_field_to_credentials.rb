class AddDataErrorMessageFieldToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :data_error_message, :string
  end
end
