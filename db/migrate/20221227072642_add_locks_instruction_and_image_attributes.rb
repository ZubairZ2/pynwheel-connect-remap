class AddLocksInstructionAndImageAttributes < ActiveRecord::Migration[5.0]
  def change
    add_column :dwelos, :lock_instruction_text, :string, default: ""
    add_column :dwelos, :lock_image, :string, default: ""

    add_column :edge_states, :lock_instruction_text, :string, default: ""
    add_column :edge_states, :lock_image, :string, default: ""

    add_column :latches, :lock_instruction_text, :string, default: ""
    add_column :latches, :lock_image, :string, default: ""

    add_column :zervs, :lock_instruction_text, :string, default: ""
    add_column :zervs, :lock_image, :string, default: ""

    add_column :igloohomes, :lock_instruction_text, :string, default: ""
    add_column :igloohomes, :lock_image, :string, default: ""
  end
end

