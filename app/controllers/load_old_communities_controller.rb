class LoadOldCommunitiesController < ApplicationController
  # include Error::ErrorHandler
  def index

  end
  def load_data_method
    locj = LoadOldCommunitiesJob.new
    locj.perform
    redirect_to load_data_method_community_load_old_communities_path :flash=>"Done"
  end
end