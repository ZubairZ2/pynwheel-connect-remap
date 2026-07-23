class ApartmentWebsiteUrl < ActiveRecord::Migration[7.2]
  def change
    add_column :credentials, :apartmentlist_url, :string
  end
end
