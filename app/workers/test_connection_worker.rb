# Runs one provider "Test ..." fetch off the web dyno and parks the result in
# DataProviders::TestConnectionCache for the settings page to pick up.
#
#   TestConnectionWorker.perform_async(community_id, "pricing")
#
# It runs on its own "provider_test" queue, first in the strict priority list in
# config/sidekiq.yml. It used to share "entrata" with EntrataDataUpdateWorker: the
# scheduled import sweep drops ~60 full property imports on that queue at once, and
# FIFO put an admin waiting at a spinner behind every one of them on a 3 thread
# pool. An interactive click must never queue behind batch work.
#
# retry: false on purpose — a stale retry would hand an admin data from minutes
# ago while they are actively changing credentials, and clicking the button
# again is both cheaper and clearer.
class TestConnectionWorker
  include Sidekiq::Worker
  sidekiq_options queue: "provider_test", retry: false

  def perform(community_id, kind)
    kind = kind.to_s
    return unless DataProviders::TestConnectionCache::KINDS.include?(kind)

    community = Community.find_by(id: community_id)
    return DataProviders::TestConnectionCache.release(community_id, kind) if community.nil?

    result = fetch(community, kind)

    # The old inline actions branched on `if xml = connect_to_...`, so only nil
    # and false meant failure — an empty array from a provider with nothing to
    # report still rendered. Keep that distinction.
    if result.nil? || result == false
      DataProviders::TestConnectionCache.write(
        community_id, kind,
        error: "The provider did not return any data. That is usually wrong credentials or a " \
               "request that timed out on the provider's side. Check the settings and try again."
      )
    else
      DataProviders::TestConnectionCache.write(community_id, kind, xml: serialize(result))
    end
  rescue StandardError => e
    Rails.logger.error("[TestConnectionWorker] community=#{community_id} kind=#{kind} #{e.class}: #{e.message}")
    DataProviders::TestConnectionCache.write(community_id, kind, error: "#{e.class}: #{e.message}")
  end

  private

  def fetch(community, kind)
    case kind
    when "connection"          then community.connect_to_provider
    when "pricing"             then realpage?(community) ? realpage_pricing(community) : community.connect_to_pricing(community)
    when "space_configuration" then community.connect_to_pricing_with_space_configuration(community)
    end
  end

  # `render xml:` used to do this conversion for us, and the providers are not
  # consistent: PSI, Yardi and RealPage hand back XML strings, while RentCafe,
  # AppFolio, RentManager, Beans and the XML feed hand back Hashes and Arrays
  # that Rails was quietly running through to_xml. Serialising here keeps every
  # provider rendering exactly what it did before.
  def serialize(result)
    result.is_a?(String) ? result : result.to_xml
  end

  def realpage?(community)
    community.data_provider == "realpagesvc"
  end

  # RealPage answers out of band: connect_to_pricing kicks the fetch off and the
  # payload lands on the community record, so the XML to show is whatever is on
  # the column once that call returns — and an empty column means the fetch is
  # still in flight rather than that anything went wrong.
  def realpage_pricing(community)
    return nil unless community.connect_to_pricing(community)

    community.reload.realpage_pricing_data.presence || "Wait until data loads"
  end
end
