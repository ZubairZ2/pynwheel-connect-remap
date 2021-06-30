class SchedulerWidgetService < BaseService
  def initialize(community,stepping,tour_Type,requested_day,tour_date)
    @community = community
    @stepping = stepping
    @tour_type = tour_Type
    @requested_day = requested_day
    @tour_date = tour_date
  end

  def time_slots_for_appartments
    time_slots ||= []
    available_time_slots ||=[]
    if @community&.tour&.tour_setting.present?
      tour_setting = @community.tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      allow_virtual_tour = tour_setting.allow_virtual_tour
      if allow_virtual_tour && @tour_type == "virtual_tour"
        each_day_slots = return_time_slots("0:00", "23:59",@stepping)
        time_slots << each_day_slots
      else
        self_tour_data = (allow_self_tour && @community.opening_hours.present?) ? @community.opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if self_tour_data.present? && @tour_type == "self_tour"
          self_tour_data.each do |data|
            if data[0] == @requested_day 
              time_slots << return_time_slots(data[1], data[2], @stepping)
            end
          end
        end
        guided_tour_data = (allow_guided_tour && @community.guided_opening_hours.present?) ? @community.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if guided_tour_data.present? && @tour_type == "guided_tour"
          guided_tour_data.each do |data|
            if data[0] == @requested_day
              time_slots << return_time_slots(data[1], data[2], @stepping)
            end
          end
        end
      end
    end
     
    timezone = get_community_time_zone(@community) rescue "UTC"
    today_datetime = Time.zone.now.utc.in_time_zone(timezone).strftime("%y/%m/%d %I:%M %A %p")
    d = Date.parse(@tour_date) if @tour_date.is_a? String 
    time_slots.flatten.each do |time|
      t = Time.zone.parse(time) if time.is_a? String
      time_slot_datetime = DateTime.new(d.year, d.month, d.day, t.hour, t.min).strftime("%y/%m/%d %I:%M %A %p") 
      if  time_slot_datetime.to_datetime >= today_datetime.to_datetime
        available_time_slots << time
      end
    end
    # available_time_slots.each {|value_arr| value_arr.uniq}
    available_time_slots
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

  # def return_2_hrs_time_interval_slots(opening_time, closing_time)
  # end

  def return_time_slots(opening_time, closing_time, steps)
    slots = []
    # if steps == 120
    #   slots = return_2_hrs_time_interval_slots(opening_time, closing_time)
    # else
      start_minute = opening_time
      opening_hour = opening_time.split(":")[0].to_i
      opening_minute = opening_time.split(":")[1].to_i
      open_minute = opening_minute
      closing_hour = closing_time.split(":")[0].to_i
      closing_minute = closing_time.split(":")[1].to_i == 0 ? 60 : closing_time.split(":")[1].to_i
      same_hour = (opening_hour == closing_hour)
      close_minute = same_hour ? closing_minute : 60
      while opening_minute < close_minute
        hour, am_pm = return_hour_and_meridiem(opening_hour)
        slots << (hour  + ":" + ((opening_minute < 10) ? "0" + opening_minute.to_s : opening_minute.to_s) + " " + am_pm)
        opening_minute += steps
      end
      opening_minute = same_hour ? 0 : (opening_minute - 60)
      opening_hour += 1
      if opening_hour != closing_hour
        while opening_hour <= (closing_hour - 1) do
          hour, am_pm = return_hour_and_meridiem(opening_hour)
          slots << (hour  + ":" + ((opening_minute < 10) ? "0" + opening_minute.to_s : opening_minute.to_s) + " " + am_pm)
            if (opening_minute + steps) < 60
              opening_minute += steps
            else
              opening_hour = opening_hour + 1
              opening_minute = (opening_minute + steps) - 60
            end
        end # while end
      end
      if !same_hour && closing_minute != 60 # means greater than zero
        open_minute = 0 if open_minute >= closing_minute
        while open_minute < closing_minute
          hour, am_pm = return_hour_and_meridiem(opening_hour)
          slots << (hour  + ":" + ((open_minute < 10) ? "0" + open_minute.to_s : open_minute.to_s) + " " + am_pm)
          open_minute += steps
        end
      end
    # end
    
    slots
  end # method end

  def return_hour_and_meridiem(hour)
    if hour == 0
      hour += 12
      return hour.to_s, "am"
    elsif hour < 10
      hour = "0" + hour.to_s
      return hour, "am"
    elsif hour < 12
      return hour.to_s, "am"
    elsif hour == 12
      return hour.to_s, "pm"
    elsif hour < 24
      hour = hour - 12
      return hour.to_s, "pm"
    end  
  end

end