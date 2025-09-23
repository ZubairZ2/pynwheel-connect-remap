class AddBeansSvgToggle < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :is_beans_svg, :boolean, default: false
  end
end
