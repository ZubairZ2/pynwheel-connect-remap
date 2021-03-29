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
    options = { legend: {display: false} }
    return labels, options
  end

end
