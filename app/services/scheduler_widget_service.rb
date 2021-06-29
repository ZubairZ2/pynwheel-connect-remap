class SchedulerWidgetService < BaseService
  def initialize(community,stepping,tour_Type,requested_day,tour_date)
    @community = community
    @stepping = stepping
    @tour_type = tour_Type
    @requested_day = requested_day
    @tour_date = tour_date
  end

  def time_slots_for_appartments
    # time_slots = {}
    time_slots ||= []
    available_time_slots ||=[]
      # week_days = @requested_day  #{"Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3, "Thursday" => 4, "Friday" => 5, "Saturday" => 6}
    if @community&.tour&.tour_setting.present?
      tour_setting = @community.tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      allow_virtual_tour = tour_setting.allow_virtual_tour
      # binding.pry
      if allow_virtual_tour && @tour_type == "virtual_tour"
        each_day_slots = return_time_slots("0:00", "23:59",@stepping)
        # binding.pry
        # time_slots[@requested_day] = each_day_slots
        time_slots << each_day_slots
        # ((0..6).to_a).each do |day|
        #   time_slots[day] = each_day_slots
        # end
      else
        # binding.pry
        self_tour_data = (allow_self_tour && @community.opening_hours.present?) ? @community.opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if self_tour_data.present? && @tour_type == "self_tour"
          # binding.pry
          self_tour_data.each do |data|
            # binding.pry
            if data[0] == @requested_day 
              # time_slots[week_days[data[0]]] = time_slots[week_days[data[0]]].present? ? (time_slots[week_days[data[0]]] + return_time_slots(data[1], data[2], @stepping)) : (return_time_slots(data[1], data[2], @stepping))
              # binding.pry
              time_slots << return_time_slots(data[1], data[2], @stepping)
            end
          end
        end
        guided_tour_data = (allow_guided_tour && @community.guided_opening_hours.present?) ? @community.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if guided_tour_data.present? && @tour_type == "guided_tour"
          guided_tour_data.each do |data|
            if data[0] == @requested_day
              # time_slots[week_days[data[0]]] = time_slots[week_days[data[0]]].present? ? (time_slots[week_days[data[0]]] + return_time_slots(data[1], data[2], @stepping)) : (return_time_slots(data[1], data[2], @stepping))
              time_slots << return_time_slots(data[1], data[2], @stepping)
            end
          end
        end
      end
    end
    # today_time = moment().format("HH:mm A")
    #         today_datetime = moment(today_date + " " + today_time, "YYYY/MM/DD HH:mm: A")
    #         minus_day_slots = []
    #         for (let i = 0; i < selected_day_slots.length; ++i) {
    #           if (moment(selected_date + " " + selected_day_slots[i], "YYYY/MM/DD HH:mm: A") >= today_datetime){
    #             minus_day_slots.push(selected_day_slots[i])
    #           }
    #         }  
    #         selected_day_slots = minus_day_slots
    # binding.pry
    today_datetime = Time.now.strftime("%Y/%M/%D %H:%m: %A")
    time_slots.each {|time| }
    available_time_slots.each {|value_arr| value_arr.uniq}
    # binding.pry
    available_time_slots.flatten
  end 

  def return_time_slots(opening_time, closing_time, steps)
    slots = []
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