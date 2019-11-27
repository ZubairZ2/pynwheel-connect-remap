class AddSitemmapRefToElevator < ActiveRecord::Migration[5.0]
  def change
    add_reference :elevators, :sitemap, foreign_key: true
  end
end
