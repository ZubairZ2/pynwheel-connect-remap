class KnockService < BaseService
  include KnockApisHelper

  def initialize community
    @community = community
    @crm_credentials = @community&.crm_credential
    @timezone = @community&.get_time_zone(DEFAULT_TIME_ZONE)
  end
 
  def create_knock_prospect scheduled_tour
    knock_prospect_response = create_prospect(knock_prospect_payload(scheduled_tour), get_knock_community_id, get_knock_company_id) if is_knock_crm
    create_access_log(scheduled_tour, knock_prospect_payload(scheduled_tour), knock_prospect_response)
    add_knock_prospect_id(scheduled_tour, knock_prospect_response["payload"]["id"]) if prospect_created(knock_prospect_response)
  end

  def create_knock_appointment scheduled_tour
    knock_appointment_response = create_appointment(knock_appointment_payload(scheduled_tour), get_knock_community_id, get_knock_company_id) if is_knock_crm
    create_access_log(scheduled_tour, knock_appointment_payload(scheduled_tour), knock_appointment_response)
    add_knock_appointment_id(scheduled_tour, knock_appointment_response["payload"]["appointment"]["id"]) if appointment_created(knock_appointment_response)
  end

  def cancel_knock_appointment scheduled_tour
    cancel_appointment_response = cancel_appointment(scheduled_tour.knock_appointment_id, get_knock_community_id, get_knock_company_id)  if scheduled_tour.knock_appointment_id.present?
    create_access_log(scheduled_tour, scheduled_tour.knock_appointment_id, cancel_appointment_response)
    add_knock_appointment_id(scheduled_tour, nil) if appointment_canceled(cancel_appointment_response)
  end

  def available_slots
    self_guided_available_time_slots = get_community_available_times(true, get_knock_community_id, get_knock_company_id) 
    in_person_available_time_slots = get_community_available_times(false, get_knock_community_id, get_knock_company_id)
    
    self_guided_slots = self_guided_available_time_slots["payload"]["acceptableTimes"] rescue nil
    self_guided_slots = formate_time_slots_array_to_hash(self_guided_slots) if self_guided_slots.present?
    
    in_person_slots = in_person_available_time_slots["payload"]["acceptableTimes"] rescue nil
    in_person_slots = formate_time_slots_array_to_hash(in_person_slots) if in_person_slots.present?

    # self_guided_slots = get_filtered_self_guided_slots(self_guided_slots)
    # in_person_slots = get_filtered_in_person_slots(in_person_slots)

    tour_available_date = get_tour_available_dates(self_guided_slots, in_person_slots) if (self_guided_slots.present? || in_person_slots.present?)
  
    {available_dates: tour_available_date, self_guided_available_time_slots: self_guided_slots, in_person_available_time_slots: in_person_slots }
  end

  def knock_available_tour_types date, day, time
    slots = @community&.crm_time_slot&.slots || []
    is_slot_present_in_self_guided_tour(slots, date, time)
  end

  def knock_crm scheduled_tour, reschedule
    if is_knock_crm && scheduled_tour.property_tour_type.present?
      cancel_knock_appointment(scheduled_tour) if reschedule && scheduled_tour.property_tour_type === "scheduled_tour"
      create_knock_prospect(scheduled_tour) unless scheduled_tour.knock_prospect_id.present?
      create_knock_appointment(scheduled_tour) if scheduled_tour.property_tour_type === "scheduled_tour"
    end
  end

  def create_knock_visit scheduled_tour, visited_stops, visit_time
    if is_knock_crm && scheduled_tour.property_tour_type.present?
      knock_visit_response = create_visit(knock_visit_payload(scheduled_tour, visited_stops, visit_time), get_knock_community_id, get_knock_company_id)
      create_access_log(scheduled_tour, knock_visit_payload(scheduled_tour, visited_stops, visit_time), knock_visit_response)
    end
  end

  def get_discovery_sources
    response = get_community_sources(get_knock_community_id, get_knock_company_id)
    response.payload["edges"].map{|obj| obj["node"]["sourceTitle"]} rescue []
  end

  private

  # def get_filtered_in_person_slots slots
  #   tour_setting = @community.community_tour.tour_setting
  #   allow_guided_tour = tour_setting.allow_guided_tour
  #   guided_tour_data = (allow_guided_tour && @community.guided_opening_hours.present?) ? @community.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
  #   calculate_available_time_slots_hash(slots, guided_tour_data)
  # end

  # def get_filtered_self_guided_slots slots
  #   tour_setting = @community.community_tour.tour_setting
  #   allow_self_tour = tour_setting.allow_self_tour if tour_setting.present?
  #   self_tour_data = (allow_self_tour && @community.opening_hours.present?) ? @community.opening_hours.pluck(:day, :opening_time, :closing_time) : []
  #   calculate_available_time_slots_hash(slots, self_tour_data)
  # end

  # def calculate_available_time_slots_hash knock_slots, pynwheel_slots
  #   new_hash = Hash.new
  #   new_hash = knock_slots

  #   if knock_slots.present?
  #     knock_slots.each do |slot|
  #       date = slot[0].split("-")
  #       date = date[1]+"/"+date[0]+"/"+date[2]
  #       date_day = Time.parse(date).strftime("%A")
  
  #       select_slot = pynwheel_slots.map{|d| d if d[0] === date_day}.compact
  #       select_slot = select_slot[0] if select_slot[0].present?
  
  #       if select_slot.present? && select_slot[1].present? && select_slot[2].present?
  #         start_time = Time.strptime(select_slot[1], "%H:%M")  if select_slot.present? && select_slot[1].present?  
  #         end_time = Time.strptime(select_slot[2], "%H:%M")  if select_slot.present? && select_slot[2].present?
  
  #         new_hash[slot[0]] = slot[1].map{|v| v if Time.strptime(@community.get_time_in_24_hours_format(v),"%H:%M").between?(start_time, end_time) }.compact
  #       else
  #         new_hash[slot[0]] = []
  #       end
  #     end
  #   end

  #   new_hash
  # end

  def appointment_canceled resp
    resp.present? && resp["payload"].present? && resp["payload"]["appointment"].present? && resp["payload"]["appointment"]["status"] === "CANCELLED" && resp["payload"]["appointment"]["id"].present?
  end

  def prospect_created resp
    resp.present? && resp.success? && resp["payload"]["id"].present?
  end

  def appointment_created resp
    resp.present? && resp["payload"].present? && resp["payload"]["appointment"].present? && resp["payload"]["appointment"]["status"] === "CONFIRMED" && resp["payload"]["appointment"]["id"].present?
  end

  def is_slot_present_in_self_guided_tour knock_slots, date, time
    tour_type = []
    date = date.gsub('/',"-")

    is_self_guided_tour = knock_slots["self_guided_available_time_slots"][date]
    is_in_person_tour = knock_slots["in_person_available_time_slots"][date]

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

  def add_knock_appointment_id scheduled_tour, appointment_id
    scheduled_tour.update_attributes(knock_appointment_id: appointment_id)
  end

  def add_knock_prospect_id scheduled_tour, prospect_id
    scheduled_tour.update_attributes(knock_prospect_id: prospect_id)
  end

  def is_knock_crm
    @community.is_knock_community?
  end

  def get_knock_community_id
    @crm_credentials&.knock_community_id
  end

  def get_knock_company_id
    @crm_credentials&.knock_company_id
  end

  def get_knock_consent_url
    ENV["KNOCK_SMS_CONSENT_URL"]
  end

  def prospect_move_in_date scheduled_tour
    scheduled_tour&.desired_move_in_date&.strftime("%F").to_s
  end
  
  def sms_consent_disclaimer
    "I consent to appointment updates via SMS communication for my Pynwheel Tour using Pynwheel mobile app."
  end

  def is_self_guided_tour scheduled_tour
    case scheduled_tour.tour_type
    when "guided_tour"
      false
    when "self_tour"
      true
    when "virtual_tour"      
      true
    end
  end

  def knock_tour_type scheduled_tour
    case scheduled_tour.tour_type
    when "guided_tour"
      "IN_PERSON"
    when "self_tour"
      "SELF_GUIDED"
    when "virtual_tour"      
      "SELF_GUIDED"
    end  
  end

  def desire_bedrooms scheduled_tour
    if scheduled_tour.desired_bedroom.present?
      if scheduled_tour.desired_bedroom == 0
        ["STUDIO"]
      elsif scheduled_tour.desired_bedroom == 1
        ["1_BEDROOM"]
      elsif scheduled_tour.desired_bedroom == 2
        ["2_BEDROOMS"]
      else
        ["3_OR_MORE_BEDROOMS"]
      end
    else
      []
    end
  end

  

  def knock_message scheduled_tour
    case scheduled_tour.property_tour_type
    when "scheduled_tour"
      scheduled_tour.tour_type === "self_tour" ? "Pynwheel scheduled self-tour. Scheduled on: #{knock_tour_date_time(scheduled_tour)}" : "Pynwheel guided in-person tour. Scheduled on: #{knock_tour_date_time(scheduled_tour)}"
    when "unscheduled_self_tour"
      "Pynwheel unscheduled self-tour: Prospect will visit at his/her own convenience during property visiting hours and appointment will be created right after the tour and also visit will be registered."
    when "remote_tour"
      "Pynwheel remote/virtual tour: Prospect will visit at his/her own convenience anytime from the comfort of their home using self-tour app."
    end
  end

  def get_knock_appointment_id scheduled_tour
    scheduled_tour.knock_appointment_id || create_knock_appointment()
  end

  def get_knock_prospect_id scheduled_tour
    scheduled_tour.knock_prospect_id || create_knock_prospect()
  end

  def get_knock_visit_time visit_time
    visit_time.in_time_zone(@timezone).strftime("%FT%T%:z").to_s
  end

  def knock_visit_payload scheduled_tour, visited_stops, visit_time
    {
      "appointmentId": get_knock_appointment_id(scheduled_tour),
      "prospectId": get_knock_prospect_id(scheduled_tour),
      "visitTime": get_knock_visit_time(visit_time),
      "isSelfGuided": is_self_guided_tour(scheduled_tour),
      "sourceTitle": "Property Website",
      "unitNames": visited_stops
    }
  end

  def knock_prospect_payload scheduled_tour
    {
      "communityId": get_knock_community_id,
      "firstName": scheduled_tour&.tour_user.first_name,
      "lastName": scheduled_tour&.tour_user.last_name,
      "email": scheduled_tour&.tour_user.email,
      "phone": scheduled_tour&.tour_user.phone_number,
      "address": @community.address,
      "city": @community.city,
      "state": @community&.state.slice(0, 2).upcase,
      "zip": @community.zip,
      "autorespond": true,
      "sourceTitle": "Property Website",
      "moveDate": prospect_move_in_date(scheduled_tour),
      "bedrooms": desire_bedrooms(scheduled_tour),
      "occupants": 1,
      "leaseTermMonths": 12,
      "minBudget": 1000,
      "maxBudget": 2000,
      "message": knock_message(scheduled_tour),
      "firstContactType": "internet",
      "smsConsent": true,
      "smsConsentDisclaimer": sms_consent_disclaimer,
      "smsConsentUrl": get_knock_consent_url,
      "prospectIpAddress": scheduled_tour.knock_prospect_ip_address
    }
  end

  def knock_appointment_payload scheduled_tour
    {
      "communityId": get_knock_community_id,
      "requestedTimes": [
        {
          "startTime": knock_tour_date_time(scheduled_tour)
        }
      ],
      "profile": {
        "firstName": scheduled_tour&.tour_user.first_name,
        "lastName": scheduled_tour&.tour_user.last_name,
        "email": scheduled_tour&.tour_user.email,
        "phone": scheduled_tour&.tour_user.phone_number,
        "moveDate": prospect_move_in_date(scheduled_tour),
        "bedrooms": desire_bedrooms(scheduled_tour),
        "occupants": 1,
        "leaseTermMonths": 12,
        "minBudget": 1000,
        "maxBudget": 2000
      },
      "smsConsent": true,
      "smsConsentDisclaimer": sms_consent_disclaimer,
      "smsConsentUrl": get_knock_consent_url,
      "sourceTitle": "Property Website",
      "tourType": knock_tour_type(scheduled_tour)
    }
  end

  def knock_tour_date_time scheduled_tour
    tour_datetime = (scheduled_tour.tour_date.to_s + " " + scheduled_tour.tour_time.strftime("%I:%M%p")).in_time_zone(@timezone) if scheduled_tour.tour_date.present? && scheduled_tour.tour_time.present?
    tour_datetime = tour_datetime.strftime("%FT%T%:z").to_s if tour_datetime.present?
    tour_datetime || Time.now.in_time_zone(@timezone).strftime("%FT%T%:z").to_s
  end

  def create_access_log(scheduled_tour, payload, response)
    AccessLogsService.new.create_crm_logs(
      scheduled_tour&.tour_user&.id, @community&.id, payload, response
    )
  end
end