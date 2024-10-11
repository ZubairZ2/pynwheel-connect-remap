class AnalyticsController < ApplicationController
  include AnalyticsHelper
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Analytics"

  def index
    start_date , end_date = (params[:start_date].present? && params[:end_date].present?) ? [(params[:start_date].split("/")[1] + "/" + params[:start_date].split("/")[0] + "/" + params[:start_date].split("/")[2]).to_date, ((params[:end_date].split("/")[1] + "/" + params[:end_date].split("/")[0] + "/" + params[:end_date].split("/")[2]).to_date)] : [Date.today - 7.day, Date.today]
    @days_count = return_total_days(start_date, end_date) > 0 ? return_total_days(start_date, end_date) : 1
    communities = fetch_communities(current_user).active_communities
    @date_range_text = fetch_date_range_text(start_date , end_date, @days_count)
    # apply_filters(params)
    @product_type = params[:product_type].present? ? params[:product_type] : nil


    # For Webpage
    if @product_type == "maps"
      track_sessions = TrackSession.where(community_id: communities.ids)
      @maps_records = track_sessions.where(track_session_type: "maps").where('start_datetime > ? AND start_datetime < ?',start_date.beginning_of_day, end_date.end_of_day)
      apply_filters(params)

      if @maps_records.any?
        collect_session_each_day_data(start_date, @days_count, @maps_records, :start_datetime, "maps")
        collect_session_each_day_data_in_minutes(start_date, @days_count, @maps_records, :start_datetime, :end_datetime, "maps")
        collect_session_each_day_data_in_hours(@maps_records, :start_datetime, "maps")
        bounce_rate_on_pages(@maps_records, :visited_pages ,"maps")
        events_per_session(start_date, @days_count, @maps_records, :start_datetime, "maps")
        apply_clicks_track_session(start_date, @days_count, @maps_records, :start_datetime, "maps")
        favourite_saved_track_session(start_date, @days_count, @maps_records, "maps")
        favourite_sent_track_session(start_date, @days_count, @maps_records, "maps")
        price_opened_track_session(start_date, @days_count, @maps_records, :start_datetime, "maps")
      end
    end

    # For Metro 
    if  (@product_type.nil? || @product_type == "touch")
      track_sessions = TrackSession.where(community_id: communities.ids)
      @min_date_for_touch = track_sessions.where(track_session_type: TOUCH_TYPES).order('created_at asc')&.first&.created_at
      @metro_records = track_sessions.where(track_session_type: TOUCH_TYPES).where('start_datetime > ? AND start_datetime < ?',start_date.beginning_of_day, end_date.end_of_day)
      apply_filters(params)

      if @metro_records.any?
        collect_session_each_day_data(start_date, @days_count, @metro_records, :start_datetime, "metro")
        collect_session_each_day_data_in_minutes(start_date, @days_count, @metro_records, :start_datetime, :end_datetime, "metro")
        collect_session_each_day_data_in_hours(@metro_records, :start_datetime, "metro")
        bounce_rate_on_pages(@metro_records, :visited_pages ,"metro")
        pages_per_session(start_date, @days_count, @metro_records, "metro")
        events_per_session(start_date, @days_count, @metro_records, :start_datetime, "metro")
        apply_clicks_track_session(start_date, @days_count, @metro_records, :start_datetime, "metro")
        favourite_saved_track_session(start_date, @days_count, @metro_records, "metro")
        favourite_sent_track_session(start_date, @days_count, @metro_records, "metro")
        interface_used(start_date, @days_count, @metro_records, "metro")
        price_opened_track_session(start_date, @days_count, @metro_records, :start_datetime, "metro")
        visits_per_session_page(@metro_records, "metro")
      end
    end

    if @product_type == "pynwheel_tour"
      tour_histories = TourHistory.where(community_id: communities.self_tour_enabled_only.ids)
      @self_tour_records = tour_histories.where('arrived > ? AND arrived < ?',start_date.beginning_of_day, end_date.end_of_day)
      @self_tour_records_all = tour_histories.where('arrived > ? AND arrived < ?',start_date.beginning_of_day, end_date.end_of_day)
      @min_date_for_self_tour = tour_histories.order('created_at asc')&.first&.created_at
      apply_filters(params)

      # For Pynwheel Tour
      if @self_tour_records.any?
        collect_session_each_day_data(start_date, @days_count, @self_tour_records, :arrived, "self_tour")
        collect_session_each_day_data_in_minutes(start_date, @days_count, @self_tour_records, :arrived, :left, "self_tour")
        collect_session_each_day_data_in_hours(@self_tour_records, :arrived, "self_tour")
        bounce_rate_on_pages(@self_tour_records_all, :visited_pages_counter, "self_tour")
        events_per_session(start_date, @days_count, @self_tour_records, :arrived, "self_tour")
        apply_clicks_track_session(start_date, @days_count, @self_tour_records, :arrived, "self_tour")
        see_availability_session(start_date, @days_count, @self_tour_records, "self_tour")
        tour_site_or_tour_state_session(start_date, @days_count, @self_tour_records, :tour_site, "self_tour")
        tour_type_session(start_date, @days_count, @self_tour_records, "self_tour") 
        price_opened_track_session(start_date, @days_count, @self_tour_records, :arrived, "self_tour")
        opened_counter_session(start_date, @days_count, @self_tour_records, :arrived, :camera_opened_counter, "self_tour") 
        opened_counter_session(start_date, @days_count, @self_tour_records, :arrived, :notes_opened_counter, "self_tour") 
        stops_per_tour(start_date, @days_count, @self_tour_records, "self_tour")
        visits_per_tour_stop(@self_tour_records, "self_tour")

        @schedule_records = SchedualTour.where(community_id: @self_tour_records_all.pluck(:community_id).compact.uniq).where.not(tour_user_id: nil).where('tour_date >= ? AND tour_date <= ?',start_date.beginning_of_day, DateTime.now).where(tour_type: ["self_tour", "guided_tour", "Virtual Tour"])
        days_count_for_schedule_records = return_total_days(start_date, Date.today) > 0 ? return_total_days(start_date, Date.yesterday.end_of_day) : 1
        till_now_tour_histories = @self_tour_records_all.where('arrived < ?', Date.yesterday.end_of_day)
        no_shows(start_date, days_count_for_schedule_records, @schedule_records, till_now_tour_histories, "self_tour")
      end

      if @self_tour_records_all.any?
        tour_site_or_tour_state_session(start_date, @days_count, @self_tour_records_all, :tour_state, "self_tour")
      end
    end

    @communities_list = params[:company].present? ? Community.where(company_id: params[:company]).pluck(:name, :id) : communities_list(current_user)
    @communities_list = params[:region].present? ? Community.where(region_id: params[:region]).pluck(:name, :id) : @communities_list
    @start_date = start_date
    @end_date = end_date
  end

  def get_associated_communities
    communities = params[:company].present? ? Community.where(company_id: params[:company]).pluck(:id, :name) : params[:region].present? ? Community.where(region_id: params[:region]).pluck(:id, :name) : ''

    if communities.present?
      render json: communities.map { |id, name| { id: id, name: name } }
    else
      render json: {}
    end
  end
  
  private

    def formatted_number(number)
      number.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse
    end

    def formate_percentage initial_value, total_value
      Rational(initial_value*100, total_value).round(2).to_f
    end

    def apply_filters(params)
      @product_type = params[:product_type].present? ? params[:product_type] : nil
      @admin_type = params[:admin_type] if params[:admin_type]
      @community_id = params[:community] if params[:community].present?
      @community = Community.find(@community_id) if @community_id.present?
      @show_self_tour = @community.present? ? @community.self_tour : true
      @show_touch = @community.present? ? @community.touchscreen_app : true
      @only_scheduled_tours = @community.present? ? @community&.community_tour&.only_scheduled_tour : false

      if @community.present?
        params[:company] = @community.company_id
        params[:region] = @community.region_id
      end
      
      @company_id = params[:company] if params[:company].present?
      @region_id = params[:region] if params[:region].present?

      if params[:community].present? && !params[:community].blank?
        on_selected_communities(@community_id)
      end
      
      if params[:admin_type].present? && !params[:admin_type].blank?
        if params[:admin_type] == "all_pynwheel"
          community_ids = Community.all.ids
        elsif params[:admin_type] == "all_dwello"
          community_ids = fetch_dwelo_communities().ids
        end

        on_selected_communities(community_ids)
      end
      
      if params[:company].present? && !params[:company].blank?
        begin
          company = Company.find @company_id
          on_selected_communities(company.communities.ids)
        rescue => error
        end
      end
      
      if params[:region].present? && !params[:region].blank?
        begin
          region = Region.find @region_id
          on_selected_communities(region.communities.ids)
        rescue => error
        end
      end
    end
    
    def on_selected_communities(ids)
      @maps_records = (@product_type == "maps") ? @maps_records.where(community_id: ids) : []
      @metro_records = (@product_type == "touch") ? @metro_records.where(community_id: ids) : []

      if @product_type == "pynwheel_tour"
        @self_tour_records = @self_tour_records.where(community_id: ids)
        @self_tour_records_all = @self_tour_records_all.where(community_id: ids)
      else
        @self_tour_records = []
        @self_tour_records_all = []
      end
    end

    def collect_session_each_day_data(start_date, days_count, total_records, start_attr_name, for_device_type)
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      records_start_date = total_records.pluck(start_attr_name).map(&:to_date)
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size
      uniq_start_date_size.times do |i|
        sessions_each_day_hash[uniq_start_date[i]] = records_start_date.count(uniq_start_date[i])
        records_start_date = records_start_date - [uniq_start_date[i]]
      end
      visited_days_count = for_device_type == "self_tour" ? total_records.pluck(:arrived).map {|x| x.strftime("%d")}.uniq.count : uniq_start_date.size
      instance_variable_set("@track_session_count_#{for_device_type}", formatted_number( total_records.count) )
      instance_variable_set("@avg_track_session_#{for_device_type}", formatted_number( (total_records.count.to_f / visited_days_count.to_f).round) )
      session_each_day_labels = sessions_each_day_hash.keys.map(&:to_s)
      session_each_day_counts = sessions_each_day_hash.values
      session_each_day_data, session_each_day_options = make_bar_chart(session_each_day_labels, session_each_day_counts, "Total #{get_name(for_device_type)}", "rgba(137, 199, 101, 0.5)", "rgba(137, 199, 101, 1)")
      instance_variable_set("@session_each_day_data_#{for_device_type}", session_each_day_data)
      instance_variable_set("@session_each_day_options_#{for_device_type}", session_each_day_options)
    end

    def collect_session_each_day_data_in_minutes(start_date, days_count, total_records, start_attr_name, end_attr_name, for_device_type)
      
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      total_records_with_abondoned = total_records.pluck(end_attr_name)

      if for_device_type == "self_tour"
        start_end_datetime_arr = total_records_with_abondoned.include?(nil) ? total_records.pluck(start_attr_name, :updated_at) : total_records.pluck(start_attr_name, end_attr_name)
      else
        start_end_datetime_arr = total_records.pluck(
          start_attr_name,
          Arel.sql("COALESCE(end_datetime, updated_at) AS end_datetime")
        )
      end

      records_start_date = total_records.pluck(start_attr_name).map(&:to_date)
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
            seconds = return_time_in_seconds(arr.first,arr.last)
            mins = convert_seconds_into_minutes_data(seconds)
            minutes += mins
            total_minutes += mins
            count += 1
            total_count += 1
            remove_index << ind
          end
        end
        sessions_each_day_hash[uniq_start_date[i]] = (minutes / count).negative?() ? 0 : (minutes / count).round(2)
        records_start_date = records_start_date - [uniq_start_date[i]]
        remove_index.each_with_index {|removing_index,j| start_end_datetime_arr.delete_at(removing_index - j) }
      end

      instance_variable_set("@average_duration_each_session_in_minutes_#{for_device_type}", formatted_number( ((total_minutes / total_count).negative?() rescue 0) ? 0 : (total_minutes / total_count).round(2) ))
      session_each_day_labels = sessions_each_day_hash.keys.map(&:to_s)
      session_each_day_counts = sessions_each_day_hash.values

      session_each_day_minutes_data, session_each_day_minutes_options = make_line_chart(session_each_day_labels, session_each_day_counts, "#{get_name(for_device_type)} in Minutes", "rgba(0, 143, 212, 0.3)", "rgba(0, 143, 212, 1)")
      instance_variable_set("@session_each_day_minutes_data_#{for_device_type}", session_each_day_minutes_data)
      instance_variable_set("@session_each_day_minutes_options_#{for_device_type}", session_each_day_minutes_options)

    end 

    def collect_session_each_day_data_in_hours(total_records, start_attr_name, for_device_type)
      sessions_each_day_hourly_hash = return_empty_hash_hourly
      records_start_date_hours = total_records.pluck(start_attr_name, :community_time_zone).map {|dt| return_community_datetime(dt.first, dt.last).strftime("%H").to_i }
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
      max_sessions_slot =  convert_to_12_hour_format(max_hour_start + "-" + max_hour_end)
      instance_variable_set("@highest_hour_#{for_device_type}", max_sessions_slot)
      instance_variable_set("@session_in_highest_hour_#{for_device_type}", formatted_number(max_count))
      hour_labels = sessions_each_day_hourly_hash.keys.map do |h_key|
        start_to = h_key < 10 ? ("0" + h_key.to_s) : (h_key.to_s)
        end_then = (h_key + 1) < 10 ? ("0" + (h_key + 1).to_s) : ((h_key + 1).to_s)
        label_str = start_to + "-" + end_then
        label_str = convert_to_12_hour_format(label_str)
        label_str
      end
      hour_labels[- 1] = "11-12 AM"  if hour_labels.present?
      hour_values = sessions_each_day_hourly_hash.values
      session_each_day_hour_data, session_each_day_hour_options = make_bar_chart(hour_labels, hour_values, "Total #{get_name(for_device_type)}", "rgba(255,212,0,0.8)", "rgba(255,212,0,1)")
      instance_variable_set("@session_each_day_hour_data_#{for_device_type}", session_each_day_hour_data)
      instance_variable_set("@session_each_day_hour_options_#{for_device_type}", session_each_day_hour_options)
    end

    def bounce_rate_on_pages(total_records, visited_pages_attr_name, for_device_type)
      pages_hash = {"Single" => 0, "Multiple" => 0}
      visite_pages_counts = for_device_type == "self_tour" ? total_records.pluck(visited_pages_attr_name) : total_records.pluck(visited_pages_attr_name).map(&:count) 
      single_page_visitor = visite_pages_counts.count(1)
      multiple_page_visior = visite_pages_counts.size - single_page_visitor
      pages_hash["Single"] = formate_percentage(single_page_visitor, visite_pages_counts.size) #((single_page_visitor.to_f / visite_pages_counts.size.to_f).round(2) * 100).round(2)
      pages_hash["Multiple"] = formate_percentage(multiple_page_visior,visite_pages_counts.size ) #((multiple_page_visior.to_f / visite_pages_counts.size.to_f).round(2) * 100).round(2)

      instance_variable_set("@visits_to_favorites_page_#{for_device_type}", formatted_number(multiple_page_visior))
      instance_variable_set("@percentage_single_page_visitor_#{for_device_type}", "#{pages_hash["Single"]}%")
      instance_variable_set("@percentage_multiple_page_visitor_#{for_device_type}", "#{pages_hash["Multiple"]}%")
      bounce_data_labels, bounce_data_options = make_pie_chart(pages_hash.keys, pages_hash.values, "Total #{get_name(for_device_type)}", ["rgba(240, 90, 142, 0.8)", "rgba(0, 143, 212,0.8)"], ["rgba(240, 90, 142, 0.8)","rgba(0, 143, 212,1)"])
      instance_variable_set("@bounce_data_labels_#{for_device_type}", bounce_data_labels)
      instance_variable_set("@bounce_data_options_#{for_device_type}", bounce_data_options)
    end

    def events_per_session(start_date, days_count, total_records, start_attr_name, for_device_type)
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      if for_device_type == "self_tour"
        # records = total_records.order(start_attr_name).pluck(start_attr_name, :see_availability_counter, :apply_click_counter, :price_opened_counter, :notes_opened_counter, :camera_opened_counter)
        records = total_records.order(start_attr_name).pluck(start_attr_name, :see_availability_counter, :apply_click_counter, 0, :notes_opened_counter, :camera_opened_counter)
      else
        # records = total_records.order(start_attr_name).pluck(start_attr_name, :apply_click_counter,:favorite_saved_counter, :favorite_sent_counter, :price_opened_counter)
        records = total_records.order(start_attr_name).pluck(start_attr_name, :apply_click_counter,:favorite_saved_counter, :favorite_sent_counter, 0)
      end
      
      session_with_counts = 0
      for_device_type == "self_tour" ? (records.each {|ar| session_with_counts += 1 if ar[1] > 0 || ar[2] > 0 || ar[3] > 0 || ar[4] > 0 || ar[4] > 0 || ar[5] > 0}) : (records.each {|ar| session_with_counts += 1 if ar[1] > 0 || ar[2] > 0 || ar[3] > 0 || ar[4] > 0 })
      records_count = records.size
      records = records.map{ |arr| for_device_type == "self_tour" ? [arr.first.to_date, arr[1], arr[2], arr[3], arr[4], arr[5]] : [arr.first.to_date, arr[1], arr[2], arr[3], arr[4]] }
      records_start_date = records.map{ |arr| arr.first }
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size
      uniq_start_date_size.times do |i|
        count = 0
        remove_index = []
        records.each_with_index do |arr, ind|
          if arr.first == uniq_start_date[i]
            
            count += for_device_type == "self_tour" ? (arr[1] + arr[2] + arr[3] + arr[4] + arr[5]) :  (arr[1] + arr[2] + arr[3] + arr[4])
            remove_index << ind
          end
        end
        sessions_each_day_hash[uniq_start_date[i]] = count
        remove_index.each_with_index {|removing_index,j| records.delete_at(removing_index - j) }
      end

      instance_variable_set("@total_number_of_events_#{for_device_type}", formatted_number(sessions_each_day_hash.values.sum))
      session_without_counts = records_count - session_with_counts
      # percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      # percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      percentage_session_with_counts = formate_percentage(session_with_counts, records_count)
      percentage_session_without_counts = formate_percentage(session_without_counts, records_count)
      pie_chart_hash = {"#{get_name(for_device_type)} with Events" => percentage_session_with_counts, "#{get_name(for_device_type)} without Events" => percentage_session_without_counts}
      pie_events_data_labels, pie_events_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total #{get_name(for_device_type)}", ["rgba(0, 143, 212,0.5)", "rgba(255,212,0,0.5)"], ["rgba(0, 143, 212,1)","rgba(255,212,0,1)"])
      bar_events_data_labels, bar_events_data_options = make_bar_chart(sessions_each_day_hash.keys.map {|s_date| s_date.strftime("%Y-%m-%d") }, sessions_each_day_hash.values, "Total Events", "rgba(0, 143, 212,0.5)", "rgba(0, 143, 212,1)")
      instance_variable_set("@percentage_session_with_events_#{for_device_type}", "#{percentage_session_with_counts}%")
      instance_variable_set("@percentage_session_without_events_#{for_device_type}", "#{percentage_session_without_counts}%")
      instance_variable_set("@pie_events_data_labels_#{for_device_type}", pie_events_data_labels)
      instance_variable_set("@pie_events_data_options_#{for_device_type}", pie_events_data_options)
      instance_variable_set("@bar_events_data_labels_#{for_device_type}", bar_events_data_labels)
      instance_variable_set("@bar_events_data_options_#{for_device_type}", bar_events_data_options)
    end

    def apply_clicks_track_session(start_date, days_count, total_records, start_attr_name, for_device_type) 
      
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      records = total_records.order(start_attr_name).pluck(start_attr_name, :apply_click_counter)
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
      instance_variable_set("@total_number_of_apply_clicks_#{for_device_type}", formatted_number(sessions_each_day_hash.values.sum))
      session_without_counts = records_count - session_with_counts
      
      # percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      # percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)

      percentage_session_with_counts = formate_percentage(session_with_counts, records_count)
      percentage_session_without_counts = formate_percentage(session_without_counts, records_count)

      pie_chart_hash = {"#{get_name(for_device_type)} with Apply Clicks" => percentage_session_with_counts, "#{get_name(for_device_type)} without Apply Clicks" => percentage_session_without_counts}
      pie_apply_click_data_labels, pie_apply_click_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total #{get_name(for_device_type)}", ["rgba(137, 199, 101, 0.7)", "rgba(255,212,0,0.5)"], ["rgba(137, 199, 101, 1)","rgba(255,212,0,1)"])
      line_apply_click_data_labels, line_apply_click_data_options = make_line_chart(sessions_each_day_hash.keys.map {|s_date| s_date.strftime("%Y-%m-%d") }, sessions_each_day_hash.values, "Apply Clicks", "rgba(137, 199, 101, 0.5)", "rgba(137, 199, 101, 1)")
      instance_variable_set("@percentage_session_with_apply_clicks_#{for_device_type}", "#{percentage_session_with_counts}%")
      instance_variable_set("@percentage_session_without_apply_clicks_#{for_device_type}", "#{percentage_session_without_counts}%")
      instance_variable_set("@pie_apply_click_data_labels_#{for_device_type}", pie_apply_click_data_labels)
      instance_variable_set("@pie_apply_click_data_options_#{for_device_type}", pie_apply_click_data_options)
      instance_variable_set("@line_apply_click_data_labels_#{for_device_type}", line_apply_click_data_labels)
      instance_variable_set("@line_apply_click_data_options_#{for_device_type}", line_apply_click_data_options)
    end

    def favourite_saved_track_session(start_date, days_count, total_records, for_device_type) 
      
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
      instance_variable_set("@total_number_of_favourite_saved_#{for_device_type}", formatted_number(sessions_each_day_hash.values.sum))
      session_without_counts = records_count - session_with_counts
      
      # percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      # percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      
      percentage_session_with_counts = formate_percentage(session_with_counts, records_count)
      percentage_session_without_counts = formate_percentage(session_without_counts, records_count)

      pie_chart_hash = {"#{get_name(for_device_type)} with favorite saved" => percentage_session_with_counts, "#{get_name(for_device_type)} without favorite saved" => percentage_session_without_counts}
      pie_favourite_saved_data_labels, pie_favourite_saved_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total #{get_name(for_device_type)}", ["rgba(143, 73, 156, 0.5)", "rgba(255,212,0,0.5)"], ["rgba(143, 73, 156, 1)","rgba(255,212,0,1)"])
      bar_favourite_saved_data_labels, bar_favourite_saved_data_options = make_bar_chart(sessions_each_day_hash.keys.map {|s_date| s_date.strftime("%Y-%m-%d") }, sessions_each_day_hash.values, "Favorite saved", "rgba(143, 73, 156, 0.5)", "rgba(143, 73, 156, 1)")
      instance_variable_set("@percentage_session_with_favourite_saved_#{for_device_type}", "#{percentage_session_with_counts}%")
      instance_variable_set("@percentage_session_without_favourite_saved_#{for_device_type}", "#{percentage_session_without_counts}%")
      instance_variable_set("@pie_favourite_saved_data_labels_#{for_device_type}", pie_favourite_saved_data_labels)
      instance_variable_set("@pie_favourite_saved_data_options_#{for_device_type}", pie_favourite_saved_data_options)
      instance_variable_set("@bar_favourite_saved_data_labels_#{for_device_type}", bar_favourite_saved_data_labels)
      instance_variable_set("@bar_favourite_saved_data_options_#{for_device_type}", bar_favourite_saved_data_options)
    end

    def favourite_sent_track_session(start_date, days_count, total_records, for_device_type) 
      
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
      instance_variable_set("@total_number_of_favourite_sent_#{for_device_type}", formatted_number(sessions_each_day_hash.values.sum))
      session_without_counts = records_count - session_with_counts
      
      # percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      # percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      
      percentage_session_with_counts = formate_percentage(session_with_counts, records_count)
      percentage_session_without_counts = formate_percentage(session_without_counts, records_count)

      pie_chart_hash = {"#{get_name(for_device_type)} with favorite emailed" => percentage_session_with_counts, "#{get_name(for_device_type)} without favorite emailed" => percentage_session_without_counts}
      pie_favourite_sent_data_labels, pie_favourite_sent_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total #{get_name(for_device_type)}", ["rgba(240, 90, 142, 0.5)", "rgba(255,212,0,0.8)"], ["rgba(240, 90, 142, 1)","rgba(255,212,0,1)"])
      bar_favourite_sent_data_labels, bar_favourite_sent_data_options = make_bar_chart(sessions_each_day_hash.keys.map {|s_date| s_date.strftime("%Y-%m-%d") }, sessions_each_day_hash.values, "Favorite emailed", "rgba(240, 90, 142, 0.7)", "rgba(240, 90, 142, 1)")
      instance_variable_set("@percentage_session_with_favourite_sent_#{for_device_type}", "#{percentage_session_with_counts}%")
      instance_variable_set("@percentage_session_without_favourite_sent_#{for_device_type}", "#{percentage_session_without_counts}%")
      instance_variable_set("@pie_favourite_sent_data_labels_#{for_device_type}", pie_favourite_sent_data_labels)
      instance_variable_set("@pie_favourite_sent_data_options_#{for_device_type}", pie_favourite_sent_data_options)
      instance_variable_set("@bar_favourite_sent_data_labels_#{for_device_type}", bar_favourite_sent_data_labels)
      instance_variable_set("@bar_favourite_sent_data_options_#{for_device_type}", bar_favourite_sent_data_options)
    end

    def interface_used(start_date, days_count, total_records, for_device_type)
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      labels = sessions_each_day_hash.keys.map{|date| date.to_date.to_s}

      track_sessions = total_records.select("DATE(start_datetime) AS start_date", :track_session_type, 'COUNT(*) AS count').group("start_date", :track_session_type).order("start_date")
     
      metro_session_counts_array = []
      ipad_session_counts_array = []
      count_data = {}

      track_sessions.each do |result|
        date = result.start_date.to_s
        track_session_type = result.track_session_type
        count = result.count
        count_data[date] ||= {}
        count_data[date][track_session_type] = count
      end

      result_hash = labels.each_with_object({}) do |date, merged_hash|
        merged_hash[date] = { 'metro' => 0, 'ipad' => 0 }.merge(count_data[date] || {})
      end
      
      labels.each do |date|
        if count_data[date].present?
          metro_session_counts_array << (count_data[date]['metro'] || 0)
          ipad_session_counts_array << (count_data[date]['ipad'] || 0)
        else
          metro_session_counts_array << 0
          ipad_session_counts_array << 0
        end
      end


      total_count = metro_session_counts_array.sum + ipad_session_counts_array.sum

      # percentage_metro_interface_used = ((metro_session_counts_array.sum.to_f / total_count.to_f).round(2) * 100).round(2) rescue 0.0
      # percentage_ipad_interface_used = ((ipad_session_counts_array.sum.to_f / total_count.to_f).round(2) * 100).round(2) rescue 0.0
      
      percentage_metro_interface_used = formate_percentage(metro_session_counts_array.sum, total_count)
      percentage_ipad_interface_used = formate_percentage(ipad_session_counts_array.sum, total_count)

      bar_touch_data_labels, bar_touch_data_options = make_multiple_bar_chart(labels, metro_session_counts_array, ipad_session_counts_array)
      pie_chart_hash = {"Total sessions on tablet" => ipad_session_counts_array.sum, "Total sessions on touchscreen" => metro_session_counts_array.sum}
      pie_touch_data_labels, pie_touch_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total Sessions", ["rgba(137, 199, 101, 0.5)", "rgba(255,212,0,0.8)"], ["rgba(137, 199, 101, 1)","rgba(255,212,0,1)"])
    
      instance_variable_set("@percentage_ipad_interface_used_#{for_device_type}", "#{percentage_ipad_interface_used}%")
      instance_variable_set("@percentage_metro_interface_used_#{for_device_type}", "#{percentage_metro_interface_used}%")
      instance_variable_set("@total_number_of_touch_sent_#{for_device_type}", formatted_number(ipad_session_counts_array.sum))
      instance_variable_set("@bar_touch_data_labels_#{for_device_type}", bar_touch_data_labels)
      instance_variable_set("@bar_touch_data_options_#{for_device_type}", bar_touch_data_options)
      instance_variable_set("@pie_touch_data_labels_#{for_device_type}", pie_touch_data_labels)
      instance_variable_set("@pie_touch_data_options_#{for_device_type}", pie_touch_data_options)
    end

    def price_opened_track_session(start_date, days_count, total_records, start_attr_name, for_device_type) 
      
      records = total_records.order(start_attr_name).pluck(start_attr_name, :price_opened_counter)
      session_with_counts = 0
      records.each { |ar| session_with_counts += 1  if ar.last > 0 }
      records_count = records.size
      records_last_counts = records.map{ |arr| arr.last }
      instance_variable_set("@total_number_of_price_opened_#{for_device_type}", records_last_counts.sum)
      session_without_counts = records_count - session_with_counts
      
      # percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      # percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)

      percentage_session_with_counts = formate_percentage(session_with_counts, records_count)
      percentage_session_without_counts = formate_percentage(session_without_counts, records_count)
      

      pie_chart_hash = {"#{get_name(for_device_type)} with Price Opened" => percentage_session_with_counts, "#{get_name(for_device_type)} without Price Opened" => percentage_session_without_counts}
      pie_price_opened_data_labels, pie_price_opened_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total #{get_name(for_device_type)}", ["rgba(137, 199, 101, 0.8)",  "rgba(255,212,0,0.8)"], ["rgba(137, 199, 101, 1)", "rgba(255,212,0,1)"])
      instance_variable_set("@percentage_session_with_price_opened_#{for_device_type}", "#{percentage_session_with_counts}%")
      instance_variable_set("@percentage_session_without_price_opened_#{for_device_type}", "#{percentage_session_without_counts}%")
      instance_variable_set("@pie_price_opened_data_labels_#{for_device_type}", pie_price_opened_data_labels)
      instance_variable_set("@pie_price_opened_data_options_#{for_device_type}", pie_price_opened_data_options)

    end

    def opened_counter_session(start_date, days_count, total_records, start_attr_name, counter_attr_type, for_device_type) 
      
      records = total_records.order(start_attr_name).pluck(start_attr_name, counter_attr_type)
      session_with_counts = 0
      records.each { |ar| session_with_counts += 1  if ar.last > 0 }
      records_count = records.size
      records_last_counts = records.map{ |arr| arr.last }
  
      instance_variable_set("@total_number_of_#{counter_attr_type}", formatted_number( records_last_counts.sum ))
      session_without_counts = records_count - session_with_counts
      
      # percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      # percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      
      percentage_session_with_counts = formate_percentage(session_with_counts, records_count)
      percentage_session_without_counts = formate_percentage(session_without_counts, records_count)

      with_session_str = counter_attr_type == :camera_opened_counter ? "#{get_name(for_device_type)} with Camera Opened" : "#{get_name(for_device_type)} with Notes Opened"
      without_session_str = counter_attr_type == :camera_opened_counter ? "#{get_name(for_device_type)} without Camera Opened" : "#{get_name(for_device_type)} without Notes Opened"
      pie_chart_hash = {with_session_str => percentage_session_with_counts, without_session_str => percentage_session_without_counts}
      opened_data_labels, opened_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total #{get_name(for_device_type)}", ["rgba(240, 90, 142, 0.5)", "rgba(255,212,0,0.5)"], ["rgba(240, 90, 142, 1)","rgba(255,212,0,1)"])
      instance_variable_set("@percentage_session_with_counts_#{counter_attr_type}", "#{percentage_session_with_counts}%")
      instance_variable_set("@percentage_session_without_counts_#{counter_attr_type}", "#{percentage_session_without_counts}%")
      instance_variable_set("@pie_#{counter_attr_type}_data_labels", opened_data_labels)
      instance_variable_set("@pie_#{counter_attr_type}_data_options", opened_data_options)
    end

    def tour_site_or_tour_state_session(start_date, days_count, total_records, tour_site_or_tour_state_attr, for_device_type) 
      
      sessions_each_day_hash_onsite_completed = return_empty_hash(days_count,start_date)
      sessions_each_day_hash_offsite_abandoned = return_empty_hash(days_count,start_date)
      records = total_records.order(:arrived).pluck(:arrived, tour_site_or_tour_state_attr)
      records_count = records.size
      records = records.map{ |arr| [arr.first.to_date, arr.last] }
      records_start_date = records.map{ |arr| arr.first }
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size
      uniq_start_date_size.times do |i|
        count_onsite_completed = 0
        count_offsite_abandoned = 0
        remove_index = []
        records.each_with_index do |arr, ind|
          if arr.first == uniq_start_date[i]
            if arr.last == "onsite" || arr.last == "completed"
              count_onsite_completed += 1
            elsif arr.last == "offsite" || arr.last == "abandoned"
              count_offsite_abandoned += 1
            end
            remove_index << ind
          end
        end
        sessions_each_day_hash_onsite_completed[uniq_start_date[i]] = count_onsite_completed
        sessions_each_day_hash_offsite_abandoned[uniq_start_date[i]] = count_offsite_abandoned
        remove_index.each_with_index {|removing_index,j| records.delete_at(removing_index - j) }
      end

      total_number_of_true_session = sessions_each_day_hash_onsite_completed.values.sum
      total_number_of_false_session = sessions_each_day_hash_offsite_abandoned.values.sum
      
      # percentage_true_session_counts = ((total_number_of_true_session.to_f / records_count.to_f).round(2) * 100).round(2)
      # percentage_false_session_counts = ((total_number_of_false_session.to_f / records_count.to_f).round(2) * 100).round(2)
      
      percentage_true_session_counts = formate_percentage(total_number_of_true_session, records_count)
      percentage_false_session_counts = formate_percentage(total_number_of_false_session, records_count)

      hash_true_str = tour_site_or_tour_state_attr == :tour_site ? "Onsite #{get_name(for_device_type)}" : "Completed #{get_name(for_device_type)}"
      hash_false_str = tour_site_or_tour_state_attr == :tour_site ? "Offsite #{get_name(for_device_type)}" : "Incomplete #{get_name(for_device_type)}"
      pie_chart_hash = {hash_true_str => percentage_true_session_counts, hash_false_str => percentage_false_session_counts}
      pie_tour_data_labels, pie_tour_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total #{get_name(for_device_type)}", ["rgba(0, 143, 212,0.5)", "rgba(255,212,0,0.5)"], ["rgba(0, 143, 212,1)","rgba(255,212,0,1)"])
      bar_tour_data_labels, bar_tour_data_options = make_bar_chart_for_site_session(sessions_each_day_hash_onsite_completed.keys.map {|s_date| s_date.strftime("%Y-%m-%d") }, sessions_each_day_hash_onsite_completed.values, sessions_each_day_hash_offsite_abandoned.keys.map {|s_date| s_date.strftime("%Y-%m-%d") }, sessions_each_day_hash_offsite_abandoned.values, hash_true_str, hash_false_str, "rgba(0, 143, 212,0.8)", "rgba(0, 143, 212,1)", "rgba(255,212,0,1)", "rgba(255,212,0,1)")
      
      instance_variable_set("@pie_#{tour_site_or_tour_state_attr}_data_labels", pie_tour_data_labels)
      instance_variable_set("@pie_#{tour_site_or_tour_state_attr}_data_options", pie_tour_data_options)
      instance_variable_set("@bar_#{tour_site_or_tour_state_attr}_data_labels", bar_tour_data_labels)
      instance_variable_set("@bar_#{tour_site_or_tour_state_attr}_data_options", bar_tour_data_options)
      instance_variable_set("@percentage_#{tour_site_or_tour_state_attr}_true_counts", "#{percentage_true_session_counts}%")
      instance_variable_set("@percentage_#{tour_site_or_tour_state_attr}_false_counts", "#{percentage_false_session_counts}%")
    end

    def tour_type_session(start_date, days_count, total_records, for_device_type) 

      records = total_records.order(:arrived).pluck(:arrived, :tour_type)
      @tour_scheduled_counts = 0
      @tour_unscheduled_counts = 0
      records.each { |ar| @tour_scheduled_counts += 1  if ar.last == "scheduled"}
      records.each { |ar| @tour_unscheduled_counts += 1  if ar.last == "unscheduled"}
      records_count = @tour_scheduled_counts + @tour_unscheduled_counts
      
      # percentage_tour_scheduled_counts = ((@tour_scheduled_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      # percentage_tour_unscheduled_counts = ((@tour_unscheduled_counts.to_f / records_count.to_f).round(2) * 100).round(2)

      percentage_tour_scheduled_counts = formate_percentage(@tour_scheduled_counts, records_count)
      percentage_tour_unscheduled_counts = formate_percentage(@tour_unscheduled_counts, records_count)

      pie_chart_hash = {"Scheduled #{get_name(for_device_type)}" => percentage_tour_scheduled_counts, "Unscheduled #{get_name(for_device_type)}" => percentage_tour_unscheduled_counts}
      @pie_tour_type_data_labels, @pie_tour_type_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total #{get_name(for_device_type)}", ["rgba(137, 199, 101, 0.7)", "rgba(255,212,0,0.5)"], ["rgba(137, 199, 101, 1)","rgba(255,212,0,1)"])
     
      @tour_scheduled_counts = formatted_number(@tour_scheduled_counts)
      @tour_unscheduled_counts = formatted_number(@tour_unscheduled_counts)

      @percentage_tour_scheduled_counts = "#{percentage_tour_scheduled_counts}%"
      @percentage_tour_unscheduled_counts = "#{percentage_tour_unscheduled_counts}%"    
    end

    def see_availability_session(start_date, days_count, total_records, for_device_type) 
      
      sessions_each_day_hash = return_empty_hash(days_count,start_date)
      records = total_records.order(:arrived).pluck(:arrived, :see_availability_counter)
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
      @total_number_of_see_availability = formatted_number(sessions_each_day_hash.values.sum)
      session_without_counts = records_count - session_with_counts

      # percentage_session_with_counts = ((session_with_counts.to_f / records_count.to_f).round(2) * 100).round(2)
      # percentage_session_without_counts = ((session_without_counts.to_f / records_count.to_f).round(2) * 100).round(2)

      percentage_session_with_counts = formate_percentage(session_with_counts, records_count)
      percentage_session_without_counts = formate_percentage(session_without_counts, records_count)

      @percentage_session_with_see_availability = "#{percentage_session_with_counts}%"
      @percentage_session_without_see_availability = "#{percentage_session_without_counts}%"

      pie_chart_hash = {"#{get_name(for_device_type)} with See Availability" => percentage_session_with_counts, "#{get_name(for_device_type)} without See Availability" => percentage_session_without_counts}
      @pie_see_availbility_data_labels, @pie_see_availbility_data_options = make_pie_chart(pie_chart_hash.keys, pie_chart_hash.values, "Total #{get_name(for_device_type)}", ["rgba(143, 73, 156, 0.5)", "rgba(255,212,0,0.5)"], ["rgba(143, 73, 156, 1)","rgba(255,212,0,1)"])
      @line_see_availbility_data_labels, @line_see_availbility_data_options = make_line_chart(sessions_each_day_hash.keys.map {|s_date| s_date.strftime("%Y-%m-%d") }, sessions_each_day_hash.values, "See Availability", "rgba(143, 73, 156, 0.5)", "rgba(143, 73, 156, 1)")
    end

    def stops_per_tour(start_date, days_count, total_records, for_device_type)
      tour_keys = total_records.where.not(tour_key: nil).pluck(:tour_key)
      visited_stops = VisitedStop.where(tour_key: tour_keys)
      @average_number_of_stops_per_session = visited_stops.uniq.size / (tour_keys.size rescue 1)
      sessions_each_day_hourly_hash = return_empty_hash_hourly
      records_start_date_hours = visited_stops.pluck(:created_at).map {|dt| dt.strftime("%H").to_i }
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
      hour_labels = sessions_each_day_hourly_hash.keys.map do |h_key|
        start_to = h_key < 10 ? ("0" + h_key.to_s) : (h_key.to_s)
        end_then = (h_key + 1) < 10 ? ("0" + (h_key + 1).to_s) : ((h_key + 1).to_s)
        label_str = start_to + "-" + end_then
        label_str = convert_to_12_hour_format(label_str)
        label_str
      end
      hour_labels[- 1] = "11-12 AM"  if hour_labels.present?
      hour_values = sessions_each_day_hourly_hash.values
      @session_each_day_stops_hour_data, @session_each_day_stops_hour_options = make_chart(hour_labels, hour_values, "Total Stops", "rgba(255,212,0,0.8)", "rgba(255,212,0,1)")
    end

    def visits_per_tour_stop(total_records, for_device_type)
      visites_stops_hash = {}
      tour_keys = total_records.where.not(tour_key: nil).pluck(:tour_key)
      visited_stops = VisitedStop.where(tour_key: tour_keys)
      @average_number_of_stops_per_session_tour_stop = visited_stops.uniq.size / tour_keys.size
      tour_stop_ids = visited_stops.pluck(:tour_stop_id)
      tour_stops = TourStop.where(id: tour_stop_ids)
      stops = tour_stops.where.not(stop_id: nil).pluck(:stop_type, :stop_id)
      stops.each do |arr|
        begin
          stop = arr.first.camelcase.constantize.find arr.last
          if arr.first == "unit"
            unit_type_or_name = stop.unit_type_or_name
            visites_stops_hash[unit_type_or_name] = visites_stops_hash[unit_type_or_name].nil? ? (1) : (visites_stops_hash[unit_type_or_name] + 1)
          elsif arr.first == "amenity"
            if stop.amenity_type == ""
              visites_stops_hash["Other amenity"] = visites_stops_hash["Other amenity"].nil? ? (1) : (visites_stops_hash["Other amenity"] + 1)
            else
              visites_stops_hash[stop.amenity_type] = visites_stops_hash[stop.amenity_type].nil? ? (1) : (visites_stops_hash[stop.amenity_type] + 1)
            end
          else
            visites_stops_hash["Other than unit and amenity stop"] = visites_stops_hash["Other than unit and amenity stop"].nil? ? (1) : (visites_stops_hash["Other than unit and amenity stop"] + 1)
          end
        rescue => error
          next
        end
      end
      visites_stops_hash = Hash[visites_stops_hash.sort_by{ |_, v| -v }]
      @visited_per_tour_stop_data_labels, @visited_per_tour_stop_data_options = make_horizontal_chart(visites_stops_hash.keys, visites_stops_hash.values, "Total Stops", "rgba(143, 73, 156, 0.5)", "rgba(143, 73, 156, 1)")
    end

    def visits_per_session_page(total_records, for_device_type)
      visites_pages_hash = {}
      visited_pages = total_records.pluck(:visited_pages)
      visited_pages.each do |pages|
        pages.each do |page_name|
          visites_pages_hash[page_name] = visites_pages_hash[page_name].nil? ? (1) : (visites_pages_hash[page_name] + 1)
        end
      end
      
      visites_pages_hash = Hash[visites_pages_hash.sort_by{ |_, v| -v }]

      @average_number_of_pages_per_session_metro = formatted_number( (visites_pages_hash&.values&.sum&.to_f / total_records&.size&.to_f).round )
      @visited_pages_data_labels, @visited_pages_data_options = make_horizontal_chart(visites_pages_hash.keys, visites_pages_hash.values, "Total #{get_name(for_device_type)}", "rgba(143, 73, 156, 0.5)", "rgba(143, 73, 156, 1)")
    end

    def pages_per_session(start_date, days_count, total_records, for_device_type)
      # No 5 in Document
      sessions_each_day_hourly_hash = return_empty_hash_hourly
      records_start_date_hours = total_records.pluck(:start_datetime,:community_time_zone).map {|dt| dt[0].in_time_zone(dt[1]).strftime("%H").to_i }
      uniq_hours = records_start_date_hours.uniq

      uniq_hours.each do |h|
        records_in_1_hour = records_start_date_hours.count(h)
        sessions_each_day_hourly_hash[h] = records_in_1_hour
        records_start_date_hours = records_start_date_hours - [h]
      end
      hour_labels = sessions_each_day_hourly_hash.keys.map do |h_key|
        start_to = h_key < 10 ? ("0" + h_key.to_s) : (h_key.to_s)
        end_then = (h_key + 1) < 10 ? ("0" + (h_key + 1).to_s) : ((h_key + 1).to_s)
        label_str = start_to + "-" + end_then
        label_str = convert_to_12_hour_format(label_str)
        label_str
      end
      hour_labels[- 1] = "11-12 AM"  if hour_labels.present?
      hour_values = sessions_each_day_hourly_hash.values
      @average_number_of_pages_per_session = hour_values.sum / total_records.size
      @session_each_day_hour_pages_data, @session_each_day_hour_pages_options = make_chart(hour_labels, hour_values, "Total #{get_name(for_device_type)}", "rgba(255,212,0,0.8)", "rgba(255,212,0,1)")
    end

    def no_shows(start_date, days_count, scheduled_tours, tour_histories, for_device_type)
      sessions_each_day_hash = return_empty_hash(days_count,start_date) # Initialization
      
      scheduled_tours_date_with_user = scheduled_tours.pluck(:tour_date, :tour_user_id, :tour_type)
      tour_histories_date_with_user = tour_histories.where(tour_status: ["self_tour", "virtual_tour", "guided_tour"]).pluck(:arrived, :tour_user_id, :tour_status).map do |arr| 
        arr[2] == "virtual_tour" ? [arr[0].to_date, arr[1], "Virtual Tour"] : [arr[0].to_date, arr[1], arr[2]]
      end
      no_shows_schedule_records = scheduled_tours_date_with_user - tour_histories_date_with_user
      records_start_date = no_shows_schedule_records.map {|arr| arr.first}
      uniq_start_date = records_start_date.uniq
      uniq_start_date_size = uniq_start_date.size

      uniq_start_date_size.times do |i|
        sessions_each_day_hash[uniq_start_date[i]] = records_start_date.count(uniq_start_date[i])
        records_start_date = records_start_date - [uniq_start_date[i]]
      end

      @no_show_count = formatted_number(no_shows_schedule_records.count)
      @session_each_day_no_show_data, @session_each_day_no_show_options = make_bar_chart(sessions_each_day_hash.keys.map(&:to_s), sessions_each_day_hash.values, "Total #{get_name(for_device_type)}", "rgba(240, 90, 142, 0.8)", "rgba(240, 90, 142, 1)")
    end

    def get_name product_type
      case product_type
      when "pynwheel_tour"
        "Tours"
      when "maps"
        "Interactions"
      else
        "Sessions"
      end
    end
end
