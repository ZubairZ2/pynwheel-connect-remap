class PynwheelLaunch::Communities::FollowUpEmails
  def initialize(community)
    @community = community
  end

  def send_emails
    @forms = forms_list
    if @forms.present?
      if @forms[:all_status].all?{|x| x.eql?(IN_PROGRESS)}
        return {type: APPLICATION_NOT_STARTED, data: @forms[:form_list]}
      elsif @forms[:all_status].any?{|x| x.eql?(IN_PROGRESS)} && !@forms[:all_status].all?{|x| x.eql?(IN_PROGRESS)}
        return {type: APPLICATION_IN_PROGRESS, data: @forms[:form_list]}
      elsif @forms[:all_status].all?{|x| x.eql?(SUBMITTED)}
        return {type: APPLICATION_SUBMITTED, data: []}
      end
    end
  end

  private

  def mendatory_detail_forms(all_forms_status)
    [
      {
        name: COMMUNITY_DETAILS,
        status: community_status(all_forms_status)
      },
      {
        name: PROPERTY_MAP_IMAGES,
        # status: property_map_status(all_forms_status)
      },
      {
        name: FLOORPLAN_IMAGES,
        status: floorplan_status(all_forms_status)
      },
      {
        name: PROPERTY_MANAGEMENT_SYSTEM,
        # status: data_provider_status(all_forms_status)
      }
    ]
  end

  def forms_for_self_tour
    [
      {
        name: LOCK_PROVIDER,
        # status: lock_providers_status
      },
      {
        name: TOUR_STOPS,
        # status: tour_stops_status
      },
      {
        name: VISITING_HOURS,
        # status: visiting_hours_status
      }
    ]
  end

  def forms_for_touch_app
    [
      {
        name: TOUCH_GALLERY_MEDIA,
        # status: touch_gallery_media_status
      },
      {
        name: TOUCH_HOME_PAGE_MEDIA,
        # status: home_page_media_status
      },
      {
        name: HARDWARE_SPECS,
        # status: hardware_specs_status
      }
    ]
  end

  def forms_list
    all_forms_status = []
    detail_forms = mendatory_detail_forms(all_forms_status)
    self_tour_forms = forms_for_self_tour
    self_tour_forms.each {|x| detail_forms << x} if @community.product_options.include?("self_tour")
    pynwheel_touch_forms = forms_for_touch_app
    pynwheel_touch_forms.each {|x| detail_forms << x} if @community.product_options.include?("pynwheel_touch")

    return {:form_list => detail_forms, :all_status => all_forms_status}
  end

  def community_status(all_forms_status)
    return "in_progress" if @community.status.blank?
    all_forms_status << @community&.status&.status
    @community&.status&.status
  end

  def property_map_status(all_forms_status)
    statuses = []
    if @community.is_sitemap
      sitemap = @community.sitemap
      statuses << sitemap&.status&.status
    elsif @community.has_floorplates?
      floorplates = @community.floorplates
      floorplates.map {|floorplate| stauses << floorplate&.status&.status rescue nil}
    end
    send_status = status_check(statuses)
    all_forms_status << send_status
    send_status
  end

  def floorplan_status(all_forms_status)
    all_forms_status << "in_progress" if @community.floorplans.blank?
    statuses = []
    floorplans = @community.floorplans
    floorplans.map {|floorplan| statuses << floorplan&.status&.status rescue nil}
    send_status = status_check(statuses)
    all_forms_status << send_status
    send_status
  end

  def data_provider_status(all_forms_status)
    return "in_progress" if @community.data_provider.blank? && @community.credential.blank?
    data_provider_status = []
    data_provider_status << @community.credential&.status&.status rescue nil

    if @community.credential&.use_different_crm_provider
      data_provider_status << @community.crm_credential&.status&.status rescue nil
    end

    send_status = status_check(data_provider_status)
    all_forms_status << send_status
    send_status
  end

  def lock_providers_status
    return "" if @community.zerv.blank? && @community.latch.blank? && @community.dwelo.blank? && @community.edge_state.blank? && @community&.edge_state&.remote_locks.blank?
    
    locks_status = []
    
    zerv = @community.zerv
    latch = @community.latch
    dwelo = @community.dwelo
    remote_locks = @community.edge_state&.remote_locks

    locks_status << zerv&.status&.status_and_remarks_obj rescue nil if zerv.present?
    locks_status << latch&.status&.status_and_remarks_obj rescue nil if latch.present?
    locks_status << dwelo&.status&.status_and_remarks_obj rescue nil if dwelo.present?
    
    unless remote_locks.nil?
      remote_locks.each {|remote_lock| locks_status << remote_lock&.status&.status_and_remarks_obj rescue nil}
    end

    send_status = status_check(locks_status)
    send_status
  end

  def status_check(statuses)
    return SUBMITTED if statuses.all?{|x| x.eql?(SUBMITTED)}
    return APPROVED if statuses.all?{|x| x.eql?(APPROVED)}
    return IN_PROGRESS if statuses.any? {|x| x.eql?(IN_PROGRESS) || x.nil? || x.empty?}
  end

end