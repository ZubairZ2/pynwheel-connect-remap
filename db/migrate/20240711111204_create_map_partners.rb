class CreateMapPartners < ActiveRecord::Migration[5.0]
  def change
    create_table :map_partners do |t|
      t.references :community, null: false, foreign_key: true
      t.string :partner, null: false
      t.string :api_key, null: false

      t.timestamps
    end

    add_index :map_partners, [:community_id, :partner, :api_key], unique: true, name: 'index_map_partners_on_community_partner_api_key'
  end
end
