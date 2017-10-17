class AddLoopTypeToDesign < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :loop_type, :string,default: "images"
  end
end
