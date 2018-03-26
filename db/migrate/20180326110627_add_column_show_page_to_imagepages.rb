class AddColumnShowPageToImagepages < ActiveRecord::Migration[5.0]
  def change
    add_column :imagepages, :hide_page, :boolean, default: false
  end
end
