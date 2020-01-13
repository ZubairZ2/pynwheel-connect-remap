class TourUsersController < ApplicationController
  before_action :check_community
  before_action :breadCrumb

  def index
    @community = Community.find params[:community_id]
    user_ids = TourHistory.where(tour_id: @community.tour.present? ? @community.tour.id : nil).map{|x| x.tour_user_id}.uniq
    @tour_users = []
    user_ids.each {|x| @tour_users << TourUser.find_by_id(x)}
  end
  def show
    @community = Community.find params[:community_id]
    @tour_user = TourUser.find params[:id]
    @visited_stop = VisitedStop.where(tour_id: @community.tour.id,tour_user_id: @tour_user.id).group_by(&:tour_stop_id)
    @alerts = TourHistory.where(tour_user_id: @tour_user.id, tour_id: @community.tour.id)
  end

  def breadCrumb
    add_breadcrumb "Home", root_path
    add_breadcrumb "Visitors", '#'
  end
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
  end
end
