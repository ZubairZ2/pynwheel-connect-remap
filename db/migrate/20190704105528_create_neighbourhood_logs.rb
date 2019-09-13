class CreateNeighbourhoodLogs < ActiveRecord::Migration[5.0]
  def change
    create_table :neighbourhood_logs do |t|
      t.string :from_ip
      t.string :cat

      t.timestamps
    end
  end
end
