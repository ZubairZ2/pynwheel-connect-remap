class AddCropXToUnit < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :crop_x, :float
    add_column :units, :crop_y, :float
    add_column :units, :crop_w, :float
    add_column :units, :crop_h, :float

    add_column :units, :crop_x_secondary, :float
    add_column :units, :crop_y_secondary, :float
    add_column :units, :crop_w_secondary, :float
    add_column :units, :crop_h_secondary, :float

    add_column :units, :image_bit, :boolean
    add_column :units, :do_crop, :boolean, default: false
    add_column :units, :do_crop_secpndary, :boolean, default: false
  end
end
