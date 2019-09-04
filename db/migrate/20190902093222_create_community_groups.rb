class CreateCommunityGroups < ActiveRecord::Migration[5.0]
  def change
    create_table :community_groups do |t|
      t.string :name
      t.string :address
      t.string :code
      t.boolean :page_type, :default => false
      t.string :page_name
      t.string :logo
      t.boolean :inactivate, :default => true
      t.references :company, foreign_key: true

      t.timestamps
    end
  end
end
