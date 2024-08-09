class UnplottedUnitsReportService < BaseService
  def initialize
  end

  def get_report
    CSV.generate(headers: true) do |csv|
      csv << headers
      communities_with_counts.each do |community|
        csv << [
          community.company_name,
          community.name.strip,
          community.unplotted_units_count
        ]
      end
    end
  end

  private

  def headers
    %w[Company\ Name Community\ Name Number\ Of\ Unplotted\ Units]
  end

  def communities_with_counts
    Community.active_client_properties
             .joins(:company)
             .left_joins(:units)
             .select('communities.*, companies.name AS company_name, COUNT(CASE WHEN units.x_plot = 0 AND units.y_plot = 0 THEN 1 END) AS unplotted_units_count')
             .group('communities.id, companies.name')
             .having('COUNT(CASE WHEN units.x_plot = 0 AND units.y_plot = 0 THEN 1 END) > 0')
             .order('companies.name ASC, communities.name ASC')
  end
end
