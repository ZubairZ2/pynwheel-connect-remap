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

  def knock_crm
    if is_knock_crm
      case @scheduled_tour.property_tour_type
      when "scheduled_tour"
        create_knock_prospect
        create_knock_appointment
      when "unscheduled_self_tour"
        create_knock_prospect
      when "remote_tour"
        create_knock_prospect
      end
    end
  end

  private

  def add_knock_appointment_id appointment_id
    @scheduled_tour.update_attributes(knock_appointment_id: appointment_id)
  end

  def add_knock_prospect_id prospect_id
    @scheduled_tour.update_attributes(knock_prospect_id: prospect_id)
  end

  def is_knock_crm
    ( @scheduled_tour&.community&.crm_credential&.crm_provider === "knock" && @scheduled_tour&.community&.crm_credential&.knock_community_id.present? && @scheduled_tour&.community&.crm_credential&.knock_api_key.present? )
  end

  def knock_api_key
    @scheduled_tour&.community&.crm_credential&.knock_api_key
  end

  def knock_prospect_payload
    {
      "communityId": @scheduled_tour&.community&.crm_credential&.knock_community_id,
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
      "moveDate": @scheduled_tour&.desired_move_in_date&.strftime("%F").to_s,
      "bedrooms": desire_bedrooms,
      "occupants": 1,
      "leaseTermMonths": 12,
      "minBudget": 1000,
      "maxBudget": 2000,
      "message": knock_message, 
      "firstContactType": "internet",
      "smsConsent": true,
      "smsConsentDisclaimer": "I consent to appointment updates via SMS communication",
      "smsConsentUrl": @scheduled_tour&.community&.crm_credential&.knock_sms_consent_url,
      "prospectIpAddress": @scheduled_tour.knock_prospect_ip_address
    }
  end

  def knock_appointment_payload
    {
      "communityId": @scheduled_tour&.community&.crm_credential&.knock_community_id,
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
        "moveDate": @scheduled_tour&.desired_move_in_date&.strftime("%F").to_s,
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
      "smsConsentUrl": @scheduled_tour&.community&.crm_credential&.knock_sms_consent_url,
      "sourceTitle": "Property Website",
      "tourType": knock_tour_type
    }
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