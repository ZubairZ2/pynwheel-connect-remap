module Connect
  # Row payload for the Pynwheel Connect "Companies" listing.
  #
  # Emits snake_case scalars only — labels, pill variants and initials that are
  # purely presentational are built by the frontend generator layer.
  class CompanySerializer
    def initialize(company, counts: {})
      @company = company
      @counts = counts
    end

    # Serializes a collection without N+1s: the four association counts are
    # resolved with one grouped query each.
    def self.collection(companies)
      companies = companies.to_a
      ids = companies.map(&:id)
      counts = {
        properties: Community.real_properties.where(company_id: ids).group(:company_id).count,
        users: User.where(company_id: ids).group(:company_id).count,
        regions: Region.where(company_id: ids).group(:company_id).count,
        portfolio_groups: CommunityGroup.where(company_id: ids).group(:company_id).count
      }

      companies.map { |company| new(company, counts: counts).as_json }
    end

    def as_json(*)
      {
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        city: company.city,
        state: company.state,
        locked: company.locked.present?,
        inactivate: company.inactivate.present?,
        pms_providers: providers,
        region_count: count_for(:regions),
        portfolio_group_count: count_for(:portfolio_groups),
        property_count: count_for(:properties),
        user_count: count_for(:users),
        updated_at: company.updated_at
      }
    end

    private

      attr_reader :company, :counts

      def providers
        Array(company.data_providers).compact_blank
      end

      def count_for(key)
        counts.dig(key, company.id).to_i
      end
  end
end
