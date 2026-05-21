class ReportsController < ApplicationController
  include CommunitiesHelper
  include FeedbacksHelper

  def index
  end

  def generate_webpages_report
    send_data(WebpagesReportService.new().get_report() , :type => 'application/xlsx', :filename => "pynwheel-webpages-report.csv")
  end

  def maps_no_session_report
    send_data(MapsNoSessionReportService.new().get_report() , :type => 'application/xlsx', :filename => "maps-no-session-report.csv")
  end

  def generate_salesforce_report
    send_data(SalesforceReportService.new().get_report() , :type => 'application/xlsx', :filename => "salesforce-properties-report.csv")
  end

  def properties_average_data_report
    send_data(PropertiesAverageDataReportService.new().get_report() , :type => 'application/xlsx', :filename => "pynwheel-properties-data-report.csv")
  end

  def generate_sessions_report
    send_data(SessionsReportService.new(params[:start_date], params[:end_date]).get_report() , :type => 'application/xlsx', :filename => "pynwheel-touch-annual-sessions-report.csv")
  end

  def unplotted_units_report
    send_data(UnplottedUnitsReportService.new().get_report() , :type => 'application/xlsx', :filename => "pynwheel-unplotted-units-report.csv")
  end

  def export_floor_map_urls
    send_data(
      Reports::FloorMapUrls.new().get_report,
      type: 'application/xlsx',
      filename: "Properties-Floor-Level-Map-Urls-List.csv"
    )
  end
  
  def apartmentlist_maps_report
    send_data(
      ApartmentlistMapsReportService.new.get_report,
      type: 'application/xlsx',
      filename: 'apartmentlist-maps-report.csv'
    )
  end

  def account_report
    @community = Community.find(params[:community_id])
    workbook = WriteXLSX.new("public/AccountReport/AccountReport.xlsx")
    zip_data = write_account_report(workbook)    
    send_data(zip_data, :type => 'application/zip', :filename => "AccountReport.zip")
  end

  def tour_feedback_report
    workbook = WriteXLSX.new("public/TourFeedbackReport/TourFeedbackReport.xlsx")
    zip_data = write_feedback_report(workbook)
    send_data(zip_data, :type => 'application/zip', :filename => "TourFeedbackReport.zip")
  end

  def partner_analytics_report
    send_data(PartnerAnalyticsReportService.new(params[:start_date], params[:end_date], params[:partner]).get_report() , :type => 'application/xlsx', :filename => "partner-analytics-report.csv")
  end

  def partners_performance_report
    send_data(
      PartnersPerformanceReportService.new(params[:start_date], params[:end_date], params[:partner]).get_report,
      type: 'text/csv',
      filename: "apartment-list-performance-report.csv"
    )
  end

end
