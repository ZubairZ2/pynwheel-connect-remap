class OccupiedTourTimeSlotsService

  def initialize community
    @community = community
    @timezone = @community.get_time_zone()
    @community_tour = @community.community_tour
    @stepping = @community.community_tour.tour_setting.time_intervel == '15 min' ? 15 : (@community.community_tour.tour_setting.time_intervel == '30 min' ? 30 : (@community.community_tour.tour_setting.time_intervel == '1 hr') ? 60 : (@community.community_tour.tour_setting.time_intervel == '2 hrs') ? 120 : 15) rescue 15
    @stepping = @stepping - 1
  end

  def occupied_slots
    return {} if ( !max_limit_enabled || @community.schedual_tours.empty? )

    future_tours = community_scheduled_tours()

    create_occupied_slots_hash(future_tours)
  end

  private

  def create_occupied_slots_hash future_tours, slots = {}
     return [] if future_tours.empty?

    future_tours&.each do |tour|
      if is_slot_occupied(tour)
        if limit_exceeded(tour)
          key = tour_date_time(tour).strftime("%Y/%m/%d")
          value = tour_date_time(tour).strftime("%I:%M %P")

          slots[key] = [] unless slots[key].present?
          slots[key] << value
        end
      end
    end

    slots
  end


  def is_slot_occupied tour
    ( (tour_date_time(tour) + grace_period()) > present_date_time() ) rescue false
  end

  def present_date_time
    Time.now.in_time_zone(@timezone)
  end

  def tour_date_time tour
    "#{tour.tour_date.to_s} #{tour.tour_time.strftime("%I:%M %P")}".in_time_zone(@timezone)
  end

  def grace_period
    (@community_tour.grace_period).minutes
  end

  def community_scheduled_tours
    @community&.schedual_tours.where("property_tour_type = ? AND tour_date >= ?", "scheduled_tour", present_date_time() ).where.not(tour_user_id: nil)
  end

  def limit_exceeded tour
    date = tour_date_time(tour)
    tour_time, day_diff = get_tour_datetime_and_diff date

    before_30_mints = tour_time.to_time - @stepping.minutes
    after_30_mints = tour_time.to_time + @stepping.minutes

    before_30_mints, c = get_tour_datetime_and_diff before_30_mints
    after_30_mints, d = get_tour_datetime_and_diff after_30_mints

    self_tour_count = @community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints,tour_type: "self_tour").where.not(tour_user_id: nil).count
    guided_tour_count = @community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints,tour_type: "guided_tour").where.not(tour_user_id: nil).count


    enabled_tour_type(self_tour_count, guided_tour_count)   
  end

  def enabled_tour_type self_tour_count, guided_tour_count
    self_tour_limit = ( max_limit_enabled() && @community_tour.max_self_tour_users.present? && @community_tour.max_self_tour_users.present? && !(self_tour_count < @community_tour.max_self_tour_users.to_i) )
    guided_tour_limit = ( max_limit_enabled() && @community_tour.max_guided_tour_users.present? && @community_tour.max_guided_tour_users.present? && !(guided_tour_count < @community_tour.max_guided_tour_users.to_i) )

    if @community_tour.tour_setting.allow_self_tour && @community_tour.tour_setting.allow_guided_tour
      (self_tour_limit && guided_tour_limit)
    elsif @community_tour.tour_setting.allow_self_tour
      self_tour_limit
    elsif @community_tour.tour_setting.allow_guided_tour
      guided_tour_limit
    end
  end

  def max_limit_enabled
    @community_tour.tour_setting.do_limit_max_tour
  end

  def get_tour_datetime_and_diff date
    tour_date = Date.strptime(date.in_time_zone(@timezone).strftime("%m/%d/%Y"), "%m/%d/%Y")
    server_current_date = Date.strptime(DateTime.current.in_time_zone(@timezone).strftime("%m/%d/%Y"), "%m/%d/%Y")
    tour_time = date.strftime("%l:%M %p")
    day_diff = (tour_date - server_current_date).to_i

    [tour_time, day_diff]
  end

end