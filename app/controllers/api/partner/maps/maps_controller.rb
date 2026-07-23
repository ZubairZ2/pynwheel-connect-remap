
module Api
  module Partner
    module Maps
      class MapsController < BaseController
        before_action :load_registered_data

        def all_maps
          render json: {
            companies: formatted_response,
            message: "Registered companies & communities maps data",
            status: 'success',
            code: 200
          }
        end

        private

        def load_registered_data
          @communities = Community.for_partner(@partner)
          @companies   = Company.where(id: @communities.pluck(:company_id).compact.uniq)
        end

        def formatted_response
          @companies.map do |company|
            {
              id: company.id,
              name: company.name,
              communities: @communities
                  .select { |c| c.company_id == company.id }
                  .map { |c| community_block(c) }
            }
          end
        end

        def community_block(community)
          {
            id: community.id,
            name: community.name,
            zip: community.zip,
            city: community.city,
            state: community.state,
            address: community.address,
            full_address: community.make_address,
            partner: @partner,
            map_embed_code: community.map_embed_code(@partner),
            map_link: community.map_link(@partner)
          }
        end
        
      end
    end
  end
end