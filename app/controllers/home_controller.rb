class HomeController < ApplicationController
  before_action :check_community
  def index
  	if current_user.is_super_admin?
    	@communities = alphabetical_sort(Community.select(:id,:name,:updated_at,:company_id,:data_provider).includes(:company))
    elsif current_user.is_dwelo_admin?
      assigned_communities_ids = current_user.communities.ids # all assinged communities
      dwelo_communities_ids = Community.where(creator_id: User.where(role: "Dwelo admin").ids).ids # all communities created by any dwelo admin
      dwelo_companies_communities = Community.joins(:company).where(companies: {creator_id: User.where(role: "Dwelo admin").ids}).ids # all communities under dwelo_companies (either created by dwelo_admin or super_admin)
      ids = (assigned_communities_ids + dwelo_communities_ids + dwelo_companies_communities).uniq
      @communities = Community.where(id: ids)
    else
    	@communities = current_user.communities
    end
  end
end