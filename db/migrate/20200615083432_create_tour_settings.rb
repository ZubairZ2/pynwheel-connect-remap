class CreateTourSettings < ActiveRecord::Migration[5.0]
  def change
    create_table :tour_settings do |t|
      t.boolean :show_checklist
      t.boolean :show_first_name
      t.boolean :show_last_name
      t.boolean :show_phone
      t.boolean :show_email
      t.boolean :show_desired_bedroom
      t.boolean :show_desired_move_in_date
      t.integer :desired_bedroom
      t.date :desired_move_in_date
      t.references :tour, foreign_key: true

      t.timestamps
    end
  end
end
