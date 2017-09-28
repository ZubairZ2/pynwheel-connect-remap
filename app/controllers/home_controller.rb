class HomeController < ApplicationController
  before_action :authenticate_user!
  def index
  	if current_user.is_super_admin?
    	@communities = Community.all
    else
    	company = current_user.company
    	@communities = company.communities
    end
  end
end