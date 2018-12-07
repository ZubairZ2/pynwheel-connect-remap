class LoadOldCommunitiesJob < ApplicationJob
  include SuckerPunch::Job

  def perform
    load_old_communities_service = LoadOldCommunitiesService.new
    load_old_communities_service.perform
  end
end