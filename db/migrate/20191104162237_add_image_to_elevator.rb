class AddImageToElevator < ActiveRecord::Migration[5.0]
  def change
    add_column :elevators, :image, :string
  end
end
