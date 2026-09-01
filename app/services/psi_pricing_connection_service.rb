# Backs the "Test Pricing" button. Fetches one property's availability and
# pricing from Entrata and renders it as XML; the XML itself is built by
# Entrata::PricingXmlBuilder, shared with PsiSpaceConfigurationConnectionService.
class PsiPricingConnectionService < BaseService
  def perform
    hash = Entrata::PricingFetcher.new(credentials).fetch

    Entrata::PricingXmlBuilder.new(
      hash,
      show_unit_spaces: credentials&.entrata_show_unit_spaces
    ).build
  rescue StandardError => e
    Rails.logger.error("[PsiPricingConnectionService] community=#{credentials&.community_id} #{e.class}: #{e.message}")
    false
  end
end
