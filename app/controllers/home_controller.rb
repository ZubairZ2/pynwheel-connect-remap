class HomeController < ApplicationController
  before_action :check_community
  def index
  	if current_user.is_super_admin?
    	@communities = Community.select(:id,:name,:updated_at,:company_id,:data_provider).includes(:company)
    else
    	@communities = current_user.communities
    end
  end
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
  end
end