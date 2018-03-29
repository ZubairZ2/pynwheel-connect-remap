class UiPresenter < JsonPresenters
  def self.minimal_hash(community)
    {theme: community.theme_name,logo: community.logo.present? ? (Rails.env.development? ? local_assets_base_url+community.logo.url : community.logo.url) : ActionController::Base.helpers.asset_path("logo-small.png")}
  end
end