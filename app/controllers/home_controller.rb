class HomeController < ApplicationController
  before_action :authenticate_user!
  def index
    @communities = current_company.communities
  end

end