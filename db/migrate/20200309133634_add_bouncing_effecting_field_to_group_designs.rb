class AddBouncingEffectingFieldToGroupDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :group_designs, :bouncing_effecting, :string
    add_column :group_designs, :video, :string
    add_column :group_designs, :loop_type, :string, default: "images"
  end
end
