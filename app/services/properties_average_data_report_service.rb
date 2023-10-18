class PropertiesAverageDataReportService < BaseService
  HEADERS = %w{Company\ Name Property\ Name Property\ Type Number\ of\ Units Number\ of\ Floorplates Number\ of\ Floors}.freeze

  def initialize
  end
  
  def get_report
    CSV.generate(headers: true) do |csv|
      csv << HEADERS
      communities = get_communities
      communities.each do |community|
        csv << format_csv(community)
      end
    end
  end

  private

  def get_communities
    Community
      .active_client_properties
      .order(is_sitemap: :asc, company_id: :asc)
      .includes(:company, :units, :floorplates)
  end

  def format_csv(community)
    [
      community.company&.name,
      community.name,
      community_type(community),
      community.units.size, # Use pluck or size to minimize queries
      community.floorplates.size, # Use pluck or size to minimize queries
      floors_count(community)
    ]
  end

  def floors_count(community)
    community.floorplates.sum { |floorplate| floorplate.floors.size } # Use pluck or size to minimize queries
  end

  def community_type(community)
    community.is_sitemap ? 'Property Map' : 'Floorplate'
  end
end
