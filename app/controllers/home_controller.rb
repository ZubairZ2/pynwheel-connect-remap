class HomeController < ApplicationController
  def index
  	if current_user.is_super_admin?
    	@communities = Community.select(:id,:name,:updated_at,:company_id,:data_provider).includes(:company)
    else
    	company = current_user.company
    	@communities = company.communities
    end
  end
end