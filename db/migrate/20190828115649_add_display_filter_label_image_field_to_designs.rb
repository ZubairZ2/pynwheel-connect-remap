class AddDisplayFilterLabelImageFieldToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :display_filter_label_image, :boolean
    add_column :designs, :filter_label_image, :string
  end
end
