class CreateOtherLocks < ActiveRecord::Migration[5.0]
  def change
    create_table :other_locks do |t|
      t.string :description
      t.references :community, foreign_key: true
      t.timestamps
    end
  end
end
