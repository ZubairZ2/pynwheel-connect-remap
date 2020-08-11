class CreateRealpageGciJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials)
        puts '============='
        puts credentials
        puts '============='
        real_page_gci_service = RealPageGciService.new(JSON.parse(credentials))
        real_page_gci_service.perform
    end
  end
  