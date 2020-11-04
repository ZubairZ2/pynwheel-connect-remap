class HomeController < ApplicationController
  before_action :check_community
  def index
  	if current_user.is_super_admin?
    	@communities = alphabetical_sort(Community.select(:id,:name,:updated_at,:company_id,:data_provider).includes(:company))
    elsif current_user.is_dwelo_admin?
      assigned_communities_ids = current_user.communities.ids
      dwelo_communities_ids = alphabetical_sort(Community.where(creator_id: User.all.map{|u| u.id if u.role == "Dwelo admin"}.compact)).pluck(:id)
      ids = (assigned_communities_ids + dwelo_communities_ids).uniq
      @communities = alphabetical_sort(Community.where(id: ids))
    else
    	@communities = current_user.communities
    end
  end
end