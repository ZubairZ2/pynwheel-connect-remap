class AddPositionFieldToImagepages < ActiveRecord::Migration[5.0]
  def change
    add_column :imagepages, :position, :integer
  end
end
