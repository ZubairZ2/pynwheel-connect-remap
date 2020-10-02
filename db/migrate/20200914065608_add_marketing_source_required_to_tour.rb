class AddMarketingSourceRequiredToTour < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :marketing_source_required, :boolean, default: false
  end
end
