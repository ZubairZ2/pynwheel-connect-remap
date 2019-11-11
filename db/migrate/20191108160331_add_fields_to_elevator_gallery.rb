class AddFieldsToElevatorGallery < ActiveRecord::Migration[5.0]
  def change
    add_column :elevator_galleries, :description, :string, default: ""
    add_column :elevator_galleries, :directional_text, :string, default: ""
  end
end
