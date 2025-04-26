class CreateSubCommunities < ActiveRecord::Migration[7.2]
  def change
    create_table :sub_communities do |t|
      t.string :name
      t.string :property_id
      t.references :community, null: false, foreign_key: true

      t.timestamps
    end
  end
end
