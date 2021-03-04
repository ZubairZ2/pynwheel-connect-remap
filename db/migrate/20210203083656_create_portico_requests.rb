class CreatePorticoRequests < ActiveRecord::Migration[5.0]
  def change
    create_table :portico_requests do |t|
      t.string :app_name
      t.integer :user_id
      t.string :os_type
      t.string :app_version

      t.timestamps
    end
  end
end
