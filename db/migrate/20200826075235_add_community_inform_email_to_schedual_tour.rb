class AddCommunityInformEmailToSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :community_inform_email, :boolean, default: false
  end
end
