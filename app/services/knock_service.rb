class KnockService < BaseService
  include KnockApisHelper

  def initialize scheduled_tour
    @scheduled_tour = scheduled_tour
  end
 
  def create_knock_prospect
    knock_prospect_response = create_prospect(knock_api_key, knock_prospect_payload) if is_knock_crm
    add_knock_prospect_id(knock_prospect_response["payload"]["id"]) if knock_prospect_response.present? && knock_prospect_response.success? && knock_prospect_response["payload"]["id"].present?
  end

  def create_knock_appointment
    knock_appointment_response = create_appointment(knock_api_key, knock_appointment_payload) if is_knock_crm && @scheduled_tour.property_tour_type === "scheduled_tour"
    add_knock_appointment_id(knock_appointment_response["appointment"]["id"])
  end

  def cancel_knock_appointment
    cancel_appointment(knock_api_key, @scheduled_tour.knock_appointment_id)  if is_knock_crm
  end

  def available_slots
    self_guided_available_time_slots = get_community_available_times(knock_api_key, get_knock_community_id, true) if is_knock_crm
    in_person_available_time_slots = get_community_available_times(knock_api_key, get_knock_community_id, false) if is_knock_crm
    self_guided_slots = formate_time_slots_array_to_hash(self_guided_available_time_slots["payload"]["acceptableTimes"]) if self_guided_available_time_slots.present? && self_guided_available_time_slots["payload"]["acceptableTimes"].present?
    in_person_slots = formate_time_slots_array_to_hash(in_person_available_time_slots["payload"]["acceptableTimes"]) if in_person_available_time_slots.present? && in_person_available_time_slots["payload"]["acceptableTimes"].present?
    tour_available_date = get_tour_available_dates(self_guided_slots, in_person_slots) if (self_guided_slots.present? || in_person_slots.present?)
  
    {available_dates: tour_available_date, self_guided_available_time_slots: self_guided_slots, in_person_available_time_slots: in_person_slots }
  end

  def knock_available_tour_types date, day, time
    is_slot_present_in_self_guided_tour(available_slots, date, time)
  end

  def knock_crm
    if is_knock_crm && @scheduled_tour.property_tour_type.present?
      create_knock_prospect
      create_knock_appointment if @scheduled_tour.property_tour_type === "scheduled_tour"
    end
  end

  private

  def is_slot_present_in_self_guided_tour knock_slots, date, time
    tour_type = []
    date = date.gsub('/',"-")

    is_self_guided_tour = knock_slots[:self_guided_available_time_slots][date]
    is_in_person_tour = knock_slots[:in_person_available_time_slots][date]

    if is_self_guided_tour.present? && is_self_guided_tour.include?(time)
      tour_type << ["guided_tour", "Guided Tour"]
    end

    if is_in_person_tour.present? && is_in_person_tour.include?(time)
      tour_type << ["self_tour", "Self Tour"]
    end

    tour_type
  end

  def get_tour_available_dates self_guided_slots, in_person_slots
    (self_guided_slots.keys | in_person_slots.keys).sort
  end

  def formate_time_slots_array_to_hash dates
    hash = dates.group_by(&:to_date)
    hash = hash.transform_keys{ |key| key.strftime('%m-%d-%Y') }

    available_time_slots = hash.transform_values do |v| 
      v.map do |time| 
        time.to_datetime.strftime("%l:%M %p").downcase.strip
      end 
    end

    available_time_slots
  end

  def add_knock_appointment_id appointment_id
    @scheduled_tour.update_attributes(knock_appointment_id: appointment_id)
  end

  def add_knock_prospect_id prospect_id
    @scheduled_tour.update_attributes(knock_prospect_id: prospect_id)
  end

  def is_knock_crm
    @scheduled_tour.community.is_knock_community?
  end

  def knock_api_key
    @scheduled_tour&.community&.crm_credential&.knock_api_key
  end

  def get_knock_community_id
    @scheduled_tour&.community&.crm_credential&.knock_community_id
  end

  def get_knock_consent_url
    @scheduled_tour&.community&.crm_credential&.knock_sms_consent_url
  end

  def prospect_move_in_date
    @scheduled_tour&.desired_move_in_date&.strftime("%F").to_s
  end
  
  def sms_consent_disclaimer
    "I consent to appointment updates via SMS communication for my self tour using Pynwheel mobile app."
  end

  def knock_tour_type
    case @scheduled_tour.tour_type
    when "guided_tour"
      "IN_PERSON"
    when "self_tour"
      "SELF_GUIDED"
    when "virtual_tour"      
      "SELF_GUIDED"
    end  
  end

  def desire_bedrooms
    if @scheduled_tour.desired_bedroom > 2
      ["3_OR_MORE_BEDROOMS"]
    else
      ["#{@scheduled_tour.desired_bedroom}_BEDROOMS"]
    end
  end

  def knock_message
    case @scheduled_tour.property_tour_type
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

  def knock_prospect_payload
    {
      "communityId": get_knock_community_id,
      "firstName": @scheduled_tour&.tour_user&.first_name,
      "lastName": @scheduled_tour&.tour_user&.last_name,
      "email": @scheduled_tour&.tour_user&.email,
      "phone": @scheduled_tour&.tour_user&.phone_number,
      "address": @scheduled_tour&.community&.address,
      "city": @scheduled_tour&.community&.city,
      "state": @scheduled_tour&.community&.state.slice(0, 2).upcase,
      "zip": @scheduled_tour&.community&.zip,
      "autorespond": true,
      "sourceTitle": "Property Website",
      "moveDate": prospect_move_in_date,
      "bedrooms": desire_bedrooms,
      "occupants": 1,
      "leaseTermMonths": 12,
      "minBudget": 1000,
      "maxBudget": 2000,
      "message": knock_message, 
      "firstContactType": "internet",
      "smsConsent": true,
      "smsConsentDisclaimer": sms_consent_disclaimer,
      "smsConsentUrl": get_knock_consent_url,
      "prospectIpAddress": @scheduled_tour.knock_prospect_ip_address
    }
  end

  def knock_appointment_payload
    {
      "communityId": get_knock_community_id,
      "requestedTimes": [
        {
          "startTime": "2021-09-29T09:00:00-07:00" #knock_tour_date_time
        }
      ],
      "profile": {
        "firstName": @scheduled_tour&.tour_user&.first_name,
        "lastName": @scheduled_tour&.tour_user&.last_name,
        "email": @scheduled_tour&.tour_user&.email,
        "phone": @scheduled_tour&.tour_user&.phone_number,
        "moveDate": prospect_move_in_date,
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
      "smsConsentDisclaimer": sms_consent_disclaimer,
      "smsConsentUrl": get_knock_consent_url,
      "sourceTitle": "Property Website",
      "tourType": knock_tour_type
    }
  end

  def knock_tour_date_time
    timezone = get_community_time_zone(@scheduled_tour.community)
    tour_datetime = (@scheduled_tour.tour_date.to_s + " " + @scheduled_tour.tour_time.strftime("%I:%M%p")).in_time_zone(timezone) if @scheduled_tour.tour_date.present? && @scheduled_tour.tour_time.present?
    tour_datetime = tour_datetime.strftime("%FT%T%:z").to_s if tour_datetime.present?
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