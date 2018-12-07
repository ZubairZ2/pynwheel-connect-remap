class CreateImagepages < ActiveRecord::Migration[5.0]
  def change
    create_table :imagepages do |t|
      t.string :name
      t.boolean :is_slideshow
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
