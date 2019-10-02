class AddIdMismatchToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :id_selfie_mismatch, :boolean, default: true, null: true
  end
end
