class AddMapBackgroundSvg < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :background_svg_image, :string
  end
end
