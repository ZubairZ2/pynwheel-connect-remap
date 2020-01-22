class AddMapPathFromPaths < ActiveRecord::Migration[5.0]
  def change
    add_reference :paths, :map_path_from, polymorphic: true
  end
end
