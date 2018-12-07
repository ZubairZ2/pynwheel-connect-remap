class AddZarembaPropertyIdFieldToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :zaremba_property_id, :string
  end
end
