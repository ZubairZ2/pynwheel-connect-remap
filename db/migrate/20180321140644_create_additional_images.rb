class CreateAdditionalImages < ActiveRecord::Migration[5.0]
  def change
    create_table :additional_images do |t|
      t.string :image
      t.integer :sort
      t.string :name
      t.references :imagepage, foreign_key: true

      t.timestamps
    end
  end
end
