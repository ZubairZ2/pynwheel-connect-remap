class AddNameToElevatorGallery < ActiveRecord::Migration[5.0]
  def change
    add_column :elevator_galleries, :name, :string
  end
end
