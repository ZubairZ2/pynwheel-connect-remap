class HomeController < ApplicationController
  def index
    @floorplans = Community.first.floorplans.page(params[:page]).per(10) rescue []
  end

end