class ImportYardiUsersDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    yardi_users_data_service = YardiUsersDataService.new(JSON.parse(credentials))
    yardi_users_data_service.perform
  end
end
  