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

  def return_empty_hash_hourly(days_count,start_date)
    h = {}
    days_count.times do |i|
      24.times do |j|
        h[start_date + (i.day) + j.hour] = 0
      end
    end
    return h
  end

end
