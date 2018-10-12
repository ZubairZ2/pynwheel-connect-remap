class ImportPsiSwapDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)

    psi_swap_service = PsiSwapService.new(JSON.parse(credentials))
    psi_swap_service.perform
  end
end
