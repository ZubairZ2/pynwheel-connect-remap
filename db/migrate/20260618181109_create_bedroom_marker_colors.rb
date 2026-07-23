class CreateBedroomMarkerColors < ActiveRecord::Migration[6.1]
  def change
    create_table :bedroom_marker_colors do |t|
      t.references :community, null: false, foreign_key: true
      t.integer    :bedroom,                 null: false
      t.string     :available_units_color,   null: false, default: "#f9d648"
      t.decimal    :available_units_opacity, null: false, default: "1.0", precision: 3, scale: 2
      t.string     :model_units_color,       null: false, default: "#f57396"
      t.decimal    :model_units_opacity,     null: false, default: "1.0", precision: 3, scale: 2
      t.timestamps
    end

    add_index :bedroom_marker_colors, [:community_id, :bedroom], unique: true
  end
end
