class AddMapPathToPaths < ActiveRecord::Migration[5.0]
  def change
    add_reference :paths, :map_path_to, polymorphic: true
  end
end
