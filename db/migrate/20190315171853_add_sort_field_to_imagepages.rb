class AddSortFieldToImagepages < ActiveRecord::Migration[5.0]
  def change
    add_column :imagepages, :sort, :integer
  end
end
