class SchedualTour < ApplicationRecord
  has_paper_trail
  belongs_to :tour_user, optional: true
  belongs_to :tour, optional: true
  belongs_to :community, optional: true

  before_destroy :cancel_yardi_tour

  scope :desc_tour_date, -> {order('coalesce(tour_date, created_at) desc')}
  scope :scheduled_tours, -> {where.not(tour_user_id: nil,tour_date: nil,tour_time: nil)}

  COUNTRY_CODES =  JSON.parse(File.read(Rails.root.join("app/assets/javascripts/country_codes.json")))
  
  def cancel_yardi_tour
    return unless self.community.use_yardi_as_lead?
    YardiRentCafeServices::MarketingApisService.new(self).cancel_tour
  end

  def add_user_in_zerv
    if self.tour_user_id.present? and community.enable_locks and community.multiple_locks_provider.include?("Zerv")
      Thread.new do
        execution_context = Rails.application.executor.run!
        ZervServices::GrantAccessesService.call(community: community, tour_user: tour_user, stop_list: nil, is_resident: false)
      ensure
        execution_context.complete! if execution_context
      end
    end
  end

end
