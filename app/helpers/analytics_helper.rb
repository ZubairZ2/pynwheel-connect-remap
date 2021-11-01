module AnalyticsHelper

  def return_total_days(start_date,end_date)
    start_date = Time.new(start_date.strftime("%Y"), start_date.strftime("%m"), start_date.strftime("%d"))
    end_date = Time.new(end_date.strftime("%Y"), end_date.strftime("%m"), end_date.strftime("%d"))
    seconds = (end_date - start_date).to_i
    dd, hh = seconds.divmod(60*60*24)
    return dd;
  end

  def return_time_in_minutes(start_datetime,end_datetime)
    start_datetime = Time.new(start_datetime.strftime("%Y"), start_datetime.strftime("%m"), start_datetime.strftime("%d"),start_datetime.strftime("%H"), start_datetime.strftime("%M"), start_datetime.strftime("%S"))
    end_datetime = Time.new(end_datetime.strftime("%Y"), end_datetime.strftime("%m"), end_datetime.strftime("%d"),end_datetime.strftime("%H"), end_datetime.strftime("%M"), end_datetime.strftime("%S"))
    seconds = (end_datetime - start_datetime).to_i
    mm, ss = seconds.divmod(60)
    return mm;
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
    options = { legend: {display: false} }
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
    options = { legend: {display: false}, scales: {
        yAxes: [{
            ticks: {
                beginAtZero: true,
                precision: 0
            }
        }]
    } }
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
            borderWidth: 4,
            data: session_each_day_counts
        }
      ]
    }
    options = { legend: {display: false}, scales: {
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
    options = { legend: {display: false}, title: { fontSize: 18, fontStyle: 'bold'} }
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
    options = { legend: {display: false}, 
      scales: {
        xAxes: [{
            ticks: {
                beginAtZero: true,
                beginAtZero: true
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
    options = { legend: {display: false}, scales: {
        yAxes: [{
            ticks: {
                beginAtZero: true,
                precision: 0
            }
        }]
      } }
    return labels, options
  end

  def product_type
      #[ ["Maps","maps"], ["Self Tour", "self_tour"], ["Touch", "touch"], ["All", "all"] ]
      [ ["Self Tour", "self_tour"]]
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

  def regions_list(user)
    fetch_regions(user).pluck(:name, :id)    
  end

  def fetch_companies(user)
    if user.is_super_admin?
      companies = Company.all
    elsif user.is_dwelo_admin?
      companies = Company.where(creator_id: User.where(role: "Dwelo admin").ids)
    else
      companies = Company.where(id: user.company_id)
    end
    companies
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
    communities
  end

  def fetch_regions(user)
    Region.where(company_id: fetch_companies(user).ids)
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
  
  def return_community_datetime(datetime, community_time_zone)
    return (Time.zone.parse(datetime.to_s).in_time_zone(community_time_zone).to_datetime)
  end

end
