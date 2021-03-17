class CreateRegions < ActiveRecord::Migration[5.0]
  def change
    create_table :regions do |t|
      t.string  :name
      t.string  :contact
      t.string  :phone
      t.string  :email
      t.integer :creator_id
      t.references :company, foreign_key: true

      t.timestamps
    end
    add_reference :communities, :region, index: true
  end
end
