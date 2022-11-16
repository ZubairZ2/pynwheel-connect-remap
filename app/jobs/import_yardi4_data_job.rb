class ImportYardi4DataJob < ApplicationJob
  include SuckerPunch::Job
  #workers 4

  def perform(credentials)
    ActiveRecord::Base.connection_pool.with_connection do
      yardi4_service = Yardi4Service.new(JSON.parse(credentials))
      yardi4_service.perform
    end
  end
end
