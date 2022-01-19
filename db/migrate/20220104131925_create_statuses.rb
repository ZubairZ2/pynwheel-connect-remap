class CreateStatuses < ActiveRecord::Migration[5.0]
  def change
    create_table :statuses do |t|
      t.integer :status
      t.bigint :statusable_id
      t.string :statusable_type
      t.integer :whodunnit

      t.timestamps
    end
  end
end
