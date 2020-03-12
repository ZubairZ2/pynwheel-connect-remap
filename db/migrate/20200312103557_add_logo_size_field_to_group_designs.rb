class AddLogoSizeFieldToGroupDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :group_designs, :logo_size, :string
  end
end
