class AddStatusDatesToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :production_started_date, :date
    add_column :communities, :released_date, :date
    add_column :communities, :submitted_final_approval_date, :date
  end
end
