class AddMapLogoField < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :map_logo, :string
  end
end