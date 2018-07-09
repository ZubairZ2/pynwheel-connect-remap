class AddEqualHousingOpportunityLogoAndHandicapAccessibleLogoFieldsToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :equal_housing_opportunity_logo, :boolean,default: true
    add_column :communities, :handicap_accessible_logo, :boolean,default: true
  end
end
