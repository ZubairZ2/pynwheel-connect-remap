class AddPositionFieldToWebpages < ActiveRecord::Migration[5.0]
  def change
    add_column :webpages, :position, :integer
  end
end
