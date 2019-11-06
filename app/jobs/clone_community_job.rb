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

    # c_id = Community.last.id + 1
    # copy_community.galleries do |gallery|
    #   gallery.each do |image|
    #     image.community_id = c_id
    #   end
    # end


    copy_community.save validate:false



  end
end
