class AddNeighborhoodCounterFieldToAppVersions < ActiveRecord::Migration[5.0]
  def change
    add_column :app_versions, :neighborhood_counter, :integer
  end
end
