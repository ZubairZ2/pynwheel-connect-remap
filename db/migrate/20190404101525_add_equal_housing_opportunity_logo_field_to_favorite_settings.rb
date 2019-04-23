class AddEqualHousingOpportunityLogoFieldToFavoriteSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :favorite_settings, :equal_housing_opportunity_logo, :boolean, default: true
    add_column :favorite_settings, :handicap_accessible_logo, :boolean, default: true
  end
end
