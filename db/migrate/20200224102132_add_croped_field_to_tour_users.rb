class AddCropedFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :croped, :boolean, default: false
  end
end
