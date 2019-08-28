class AddCropXFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :crop_x, :float
    add_column :communities, :crop_y, :float
    add_column :communities, :crop_w, :float
    add_column :communities, :crop_h, :float

    add_column :communities, :crop_x_secondary, :float
    add_column :communities, :crop_y_secondary, :float
    add_column :communities, :crop_w_secondary, :float
    add_column :communities, :crop_h_secondary, :float

    add_column :floorplans, :crop_x, :float
    add_column :floorplans, :crop_y, :float
    add_column :floorplans, :crop_w, :float
    add_column :floorplans, :crop_h, :float

    add_column :floorplans, :crop_x_secondary, :float
    add_column :floorplans, :crop_y_secondary, :float
    add_column :floorplans, :crop_w_secondary, :float
    add_column :floorplans, :crop_h_secondary, :float

    add_column :floorplans, :image_bit, :boolean

    add_column :additional_images, :crop_x, :float
    add_column :additional_images, :crop_y, :float
    add_column :additional_images, :crop_w, :float
    add_column :additional_images, :crop_h, :float

  end
end
