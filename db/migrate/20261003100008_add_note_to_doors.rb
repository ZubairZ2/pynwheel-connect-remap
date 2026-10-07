# A visitor instruction on a door/gate stop (a plate-attached access point).
class AddNoteToDoors < ActiveRecord::Migration[7.2]
  def change
    add_column :doors, :note, :text
  end
end
