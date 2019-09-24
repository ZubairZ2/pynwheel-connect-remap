class ImportPsiDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)

    # psi_static_service = PsiStaticService.new(JSON.parse(credentials))
    # psi_static_service.perform
    current_community.entrata_exception_logs = current_community.entrata_exception_logs + "main 1"
    current_community.save
    psi_service = PsiService.new(JSON.parse(credentials))
    psi_service.perform
  end
end
