class WebpagesReportService < BaseService
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
    %w{Property\ Id Property\ Name Property\ Email Property\ Phone Property\ Manager\ Name Property\ Manager\ Email Property\ Manager\ Phone Property\ URL Property\ Webpages\ URL Property(\ Active?\ ) }
  end

  def get_communities
    Community.all
  end

  def formate_csv community
    [
      community.id, 
      community.name&.strip, 
      community.email&.strip, 
      community.phone&.strip,
      community.property_manager_name&.strip, 
      community.property_manager_email&.strip, 
      community.property_manager_phone&.strip, 
      community.website&.strip,
      community.map_link(),
      !community.locked
    ]
  end
end