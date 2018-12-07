class AddColumnEmailBodyToFavoriteSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :favorite_settings, :email_body, :text
  end
end
