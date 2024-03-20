module DateFormatter
  extend ActiveSupport::Concern

  def formatted_date_by_region(country_code, date)
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
end
