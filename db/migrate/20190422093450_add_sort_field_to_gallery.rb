class AddSortFieldToGallery < ActiveRecord::Migration[5.0]
  def change
    add_column :galleries, :sort, :integer
  end
end
