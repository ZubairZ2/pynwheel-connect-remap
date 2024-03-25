module DateFormatter
  extend ActiveSupport::Concern

  def formatted_date_by_region(country_code, date)
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

  def date_format_by_region country_code
    case country_code
    when "US"
     '%m/%d/%Y'
    when "GB"
      '%d/%m/%Y'
    when "CA"
      '%d/%m/%Y'
    else
      '%m/%d/%Y'
    end
  end

  private

  def convert_to_date date
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
