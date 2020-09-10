class CreateOpeningHours < ActiveRecord::Migration[5.0]
  def change
    create_table :opening_hours do |t|
      t.string :day
      t.string :opening_time
      t.string :closing_time
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
