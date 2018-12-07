class CreateCommunities < ActiveRecord::Migration[5.0]
  def change
    create_table :communities do |t|
      t.string :name
      t.string :logo
      t.string :address
      t.string :city
      t.string :state
      t.string :zip
      t.string :email
      t.string :phone
      t.string :description
      t.decimal :latitude
      t.decimal :longitude
      t.boolean :locked
      t.string :data_provider
      t.references :company, foreign_key: true

      t.timestamps
    end
  end
end
