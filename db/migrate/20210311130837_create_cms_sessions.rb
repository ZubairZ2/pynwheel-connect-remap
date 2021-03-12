class CreateCmsSessions < ActiveRecord::Migration[5.0]
  def change
    create_table :cms_sessions do |t|
    	t.datetime :start_datetime
    	t.datetime :end_datetime
    	t.integer :visited_pages_counter, :default => 0
    	t.integer :communities_ids, array: true, default: []
    	t.references :user, foreign_key: true
      t.timestamps
    end
  end
end
