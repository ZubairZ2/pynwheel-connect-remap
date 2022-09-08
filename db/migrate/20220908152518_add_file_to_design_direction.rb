class AddFileToDesignDirection < ActiveRecord::Migration[5.0]
  def change
    add_column :design_directions, :file, :string
  end
end
