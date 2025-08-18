# Floors in separate columns
# This code generates a CSV report of floor map URLs for communities with floor level maps.
# Each community's floors are represented in separate columns, with the property name in the first column.
module Reports
  class FloorMapUrls
    def initialize()
    end

    def get_report
      communities = fetch_communities
      all_floors  = communities.flat_map { |c| c.property_floor_numbers() }.uniq.sort

      CSV.generate(headers: true) do |csv|
        csv << build_headers(all_floors)
        communities.each { |community| csv << build_row(community, all_floors) }
      end
    end

    private

    def fetch_communities
      Community.where(is_sitemap: false, is_floor_level_map: true).includes(:floorplates)
    end

    def build_headers(all_floors)
      ["Property Name"] + all_floors.map { |f| "Level #{f}" }
    end

    def build_row(community, all_floors)
      community_floors = floor_numbers(community)
      floor_urls = all_floors.map do |floor|
        community_floors.include?(floor) ? community.map_link(nil, floor) : nil
      end
      [community.name&.strip] + floor_urls
    end
  end
end


# Floors in separate rows
# This code generates a CSV report of floor map URLs for communities with floor level maps.
# Each community's floors are represented in separate rows, with the property name in the first column.


# module Reports
#   class FloorMapUrls
#     def initialize()
#     end

#     def get_report
#       CSV.generate(headers: true) do |csv|
#         csv << ["Property Name", "Floor", "URL"]

#         fetch_communities.each do |community|
#           floor_numbers(community).each do |floor|
#             csv << [
#               community.name&.strip,          # Property Name
#               "Level #{floor}",               # Floor number
#               community.map_link(nil, floor) # URL for that floor
#             ]
#           end
#         end
#       end
#     end

#     private

#     def fetch_communities
#       Community.where(is_sitemap: false, is_floor_level_map: true).includes(:floorplates)
#     end

#     def floor_numbers(community)
#       community.floorplates.flat_map(&:floors).map(&:to_i).sort
#     end
#   end
# end
