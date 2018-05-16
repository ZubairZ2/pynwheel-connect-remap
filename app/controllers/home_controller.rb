class HomeController < ApplicationController
  def index
  	puts '----------------------' , current_user.inspect
  	if current_user.is_super_admin?
    	@communities = Community.select(:id,:name,:updated_at,:company_id).includes(:company)
    else
    	company = current_user.company
    	@communities = company.communities
    end
  end
end