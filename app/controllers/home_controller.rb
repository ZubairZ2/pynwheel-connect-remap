class HomeController < ApplicationController
  def index
  	if current_user.is_super_admin?
    	@communities = Community.all
    else
    	company = current_user.company
    	@communities = company.communities
    end
  end
end