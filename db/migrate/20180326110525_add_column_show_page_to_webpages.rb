class AddColumnShowPageToWebpages < ActiveRecord::Migration[5.0]
  def change
    add_column :webpages, :hide_page, :boolean, default: false
  end
end
