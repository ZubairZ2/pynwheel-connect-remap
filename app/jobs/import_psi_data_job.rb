class ImportPsiDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    psi_service = PsiService.new(JSON.parse(credentials))
    psi_service.perform
  end
end
