class HomeController < ApplicationController
  def index
    @units = Unit.all
  end
  def floorplans
    @floorplans = Floorplan.all
  end

end