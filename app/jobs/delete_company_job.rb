class DeleteCompanyJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(company)
    company.destroy
  end
end
