class AddAmenityLockAttributes < ActiveRecord::Migration[5.0]
  def change
    add_column :dwelos, :amenity_lock_instruction_text, :string, default: ""
    add_column :dwelos, :amenity_lock_image, :string, default: ""

    add_column :edge_states, :amenity_lock_instruction_text, :string, default: ""
    add_column :edge_states, :amenity_lock_image, :string, default: ""

    add_column :latches, :amenity_lock_instruction_text, :string, default: ""
    add_column :latches, :amenity_lock_image, :string, default: ""

    add_column :zervs, :amenity_lock_instruction_text, :string, default: ""
    add_column :zervs, :amenity_lock_image, :string, default: ""

    add_column :igloohomes, :amenity_lock_instruction_text, :string, default: ""
    add_column :igloohomes, :amenity_lock_image, :string, default: ""
  end
end
