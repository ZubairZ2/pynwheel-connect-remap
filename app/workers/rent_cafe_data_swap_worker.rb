class RentCafeDataSwapWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'yardi_rent_cafe', retry: 1

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?
    
    if community&.credential&.rentcafe_api_version === "RentCafe V2"
      rentcafe_swap_service = YardiRentCafeV2SwapService.new(community.credential)
    else
      rentcafe_swap_service = YardiRentCafeSwapService.new(community.credential)
    end

    rentcafe_swap_service.perform
  end

end