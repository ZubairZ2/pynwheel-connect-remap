class CreateSitemaps < ActiveRecord::Migration[5.0]
  def change
    create_table :sitemaps do |t|
      t.string :image
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
