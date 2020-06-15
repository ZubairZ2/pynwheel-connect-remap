class AddAvailabilityUrlDeepLinkingFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :availability_url_deep_linking, :string
  end
end
