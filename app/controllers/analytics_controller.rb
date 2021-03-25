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
      bounce_rate_on_pages(@maps_records)
      events_per_track_session(start_date, @days_count, @maps_records)
      apply_clicks_track_session(start_date, @days_count, @maps_records)
      favourite_saved_track_session(start_date, @days_count, @maps_records)
      favourite_sent_track_session(start_date, @days_count, @maps_records)
      price_opened_track_session(start_date, @days_count, @maps_records)
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
      max_hour_start = max_hour < 10 ? ("0" + max_hour.to_s + ":00") : (max_hour.to_s + ":00")
      max_hour_end = max_hour + 1 < 10 ? ("0" + (max_hour + 1).to_s + ":00") : ((max_hour + 1).to_s + ":00")
      @highest_hour = max_hour_start + "-" + max_hour_end
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

    def bounce_rate_on_pages(total_records)
      pages_hash = {"Single" => 0, "Multiple" => 0}
      visite_pages_counts = total_records.pluck(:visited_pages).map(&:count)
      single_page_visitor = visite_pages_counts.count(1)
      multiple_page_visior = visite_pages_counts.size - single_page_visitor
      pages_hash["Single"] = ((single_page_visitor.to_f / visite_pages_counts.size.to_f).round(2) * 100).round(2)
      pages_hash["Multiple"] = ((multiple_page_visior.to_f / visite_pages_counts.size.to_f).round(2) * 100).round(2)
      @percentage_single_page_visitor = pages_hash["Single"].to_s + "%"
      make_bounce_graph(pages_hash.keys, pages_hash.values)
    end

    def events_per_track_session(start_date, days_count, total_records)
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      records = total_records.order(:start_datetime).pluck(:start_datetime, :apply_click_counter,:favorite_saved_counter, :favorite_sent_counter, :price_opened_counter)
      session_with_counts = 0
      records.each {|ar| session_with_counts += 1 if ar[1] > 0 || ar[2] > 0 || ar[3] > 0 || ar[4] > 0 }
      records_count = records.size
      records = records.map{ |arr| [arr.first.to_date, arr[1], arr[2], arr[3], arr[4]] }
      records_start_date = records.map{ |arr| arr.first }
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size
      uniq_start_date_size.times do |i|
        count = 0
        remove_index = []
        records.each_with_index do |arr, ind|
          if arr.first == uniq_start_date[i]
            count += (arr[1] + arr[2] + arr[3] + arr[4])
            remove_index << ind
          end
        end
        sessions_each_day_hash[uniq_start_date[i]] = count
        remove_index.each_with_index {|removing_index,j| records.delete_at(removing_index - j) }
      end

      @total_number_of_events = sessions_each_day_hash.values.sum
      session_without_counts = records_count - session_with_counts
      percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      pie_chart_hash = {"Session with events" => percentage_session_with_counts, "Session without events" => percentage_session_without_counts}
      make_pie_chart_events_track_session(pie_chart_hash.keys, pie_chart_hash.values)
      make_bar_chart_events_track_session(sessions_each_day_hash.keys.map {|s_date| s_date.strftime("%Y:%m:%d") }, sessions_each_day_hash.values)
  
    end

    def apply_clicks_track_session(start_date, days_count, total_records) 
      
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      records = total_records.order(:start_datetime).pluck(:start_datetime, :apply_click_counter)
      session_with_counts = 0
      records.each { |ar| session_with_counts += 1  if ar.last > 0 }
      records_count = records.size
      records = records.map{ |arr| [arr.first.to_date, arr.last] }
      records_start_date = records.map{ |arr| arr.first }
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size
      uniq_start_date_size.times do |i|
        count = 0
        remove_index = []
        records.each_with_index do |arr, ind|
          if arr.first == uniq_start_date[i]
            count += arr.last
            remove_index << ind
          end
        end
        sessions_each_day_hash[uniq_start_date[i]] = count
        remove_index.each_with_index {|removing_index,j| records.delete_at(removing_index - j) }
      end
      @total_number_of_apply_clicks = sessions_each_day_hash.values.sum
      session_without_counts = records_count - session_with_counts
      percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      pie_chart_hash = {"Session with Apply clicks" => percentage_session_with_counts, "Session without Apply clicks" => percentage_session_without_counts}
      make_pie_chart_apply_clicks_track_session(pie_chart_hash.keys, pie_chart_hash.values)
      make_line_chart_apply_clicks_track_session(sessions_each_day_hash.keys.map {|s_date| s_date.strftime("%Y:%m:%d") }, sessions_each_day_hash.values)

    end

    def favourite_saved_track_session(start_date, days_count, total_records) 
      
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      records = total_records.order(:start_datetime).pluck(:start_datetime, :favorite_saved_counter)
      session_with_counts = 0
      records.each { |ar| session_with_counts += 1  if ar.last > 0 }
      records_count = records.size
      records = records.map{ |arr| [arr.first.to_date, arr.last] }
      records_start_date = records.map{ |arr| arr.first }
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size
      uniq_start_date_size.times do |i|
        count = 0
        remove_index = []
        records.each_with_index do |arr, ind|
          if arr.first == uniq_start_date[i]
            count += arr.last
            remove_index << ind
          end
        end
        sessions_each_day_hash[uniq_start_date[i]] = count
        remove_index.each_with_index {|removing_index,j| records.delete_at(removing_index - j) }
      end
      @total_number_of_favourite_saved = sessions_each_day_hash.values.sum
      session_without_counts = records_count - session_with_counts
      percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      pie_chart_hash = {"Session with favourite saved" => percentage_session_with_counts, "Session without favourite saved" => percentage_session_without_counts}
      make_pie_chart_favourite_saved_track_session(pie_chart_hash.keys, pie_chart_hash.values)
      make_bar_chart_favourite_saved_track_session(sessions_each_day_hash.keys.map {|s_date| s_date.strftime("%Y:%m:%d") }, sessions_each_day_hash.values)

    end

    def favourite_sent_track_session(start_date, days_count, total_records) 
      
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      records = total_records.order(:start_datetime).pluck(:start_datetime, :favorite_sent_counter)
      session_with_counts = 0
      records.each { |ar| session_with_counts += 1  if ar.last > 0 }
      records_count = records.size
      records = records.map{ |arr| [arr.first.to_date, arr.last] }
      records_start_date = records.map{ |arr| arr.first }
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size
      uniq_start_date_size.times do |i|
        count = 0
        remove_index = []
        records.each_with_index do |arr, ind|
          if arr.first == uniq_start_date[i]
            count += arr.last
            remove_index << ind
          end
        end
        sessions_each_day_hash[uniq_start_date[i]] = count
        remove_index.each_with_index {|removing_index,j| records.delete_at(removing_index - j) }
      end
      @total_number_of_favourite_sent = sessions_each_day_hash.values.sum
      session_without_counts = records_count - session_with_counts
      percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      pie_chart_hash = {"Session with favourite emailed" => percentage_session_with_counts, "Session without favourite emailed" => percentage_session_without_counts}
      make_pie_chart_favourite_sent_track_session(pie_chart_hash.keys, pie_chart_hash.values)
      make_bar_chart_favourite_sent_track_session(sessions_each_day_hash.keys.map {|s_date| s_date.strftime("%Y:%m:%d") }, sessions_each_day_hash.values)

    end

    def price_opened_track_session(start_date, days_count, total_records) 
      
      records = total_records.order(:start_datetime).pluck(:start_datetime, :price_opened_counter)
      session_with_counts = 0
      records.each { |ar| session_with_counts += 1  if ar.last > 0 }
      records_count = records.size
      records_last_counts = records.map{ |arr| arr.last }
  
      @total_number_of_price_opened = records_last_counts.sum
      session_without_counts = records_count - session_with_counts
      percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      pie_chart_hash = {"Session with price opened" => percentage_session_with_counts, "Session without price opened" => percentage_session_without_counts}
      make_pie_chart_price_opened_track_session(pie_chart_hash.keys, pie_chart_hash.values)

    end

    # Drawing graph methods
    # Make two mthods only (make it generic)
    
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

    def make_bounce_graph(session_each_day_labels, session_each_day_counts)
      @bounce_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Total Sessions",
              backgroundColor: ["rgba(255,90,90,0.8)", "rgba(60,179,113,1)"],
              borderColor: ["rgba(220,220,220,0.5)","rgba(220,220,220,0.5)"],
              data: session_each_day_counts
          }
        ]
      }
      @bounce_data_options = { legend: {display: false} }
    end

    def make_pie_chart_events_track_session(session_each_day_labels, session_each_day_counts)
      @pie_events_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Total Sessions",
              backgroundColor: ["rgba(60,179,113,1)", "rgba(255,165, 0 , 0.8)"],
              borderColor: ["rgba(220,220,220,0.5)","rgba(220,220,220,0.5)"],
              data: session_each_day_counts
          }
        ]
      }
      @pie_events_data_options = { legend: {display: false} }
    end

    def make_bar_chart_events_track_session(session_each_day_labels, session_each_day_counts)
      @bar_events_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Total event",
              backgroundColor: "rgba(60,141,188,1)",
              borderColor: "rgba(220,220,220,1)",
              data: session_each_day_counts
          }
        ]
      }
      @bar_events_data_options = { legend: {display: false} }
    end

    def make_pie_chart_apply_clicks_track_session(session_each_day_labels, session_each_day_counts)
      @pie_apply_click_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Total Sessions",
              backgroundColor: ["rgba(60,179,113,1)", "rgba(255,165, 0 , 0.8)"],
              borderColor: ["rgba(220,220,220,0.5)","rgba(220,220,220,0.5)"],
              data: session_each_day_counts
          }
        ]
      }
      @pie_apply_click_data_options = { legend: {display: false} }
    end

    def make_line_chart_apply_clicks_track_session(session_each_day_labels, session_each_day_counts)
      @line_apply_click_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Apply clicks",
              backgroundColor: "rgba(60,141,188,1)",
              borderColor: "rgba(220,220,220,1)",
              data: session_each_day_counts
          }
        ]
      }
      @line_apply_click_data_options = { legend: {display: false} }
    end

    def make_pie_chart_favourite_saved_track_session(session_each_day_labels, session_each_day_counts)
      @pie_favourite_saved_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Total Sessions",
              backgroundColor: ["rgba(60,179,113,1)", "rgba(255,165, 0 , 0.8)"],
              borderColor: ["rgba(220,220,220,0.5)","rgba(220,220,220,0.5)"],
              data: session_each_day_counts
          }
        ]
      }
      @pie_favourite_saved_data_options = { legend: {display: false} }
    end

    def make_bar_chart_favourite_saved_track_session(session_each_day_labels, session_each_day_counts)
      @bar_favourite_saved_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Favourite saved",
              backgroundColor: "rgba(60,141,188,1)",
              borderColor: "rgba(220,220,220,1)",
              data: session_each_day_counts
          }
        ]
      }
      @bar_favourite_saved_data_options = { legend: {display: false} }
    end

    def make_pie_chart_favourite_sent_track_session(session_each_day_labels, session_each_day_counts)
      @pie_favourite_sent_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Total Sessions",
              backgroundColor: ["rgba(60,179,113,1)", "rgba(255,165, 0 , 0.8)"],
              borderColor: ["rgba(220,220,220,0.5)","rgba(220,220,220,0.5)"],
              data: session_each_day_counts
          }
        ]
      }
      @pie_favourite_sent_data_options = { legend: {display: false} }
    end

    def make_bar_chart_favourite_sent_track_session(session_each_day_labels, session_each_day_counts)
      @bar_favourite_sent_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Favourite emailed",
              backgroundColor: "rgba(60,141,188,1)",
              borderColor: "rgba(220,220,220,1)",
              data: session_each_day_counts
          }
        ]
      }
      @bar_favourite_sent_data_options = { legend: {display: false} }
    end

    def make_pie_chart_price_opened_track_session(session_each_day_labels, session_each_day_counts)
      @pie_price_opened_data_labels = {
        labels: session_each_day_labels,
        datasets: [
          {
              label: "Total Sessions",
              backgroundColor: ["rgba(60,179,113,1)", "rgba(255,165, 0 , 0.8)"],
              borderColor: ["rgba(220,220,220,0.5)","rgba(220,220,220,0.5)"],
              data: session_each_day_counts
          }
        ]
      }
      @pie_price_opened_data_options = { legend: {display: false} }
    end

end
