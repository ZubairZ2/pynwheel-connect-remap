class CreateFavoriteSettings < ActiveRecord::Migration[5.0]
  def change
    create_table :favorite_settings do |t|
      t.references :community, foreign_key: true
      t.string :email_from
      t.string :email_bcc

      t.timestamps
    end
  end
end
