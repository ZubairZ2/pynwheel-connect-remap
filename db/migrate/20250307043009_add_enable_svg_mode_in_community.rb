class AddEnableSvgModeInCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :enable_svg_mode, :boolean, default: false
  end
end
