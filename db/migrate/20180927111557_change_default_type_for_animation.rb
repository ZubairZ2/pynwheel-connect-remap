class ChangeDefaultTypeForAnimation < ActiveRecord::Migration[5.0]
  def change
  	change_column :designs, :animation, :string, default: "bouncing effects"
  end
end
