class CloneCommunityJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(community)
    copy_community = community.amoeba_dup
    copy_community.name = community.name + " (Copy)"
    copy_community.code = community.code.present? ? community.code + " (Copy)" : ""
    copy_community.save validate:false
  end
end
