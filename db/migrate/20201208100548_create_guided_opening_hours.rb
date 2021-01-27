class CreateGuidedOpeningHours < ActiveRecord::Migration[5.0]
  def change
    create_table :guided_opening_hours do |t|
      t.string :day
      t.string :opening_time
      t.string :closing_time
      t.references :community, foreign_key: true
      t.integer :sort

      t.timestamps
    end
  end
end
