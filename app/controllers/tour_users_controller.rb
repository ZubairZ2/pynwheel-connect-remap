class TourUsersController < ApplicationController
  before_action :check_community
  before_action :breadCrumb

  def index
    @tour_users = TourUser.all
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
