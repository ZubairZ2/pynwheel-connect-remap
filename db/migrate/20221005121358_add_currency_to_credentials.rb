class AddCurrencyToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :currency, :string, default: "840"
  end
end
