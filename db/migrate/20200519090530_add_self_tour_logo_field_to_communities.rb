class AddSelfTourLogoFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :self_tour_logo, :string
    add_column :communities, :self_tour_logo_cropped, :boolean, default: false
  end
end
