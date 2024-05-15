class HomeController < ApplicationController
  def index
    case
    when current_user.is_super_admin?
      @communities = alphabetical_sort(Community.select(:id, :name, :updated_at, :company_id, :data_provider, :time_zone, :move_to_production, :data_provider_updated_on).includes(:company))
    when current_user.is_dwelo_admin?
      assigned_communities_ids = current_user.communities.ids
      dwelo_communities_ids = Community.where(creator_id: User.where(role: "Dwelo admin").ids).pluck(:id)
      dwelo_companies_communities = Community.joins(:company).where(companies: {creator_id: User.where(role: "Dwelo admin").ids}).pluck(:id)
      ids = (assigned_communities_ids + dwelo_communities_ids + dwelo_companies_communities).uniq
      @communities = ids.present? ? Community.where(id: ids, locked: [false, nil]) : []
    when current_user.is_company_admin?
      @communities = current_user.company.communities.where(locked: [false, nil])
    when current_user.is_regional_admin?
      @communities = current_user.region.communities.where(locked: [false, nil])
    else
      @communities = current_user.communities.where(locked: [false, nil])
    end

    handle_code_grant_authorization(request&.headers['referer']) if params["code"].present?
  end

  private

    def handle_code_grant_authorization_for(brand)
      community_id = session[:community_id]
      return unless community_id.present?
      
      session[:authorization_code] = params['code']
      if brand === "edgestate"
        redirect_to "/communities/#{community_id}/edgestate_accounts/edgestate_code_grant_authorization"
      elsif brand === "igloohome"
        redirect_to "/communities/#{community_id}/igloohome_v2_accounts/igloohome_code_grant_authorization"
      end
    end
    
    def handle_code_grant_authorization(brand_url)
      case brand_url
      when ENV["REMOTELOCK_AUTH_BASE_URL"]
        handle_code_grant_authorization_for('edgestate')
      when ENV["IGLOOHOME_AUTH_BASE_URL"]
        handle_code_grant_authorization_for('igloohome')
      else
      end
    end
end