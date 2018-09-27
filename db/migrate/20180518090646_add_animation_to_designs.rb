class AddAnimationToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :animation, :string, default: "bouncing effects"
  end
end
