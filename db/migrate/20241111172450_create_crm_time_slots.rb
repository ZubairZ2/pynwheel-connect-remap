class CreateCrmTimeSlots < ActiveRecord::Migration[5.0]
  def change
    create_table :crm_time_slots do |t|
      t.jsonb :slots

      t.references :community, foreign_key: true
      t.timestamps
    end
  end
end
