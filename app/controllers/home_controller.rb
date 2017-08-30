class HomeController < ApplicationController
  def index
    @floorplans = Floorplan.all.page(params[:page]).per(10)
  end
  def units
    @units = Unit.all.page(params[:page]).per(10)
  end

end