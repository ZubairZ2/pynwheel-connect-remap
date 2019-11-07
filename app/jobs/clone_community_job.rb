class CloneCommunityJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(community)
    copy_community = community.amoeba_dup
    count = nil
    while Community.where(name: community.name + " (Copy#{count.present? ? count : ''})").count > 0
      if count.nil?
        count = 2
      else
        count = count + 1
      end
    end
    copy_community.name = community.name + " (Copy#{count.present? ? count : ""})"
    copy_community.code = (community.code.present? ? community.code + " (Copy#{(count.present? ? count : '')})" : "")

    copy_community.save validate:false
    return copy_community


  end
end
