class AddImageBitFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :image_bit, :boolean
  end
end
