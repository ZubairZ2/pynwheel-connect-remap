class AddDuplicateOfToElevator < ActiveRecord::Migration[5.0]
  def change
    add_column :elevators, :duplicate_of, :integer
  end
end
