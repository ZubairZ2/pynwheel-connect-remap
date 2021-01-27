class AddWidthFieldToSitemaps < ActiveRecord::Migration[5.0]
  def change
    add_column :sitemaps, :width, :integer, :default =>0
    add_column :sitemaps, :height, :integer, :default =>0
  end
end
