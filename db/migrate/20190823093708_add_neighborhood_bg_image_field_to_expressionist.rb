class AddNeighborhoodBgImageFieldToExpressionist < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :display_neighborhood_bg_image, :boolean
    add_column :expressionists, :neighborhood_bg_image, :string
  end
end
