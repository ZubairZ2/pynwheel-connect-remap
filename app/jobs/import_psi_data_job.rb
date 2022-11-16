class ImportPsiDataJob < ApplicationJob
  include SuckerPunch::Job
  max_jobs 20
  workers 4
  
  def perform(credentials)
    ActiveRecord::Base.connection_pool.with_connection do
      psi_service = PsiService.new(JSON.parse(credentials))
      psi_service.perform
    end
  end
end
