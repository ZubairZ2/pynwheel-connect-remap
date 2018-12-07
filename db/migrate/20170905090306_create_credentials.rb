class CreateCredentials < ActiveRecord::Migration[5.0]
  def change
    create_table :credentials do |t|
      t.references :community, foreign_key: true
      t.string :domain
      t.string :password
      t.string :username
      t.string :property_id
      t.string :pmc_id
      t.string :licence_key
      t.string :host
      t.string :server_name
      t.string :database
      t.string :platform
      t.string :interface_entity

      t.timestamps
    end
  end
end
