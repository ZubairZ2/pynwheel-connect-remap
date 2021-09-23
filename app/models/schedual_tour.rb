# == Schema Information
#
# Table name: schedual_tours
#
#  id                :integer          not null, primary key
#  tour_date         :date
#  tour_time         :time
#  tour_user_id      :integer
#  tour_id           :integer
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  community_id      :integer
#  hourly_email_sent :boolean          default(FALSE)
#  daily_email_sent  :boolean          default(FALSE)
#  user_time_zone    :string
#  day_diff          :integer
#

class SchedualTour < ApplicationRecord
  has_paper_trail
  belongs_to :tour_user, optional: true
  belongs_to :tour, optional: true
  belongs_to :community, optional: true
  after_create :create_knock_prospect
  after_create :create_knock_appointment

  # validates :tour_date, presence: true
  # validates :tour_type, presence: true
  # validates :tour_time, presence: true

  scope :desc_created_at, -> {order(tour_date: :desc)}

  COUNTRY_CODES =  JSON.parse(File.read(Rails.root.join("app/assets/javascripts/country_codes.json")))
  
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

  def create_knock_prospect
    knock_prospect = KnockService.new(knock_api_key).create_prospect(knock_prospect_payload) if is_knock_crm

    if knock_prospect && knock_prospect.success?
      add_knock_prospect_id(knock_prospect["payload"]["id"])
    end
  end

  def create_knock_appointment
    if is_knock_crm && self.property_tour_type === "scheduled_tour"

    end
  end

  private

  def add_knock_prospect_id id
    self.update_attributes(knock_prospect_id: id)
  end

  def is_knock_crm
    ( self&.community&.crm_credential&.crm_provider === "knock" && self&.community&.crm_credential&.knock_community_id && self&.community&.crm_credential&.knock_api_key )
  end

  def knock_api_key
    self&.community&.crm_credential&.knock_api_key
  end

  def knock_prospect_payload
    {
      "communityId": self&.community&.crm_credential&.knock_community_id,
      "firstName": self&.tour_user&.first_name,
      "lastName": self&.tour_user&.last_name,
      "email": self&.tour_user&.email,
      "phone": self&.tour_user&.phone_number,
      "address": self&.community&.address,
      "city": self&.community&.city,
      "state": self&.community&.state.slice(0, 2).upcase,
      "zip": self&.community&.zip,
      "autorespond": true,
      "sourceTitle": "Property Website",
      "moveDate": self&.desired_move_in_date.strftime("%F").to_s,
      "bedrooms": desire_bedrooms,
      "occupants": 1,
      "leaseTermMonths": 12,
      "minBudget": 1000,
      "maxBudget": 2000,
      "message": knock_message, 
      "firstContactType": "internet",
      "smsConsent": true,
      "smsConsentDisclaimer": "I consent to appointment updates via SMS communication",
      "smsConsentUrl": self&.community&.crm_credential&.knock_sms_consent_url,
      "prospectIpAddress": "55.55.555.555"
    }
  end

  def knock_appointment_payload
    {
      "communityId": self&.community&.crm_credential&.knock_community_id,
      "requestedTimes": [
        {
          "startTime": knock_tour_date_time
        }
      ],
      "profile": {
        "firstName": self&.tour_user&.first_name,
        "lastName": self&.tour_user&.last_name,
        "email": self&.tour_user&.email,
        "phone": self&.tour_user&.phone_number,
        "moveDate": self&.desired_move_in_date.strftime("%F").to_s,
        "bedrooms": desire_bedrooms,
        "occupants": 1,
        "leaseTermMonths": 12,
        "minBudget": 1000,
        "maxBudget": 2000,
        "pets": []
      },
      "message": knock_message, 
      "firstContactType": "internet",
      "smsConsent": true,
      "smsConsentDisclaimer": "I consent to appointment updates via SMS communication",
      "smsConsentUrl": self&.community&.crm_credential&.knock_sms_consent_url,
      "sourceTitle": "Property Website",
      "tourType": knock_tour_type
    }
  end

  def knock_tour_type
    case self.tour_type
    when "guided_tour"
      "IN_PERSON"
    when ("self_tour" or "virtual_tour")
      "SELF_GUIDED"
    end  
  end

  def desire_bedrooms
    ["#{self.desired_bedroom}_BEDROOMS"]
  end

  def knock_message
    case self.property_tour_type
    when "scheduled_tour"
      "Pynwheel scheduled tour: "
    when "unscheduled_self_tour"
      "Pynwheel unscheduled self-tour: Prospect will visit at his/her own convenience during property visiting hours and appointment will be created right after the tour and also visit will be registered."
    when "remote_tour"
      "Pynwheel remote/virtual tour: Prospect will visit at his/her own convenience anytime from the comfort of their home using self-tour app."
    else
      "Error: No message"
    end
  end

  def knock_tour_date_time
    timezone = get_community_time_zone(self.community)
    tour_datetime = (self.tour_date.to_s + " " + self.tour_time.strftime("%I:%M%p")).in_time_zone(timezone)
  end

  def get_community_time_zone(community)
    tz = Ziptz.new
    timezone = nil

    if community.latitude.present? and community.longitude.present?
      time_zone = Timezone.lookup(community.latitude, community.longitude)
      timezone = time_zone.name
    end

    if timezone.nil? and community.zip.present?
      timezone = tz.time_zone_name(community.zip)
    end

      return timezone
    rescue
      return "UTC"
  end

end
