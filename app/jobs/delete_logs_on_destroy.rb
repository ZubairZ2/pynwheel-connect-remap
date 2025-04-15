class DeleteLogsOnDestroy < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(community,design_id)
    #PaperTrail::Version.where('object LIKE ?', "%community_id: #{community}%").destroy_all
    #PaperTrail::Version.where('object LIKE ?', "%design_id: #{design_id}%").destroy_all
    #PaperTrail::Version.where('object LIKE ?', "%community_id: '#{community}%'").destroy_all

  end
end
