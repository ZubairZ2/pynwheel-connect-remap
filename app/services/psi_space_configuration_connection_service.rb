# Backs the "Test Space Configuration" button. Same Entrata call as
# PsiPricingConnectionService, but the XML carries the extra space-configuration
# and lease-window fields.
class PsiSpaceConfigurationConnectionService < BaseService
  def perform
    hash = Entrata::PricingFetcher.new(credentials).fetch

    Entrata::PricingXmlBuilder.new(
      hash,
      show_unit_spaces: credentials&.entrata_show_unit_spaces,
      space_configuration: true
    ).build
  rescue StandardError => e
    Rails.logger.error("[PsiSpaceConfigurationConnectionService] community=#{credentials&.community_id} #{e.class}: #{e.message}")
    false
  end
end
