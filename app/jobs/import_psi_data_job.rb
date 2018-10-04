class ImportPsiDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)

    # psi_static_service = PsiStaticService.new(JSON.parse(credentials))
    # psi_static_service.perform

    psi_service = PsiService.new(JSON.parse(credentials))
    psi_service.perform
  end
end
