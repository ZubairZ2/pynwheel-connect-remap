class AddSecondaryLogoToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :secondary_logo, :string
  end
end
