class AddImageToSchalge < ActiveRecord::Migration[5.0]
  def change
    add_column :schlages, :image, :string
  end
end
