module AnalyticsHelper

  def return_total_days(start_date,end_date)
    start_date = Time.new(start_date.strftime("%Y"), start_date.strftime("%m"), start_date.strftime("%d"))
    end_date = Time.new(end_date.strftime("%Y"), end_date.strftime("%m"), end_date.strftime("%d"))
    seconds = (end_date - start_date).to_i
    dd, hh = seconds.divmod(60*60*24)
    return (dd + 1);
  end

  def return_time_in_seconds(start_datetime,end_datetime)
    # binding.pry
    # start_datetime = Time.parse(start_datetime)
    # end_datetime = Time.parse(end_datetime)
    # start_datetime = Time.new(start_datetime.strftime("%Y"), start_datetime.strftime("%m"), start_datetime.strftime("%d"),start_datetime.strftime("%H"), start_datetime.strftime("%M"), start_datetime.strftime("%S"))
    # end_datetime = Time.new(end_datetime.strftime("%Y"), end_datetime.strftime("%m"), end_datetime.strftime("%d"),end_datetime.strftime("%H"), end_datetime.strftime("%M"), end_datetime.strftime("%S"))
    # seconds = (end_datetime - start_datetime).to_i
    # mm, ss = seconds.divmod(60)
    return (end_datetime - start_datetime).to_i;
  end

  def convert_seconds_into_minutes_data seconds
    Rational(seconds, 60).round(2).to_f
  end

  def convert_to_12_hour_format(time_range)
    start_time, end_time = time_range.split('-')

    start_time = start_time.to_i
    end_time = end_time.to_i

    start_period = start_time < 12 ? 'AM' : 'PM'
    end_period = end_time < 12 ? 'AM' : 'PM'

    start_time = start_time % 12
    # start_period = "AM" if start_time.zero?
    start_time = 12 if start_time.zero?

    end_time = end_time % 12
    # end_period = "AM" if end_time.zero?
    end_time = 12 if end_time.zero?

    "#{start_time}-#{end_time} #{end_period}"
  end



  def return_empty_hash(days_count,start_date)
    h = {}
    days_count.times do |i|
      h[start_date + (i.day)] = 0
    end
    return h
  end

  def return_empty_hash_hourly
    h = {}
    24.times do |j|
      h[j] = 0
    end
    return h
  end

  def make_chart(session_each_day_labels, session_each_day_counts, label, background_color, border_color)
    labels = {
      labels: session_each_day_labels,
      datasets: [
        {
            label: label,
            backgroundColor: background_color,
            borderColor: border_color,
            data: session_each_day_counts
        }
      ]
    }
    options = { legend: {display: false}, responsive: true, maintainAspectRatio: false, scales: {
        xAxes: charts_styling,
        yAxes: [{
            ticks: {
                beginAtZero: true,
                precision: 0
            }
        }]
    } }
    return labels, options
  end

  def make_multiple_bar_chart(labels, metro_data, ipad_data)
    labels = {
      labels: labels,
      datasets: [
        {
          label: "Tablet sessions",
          backgroundColor: "rgba(137, 199, 101, 0.8)",
          borderColor: "rgba(137, 199, 101, 1)",
          borderWidth: 3,
          data: ipad_data,
          stack: "Touch"
        },
        {
          label: "Touchscreen sessions",
          backgroundColor: "rgba(255, 212, 0, 0.8)",
          borderColor:"rgba(255, 212, 0, 1)",
          borderWidth: 3,
          data: metro_data,
          stack: "Touch"
        }
      ]
    }

    options = { legend: {display: false}, responsive: true, maintainAspectRatio: false, scales: {
                  xAxes: charts_styling,
                  yAxes: [{
                    ticks: {
                      beginAtZero: true,
                      precision: 0
                    }
                  }]
                } 
              }

    return labels, options
  end


  def make_bar_chart(session_each_day_labels, session_each_day_counts, label, background_color, border_color)
    labels = {
      labels: session_each_day_labels,
      datasets: [
        {
          label: label,
          backgroundColor: background_color,
          borderColor: border_color,
          borderWidth: 3,
          data: session_each_day_counts
        }
      ]
    }

    options = { legend: {display: false}, responsive: true, maintainAspectRatio: false, scales: {
                  xAxes: charts_styling,
                  yAxes: [{
                    ticks: {
                      beginAtZero: true,
                      precision: 0
                    }
                  }]
                } 
              }

    return labels, options
  end

  def make_line_chart(session_each_day_labels, session_each_day_counts, label, background_color, border_color)
    labels = {
      labels: session_each_day_labels,
      datasets: [
        {
            label: label,
            backgroundColor: background_color,
            borderColor: border_color,
            borderWidth: 3,
            data: session_each_day_counts
        }
      ]
    }
    options = { legend: {display: false}, responsive: true, maintainAspectRatio: false, scales: {
        yAxes: [{
            ticks: {
                beginAtZero: true,
                precision: 0
            }
        }]
      } }
    return labels, options
  end

  def make_pie_chart(session_each_day_labels, session_each_day_counts, label, background_color, border_color)
    labels = {
      labels: session_each_day_labels,
      datasets: [
        {
            label: label,
            backgroundColor: background_color,
            borderColor: border_color,
            borderWidth: 4,
            titleFontSize: 18,
            bodyFontSize: 18,
            footerFontSize: 18,
            fontSize: 18,
            fontStyle: 'bold',
            data: session_each_day_counts
        }
      ]
    }
    options = { legend: {display: false}, responsive: true, maintainAspectRatio: false, title: { fontSize: 18, fontStyle: 'bold'} }
    return labels, options
  end

  def make_horizontal_chart(session_each_day_labels, session_each_day_counts, label, background_color, border_color)
    labels = {
      labels: session_each_day_labels,
      datasets: [
        {
            label: label,
            backgroundColor: background_color,
            borderColor: border_color,
            data: session_each_day_counts
        }
      ]
    }
    options = { legend: {display: false}, responsive: true, maintainAspectRatio: false, 
      scales: {
        xAxes: [{
            ticks: {
                beginAtZero: true,
                precision: 0
            }
        }]
      }
    }
    return labels, options
  end

  def make_bar_chart_for_site_session(onsite_session_each_day_labels, onsite_session_each_day_counts, offsite_session_each_day_labels, offsite_session_each_day_counts, label1, label2, background_color1, border_color1, background_color2, border_color2)
    labels = {
      labels: onsite_session_each_day_labels,
      datasets: [
        {
            label: label1,
            backgroundColor: background_color1,
            borderColor: border_color1,
            data: onsite_session_each_day_counts
        },
        {
            label: label2,
            backgroundColor: background_color2,
            borderColor: border_color2,
            data: offsite_session_each_day_counts
        }
      ]
    }
    options = { legend: {display: false}, responsive: true, maintainAspectRatio: false, scales: {
        xAxes: charts_styling,
        yAxes: [{
            ticks: {
                beginAtZero: true,
                precision: 0
            }
        }]
      } }
    return labels, options
  end
  
  def admin_type
    [ ["All pynwheel", "all_pynwheel"], ["All dwelo", "all_dwello"] ]
  end

  def communities_list(user)
    fetch_communities(user).pluck(:name, :id)
  end

  def companies_list(user)
    fetch_companies(user).pluck(:name, :id)    
  end

  def regions_list(company_id)
    fetch_regions(company_id).pluck(:name, :id)    
  end

  def fetch_companies(user)
    if user.is_super_admin?
      companies = Company.all
    elsif user.is_dwelo_admin?
      companies = Company.where(creator_id: User.where(role: "Dwelo admin").ids)
    else
      companies = Company.where(id: user.company_id)
    end

    if(["development@intagleo.com", "dev_pynwheel@intagleo.com", "qa_pynwheel@intagleo.com"].include?(user.email))
      companies
    else
      companies.remove_pynwheel_company
    end
  end

  def fetch_communities(user)
    if user.is_super_admin?
      communities = Community.all
    elsif user.is_dwelo_admin?
      communities = fetch_dwelo_communities
    elsif user.is_company_admin?
      communities = user.company.communities
    elsif user.is_regional_admin?
      communities = user.region.communities
    else
      communities = user.communities
    end
    communities.active_communities.order(:name)
  end

  def fetch_regions(company_id)
    Region.where(company_id: company_id)
  end

  def fetch_dwelo_communities
    assigned_communities_ids = current_user.communities.ids # all assinged communities
    dwelo_communities_ids = Community.where(creator_id: User.where(role: "Dwelo admin").ids).ids # all communities created by any dwelo admin
    dwelo_companies_communities = Community.joins(:company).where(companies: {creator_id: User.where(role: "Dwelo admin").ids}).ids # all communities under dwelo_companies (either created by dwelo_admin or super_admin)
    ids = (assigned_communities_ids + dwelo_communities_ids + dwelo_companies_communities).uniq
    communities = Community.where(id: ids)
    communities
  end

  def fetch_date_range_text(start_date , end_date, days_count)
    days_count += 1
    if start_date == end_date && start_date == Date.today
      str = "of Today"
    elsif start_date == end_date && start_date == (Date.today - 1.day)
      str = "of Yesterday"
    elsif start_date == end_date && start_date == (Date.today + 1.day)
      str = "of Tommorow"
    elsif days_count == 7
      str = "of Last Week"
    elsif days_count <= 30
      str = "of Last " + days_count.to_s + " days"
    else
      str = "from " + start_date.strftime("%Y/%m/%d") + " - " + end_date.strftime("%Y/%m/%d")
    end
    return str
  end
  
  # def return_community_datetime(datetime, community_time_zone)
  #   return (Time.zone.parse(datetime.to_s).in_time_zone(community_time_zone).to_datetime)
  # end

  def return_community_datetime(datetime, community_time_zone)
    datetime = Time.zone.parse(datetime.to_s) unless datetime.is_a?(Time)
    datetime.in_time_zone(community_time_zone).to_datetime
  end

  def charts_styling
    styling_arr = []
    if @days_count > 30
      styling_arr = [{
          barPercentage: 0.5,
          barThickness: 10,
        }]
    end
    styling_arr
    
  end
end
