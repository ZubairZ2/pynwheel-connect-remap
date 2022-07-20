class Statuses
  def initialize community, current_user, status
    @community = community
    @current_user = current_user
    @status = status
    @statuses = ["", nil ,"in_progress", "submitted", "form_approved", "application_in_qa", "approved", "released", "rejected"]
  end

  def update_statuses
    set_company_details_status
    set_community_details_status
    set_property_map_status
    set_floorplan_status
    set_gallery_images_status
    set_touch_vidoes_status
    set_data_provider_status
    touch_installation_specification
    set_lock_providers_status
    set_tour_stops_status
    set_visiting_hours_status
  end

  private

  def set_company_details_status
    if @statuses.find_index(@community.company.status.status) < @statuses.find_index(@status)
      @community.company.set_status_for_all(@community.company, @status, @current_user) unless @community.company.blank?
    end
  end

  def set_community_details_status
    @community.set_status_for_all(@community, @status, @current_user) unless @community.blank?
  end

  def set_property_map_status
    if @community.is_sitemap && !@community.sitemap.blank?
      @community.set_status_for_all(@community.sitemap, @status, @current_user)
    elsif @community.floorplates.any?
      @community.floorplates.each do |floorplate|
        @community.set_status_for_all(floorplate, @status, @current_user)
      end
    end
  end

  def set_floorplan_status
    if @community&.floorplans.any?
      @community.floorplans.each do |floorplan|
        @community.set_status_for_all(floorplan, @status, @current_user)
      end
    end
  end

  def set_gallery_images_status
    if @community&.galleries.any?
      @community.galleries.each do |gallery|
        @community.set_status_for_all(gallery, @status, @current_user)
      end
    end
  end

  def set_touch_vidoes_status
    unless @community&.design&.home_page_images.blank?
      @community&.design&.home_page_images.each do |touch_img|
        @community.set_status_for_all(touch_img, @status, @current_user)
      end
    end

    @community.set_status_for_all(@community&.design&.home_page_video, @status, @current_user) unless @community&.design&.home_page_video.blank?
  end

  def set_data_provider_status
    unless @community&.credential.blank?
      @community.set_status_for_all(@community.credential, @status, @current_user)

      if @community&.credential&.use_different_crm_provider
        @community.set_status_for_all(@community.crm_credential, @status, @current_user) unless @community&.crm_credential.blank?
      end

    end
  end

  def touch_installation_specification
    @community.set_status_for_all(@community.hardware_spec, @status, @current_user) unless @community&.hardware_spec.blank?
  end

  def set_lock_providers_status
    @community.set_status_for_all(@community.zerv, @status, @current_user)  unless @community.zerv.blank?
    @community.set_status_for_all(@community.latch, @status, @current_user)  unless @community.latch.blank?
    @community.set_status_for_all(@community.dwelo, @status, @current_user)  unless @community.dwelo.blank?

    unless @community.edge_state.blank?
      remote_locks = @community.edge_state&.remote_locks

      remote_locks.each do |remote_lock|
        @community.set_status_for_all(remote_lock, @status, @current_user)
      end
    end
  end

  def set_tour_stops_status
    @tour = @community.community_tour
    unless @tour.tour_stops.blank?
      tour_stops = @tour.tour_stops.compact

      tour_stops.each do |stop|
        @community.set_status_for_all(stop, @status, @current_user)
      end
    end
  end

  def set_visiting_hours_status
    @tour = @community.community_tour
    if @community.self_tour
      if @tour&.tour_setting&.allow_self_tour
        unless @community&.opening_hours.blank?
          @community.opening_hours.each do |oh|
            @community.set_status_for_all(oh, @status, @current_user)
          end
        end
      end

      if @tour&.tour_setting&.allow_guided_tour
        unless @community&.guided_opening_hours.blank?
          @community.guided_opening_hours.each do |gh|
            @community.set_status_for_all(gh, @status, @current_user)
          end
        end
      end
      
    end
  end

end