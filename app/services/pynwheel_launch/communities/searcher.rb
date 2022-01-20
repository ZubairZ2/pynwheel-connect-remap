class PynwheelLaunch::Communities::Searcher
  attr_reader :user , :params
  def initialize(user , params)
    @user = user
    @params = params
  end

  def get_user_communities
    communities = communities_by_role
  end

  private

  def communities_by_role
    if user.is_new_client?
      communities = user.community_users
    else
      communities = CommunityUser.all
    end
    communities = communities_by_name(communities) if params[:keyword].present?
    communities.order(created_at: :desc)
  end

  def communities_by_name(collection)
    query_string = "%#{params[:keyword].strip.downcase}%"
    company_ids = Company.where('lower(name) like ?' , query_string).pluck(:id)
    communities = collection.joins(:community).where('lower(communities.name) like ? OR communities.company_id in (?)' , query_string , company_ids)
  end

end
