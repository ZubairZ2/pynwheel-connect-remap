class CommunitiesController < ApplicationController

  def new
    @community = Community.new
  end

  def create
    @community = Community.new(community_params)
    if @community.save
      flash[:notice] = "Community created successfully."
      redirect_to root_path
    else
      flash[:notice] = @community.errors.full_messages.join(',')
      render :new
    end
  end

end