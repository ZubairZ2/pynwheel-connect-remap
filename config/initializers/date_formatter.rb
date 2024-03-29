module DateFormatter
  def self.formatted_date_by_region(country_code, date)
    return date if (date === "Now" || !date.present?)
    date =  convert_to_date(date)

    case country_code
    when "US"
      date.strftime('%m/%d/%Y')
    when "GB"
      date.strftime('%d/%m/%Y')
    when "CA"
      date.strftime('%d/%m/%Y')
    else
      date.strftime('%m/%d/%Y')
    end
  end

  def self.date_format_by_region country_code
    case country_code
    when "US"
      "MM/dd/yyyy"
    when "GB"
      "dd/MM/yyyy"
    when "CA"
      "dd/MM/yyyy"
    else
      "MM/dd/yyyy"
    end
  end

  def self.country_code_by_region country_code
    case country_code
    when "US"
      "en-US"
    when "GB"
      "en-GB"
    when "CA"
      "en-CA"
    else
      "en-US"
    end
  end

  def self.convert_to_date date
    unless date.instance_of?(Date)
      date = begin
        Date.strptime(date, "%Y-%m-%d")
      rescue ArgumentError
        Date.strptime(date, "%m/%d/%Y")
      rescue ArgumentError
        Date.strptime(date, "%d/%m/%Y")
      rescue ArgumentError
        Date.strptime(date, "%m-%d-%Y")
      rescue ArgumentError
        Date.strptime(date, "%d-%m-%Y")
      rescue ArgumentError
        raise ArgumentError, "Invalid date format: #{date}"
      end
    end

    return date
  end
end
