class DeleteCommunityJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(community)
    community.destroy
  end
end
