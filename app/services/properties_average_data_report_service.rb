class PropertiesAverageDataReportService < BaseService
  def initialize
  end

  def get_report
    csv_file = CSV.generate(headers: true) do |csv|
      csv << headers
      communities = get_communities()

      communities.each do |community|
        csv << formate_csv(community)
      end

    end

    csv_file
  end

  private

  def headers
    %w{Company\ Name Property\ Name Property\ Type Number\ of\ Units Number\ of\ Floorplates Number\ of\ Floors}
  end

  def get_communities
    Community.active_client_properties.order(is_sitemap: :asc, company_id: :asc)
  end

  def formate_csv community
    [
      community&.company&.name,
      community.name,
      community_type(community),
      community.units.count,
      community.floorplates.count,
      floors_count(community)
    ]
  end

  def floors_count community
    sum = 0
    
    community.floorplates.each do |floorplate|
      sum += floorplate.floors.count
    end

    sum
  end

  def community_type community
    if community.is_sitemap
      "Property Map"
    else
      "Floorplate"
    end
  end

end