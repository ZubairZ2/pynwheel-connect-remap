class AnalyticsController < ApplicationController
  include AnalyticsHelper
  def index

    start_date , end_date = Date.today - 9.day , Date.today + 2.day
    @days_count = return_total_days(start_date, end_date)
    total_records = TrackSession.where.not(end_datetime: nil).where('start_datetime BETWEEN ? AND ?',start_date.yesterday, end_date.tomorrow)
    collect_session_each_day_data(start_date, @days_count, total_records) # For Maps first bar graph
    collect_session_each_day_data_in_minutes(start_date, @days_count, total_records) # For Maps second line graph

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
end
