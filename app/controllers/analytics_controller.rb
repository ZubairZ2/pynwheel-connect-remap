class AnalyticsController < ApplicationController
  include AnalyticsHelper
  def index

    start_date , end_date = Date.today - 9.day , Date.today + 2.day
    @days_count = return_total_days(start_date, end_date)
    @maps_records = TrackSession.where.not(end_datetime: nil).where('start_datetime BETWEEN ? AND ?',start_date.yesterday, end_date.tomorrow)
    if @maps_records.any? 
      collect_session_each_day_data(start_date, @days_count, @maps_records) # For Maps first bar graph
      collect_session_each_day_data_in_minutes(start_date, @days_count, @maps_records) # For Maps second line graph
      collect_session_each_day_data_in_hours(@maps_records) # For Maps hours bar graph
    end

  end

  private

    def collect_session_each_day_data(start_date, days_count, total_records)

      sessions_each_day_hash = return_empty_hash(days_count,start_date)

      records_start_date = total_records.pluck(:start_datetime).map(&:to_date)
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size

      uniq_start_date_size.times do |i|
        sessions_each_day_hash[uniq_start_date[i]] = records_start_date.count(uniq_start_date[i])
        records_start_date = records_start_date - [uniq_start_date[i]]
      end

      @track_session_count = total_records.count
      @avg_track_session = total_records.count / days_count
      session_each_day_labels = sessions_each_day_hash.keys.map(&:to_s)
      session_each_day_counts = sessions_each_day_hash.values
    
      make_sessions_graph(session_each_day_labels, session_each_day_counts)

    end

    def collect_session_each_day_data_in_minutes(start_date, days_count, total_records)
      
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      start_end_datetime_arr = total_records.pluck(:start_datetime, :end_datetime)

      records_start_date = total_records.pluck(:start_datetime).map(&:to_date)
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size

      total_minutes , total_count = 0, 0
      uniq_start_date_size.times do |i|
        minutes = 0
        count = 0
        remove_index = []
        start_date_str = uniq_start_date[i].strftime("%y:%m:%d")
        start_end_datetime_arr.each_with_index do |arr, ind|
          if arr.first.strftime("%y:%m:%d") == start_date_str
            mins = return_time_in_minutes(arr.first,arr.last)
            minutes += mins
            total_minutes += mins
            count += 1
            total_count += 1
            remove_index << ind
          end
        end
        sessions_each_day_hash[uniq_start_date[i]] = minutes / count
        records_start_date = records_start_date - [uniq_start_date[i]]
        remove_index.each_with_index {|removing_index,j| start_end_datetime_arr.delete_at(removing_index - j) }
      end    

      @average_duration_each_session_in_minutes = total_minutes / total_count
      session_each_day_labels = sessions_each_day_hash.keys.map(&:to_s)
      session_each_day_counts = sessions_each_day_hash.values

      make_sessions_minutes_graph(session_each_day_labels, session_each_day_counts)
    end

    # def collect_session_each_day_data_in_hours(start_date, days_count, total_records)
      
    #   sessions_each_day_hourly_hash = return_empty_hash_hourly(days_count, start_date)
    #   records_start_datetime = total_records.order(:start_datetime).pluck(:start_datetime)
    #   records_start_date = total_records.order(:start_datetime).pluck(:start_datetime).map(&:to_date)
    #   uniq_start_date = records_start_date.uniq
    #   uniq_start_date_size = uniq_start_date.size
    #   current_hour = nil
    #   uniq_start_date_size.times do |i|
    #     count = 0
    #     start_date_str = uniq_start_date[i].strftime("%y:%m:%d")
    #     records_start_datetime.each do |record_datetime|
    #       current_hour = record_datetime.strftime('%H').to_i if current_hour.nil?
    #       if record_datetime.strftime("%y:%m:%d") == start_date_str
    #         if record_datetime.strftime('%H').to_i == current_hour
    #           count += 1 
    #         else
    #           count = 1
    #           current_hour = record_datetime.strftime('%H').to_i
    #         end
    #         key_start_datetime = Time.new(record_datetime.strftime("%Y"), record_datetime.strftime("%m"), record_datetime.strftime("%d"),record_datetime.strftime("%H")).utc
    #         sessions_each_day_hourly_hash[key_start_datetime] = count
    #       end
    #     end
    #   end
    #   max_datetime = DateTime.now.strftime("%y:%m:%d %H:00")
    #   max_count = 0
    #   session_each_day_labels = sessions_each_day_hourly_hash.map do |k,v|
    #     if v > max_count
    #       max_datetime = k.strftime("%y:%m:%d %H:00")
    #       max_count = v
    #     end
    #     k.strftime("%y:%m:%d %H:00")
    #   end
    #   session_each_day_counts = sessions_each_day_hourly_hash.values
    #   make_sessions_hour_graph(session_each_day_labels, session_each_day_counts)
    #   @max_datetime = max_datetime
    #   @max_count = max_count
    # end  

    def collect_session_each_day_data_in_hours(total_records)
      sessions_each_day_hourly_hash = return_empty_hash_hourly
      records_start_date_hours = total_records.pluck(:start_datetime).map {|dt| dt.strftime("%H").to_i }
      uniq_hours = records_start_date_hours.uniq
      max_count = 0
      max_hour = 0
      uniq_hours.each do |h|
        records_in_1_hour = records_start_date_hours.count(h)
        if records_in_1_hour > max_count
          max_count = records_in_1_hour
          max_hour = h
        end
        sessions_each_day_hourly_hash[h] = records_in_1_hour
        records_start_date_hours = records_start_date_hours - [h]
      end
      @highest_hour = max_hour < 10 ? ("0" + max_hour.to_s + ":00") : (max_hour.to_s + ":00")
      @session_in_highest_hour = max_count
      hour_labels = sessions_each_day_hourly_hash.keys.map do |h_key|
        start_to = h_key < 10 ? ("0" + h_key.to_s) : (h_key.to_s)
        end_then = (h_key + 1) < 10 ? ("0" + (h_key + 1).to_s) : ((h_key + 1).to_s)
        label_str = start_to + "-" + end_then
        label_str
      end
      hour_values = sessions_each_day_hourly_hash.values
      make_sessions_hour_graph(hour_labels, hour_values)

    end

    def make_sessions_graph(session_each_day_labels, session_each_day_counts)
      @session_each_day_data = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Total Sessions",
              backgroundColor: "rgba(60,141,188,1)",
              borderColor: "rgba(220,220,220,1)",
              data: session_each_day_counts
          }
        ]
      }
      @session_each_day_options = { legend: {display: false} }
    end

    def make_sessions_minutes_graph(session_each_day_labels, session_each_day_counts)
      @session_each_day_minutes_data = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Sessions in minutes",
              backgroundColor: "rgba(60,141,188,1)",
              borderColor: "rgba(220,220,220,1)",
              data: session_each_day_counts
          }
        ]
      }
      @session_each_day_minutes_options = { legend: {display: false} }
    end

    def make_sessions_hour_graph(session_each_day_labels, session_each_day_counts)
      @session_each_day_hour_data = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Total Sessions",
              backgroundColor: "rgba(60,141,188,1)",
              borderColor: "rgba(220,220,220,1)",
              data: session_each_day_counts
          }
        ]
      }
      @session_each_day_hour_options = { legend: {display: false} }
    end
end
