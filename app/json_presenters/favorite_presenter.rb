class FavoritePresenter < JsonPresenters
  def self.minimal_hash(community)
    local_assets_base_url = "http://192.168.101.77:3000"
    hash = {}
    if community.favorite_setting.present?
      hash[:email_from] = community.favorite_setting.email_from
      hash[:email_bcc] = community.favorite_setting.email_bcc
      hash
    end
  end
end