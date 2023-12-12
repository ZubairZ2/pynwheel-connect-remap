class AddRentCafeApiVersion < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :rentcafe_api_version, :string,  default: "Rentcafe V1"
  end
end
