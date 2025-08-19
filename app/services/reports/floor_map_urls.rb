
module Reports
  class FloorMapUrls
    def initialize()
    end

    def get_report
      CSV.generate(headers: true) do |csv|
        csv << ["Property Name", "Floor", "Map URL", "Embed Code"]

        fetch_communities.each do |community|
          floor_numbers(community).each do |floor|
            csv << [
              community.name&.strip,
              "Level #{floor}",
              community.map_link(nil, floor),
              community.map_embed_code(nil, floor)
            ]
          end
        end
      end
    end

    private

    def fetch_communities
      Community.where(is_sitemap: false, is_floor_level_map: true).includes(:floorplates)
    end

    def floor_numbers(community)
      community.floorplates.flat_map(&:floors).map(&:to_i).sort
    end
  end
end
