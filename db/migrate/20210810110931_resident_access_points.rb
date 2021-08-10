class ResidentAccessPoints < ActiveRecord::Migration[5.0]
  def change
    create_table :resident_access_points do |t|
      t.references :pynwheel_access_user, foreign_key: true
      t.integer :access_point_id
      t.string :access_point_type
      
      t.timestamps
    end

    add_index :resident_access_points, [:pynwheel_access_user_id, :access_point_id], unique: true, name: :resident_access_point_unique_index
  end
end
