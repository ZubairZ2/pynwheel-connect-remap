require 'test_helper'

class PartnerTest < ActiveSupport::TestCase
  def setup
    @partner = Partner.create!(key: "acme_listings", label: "Acme Listings")
  end

  def teardown
    PartnerEvent.where(partner_id: @partner.id).delete_all
    @partner.destroy
  end

  # --- registry ------------------------------------------------------------

  test "registry returns active partners in position order" do
    keys = Partner.registry.map(&:key)
    assert_includes keys, "acme_listings"
    positions = Partner.registry.map(&:position)
    assert_equal positions.sort, positions, "registry must be ordered by position"
  end

  test "inactive partners are excluded from the registry" do
    @partner.update!(active: false)
    assert_not_includes Partner.registry_keys, "acme_listings"
  end

  test "key is normalized to a slug" do
    p = Partner.new(label: "Jonah Digital", key: "  Jonah Digital! ")
    p.valid?
    assert_equal "jonah_digital", p.key
  end

  test "key must be unique" do
    dup = Partner.new(key: "acme_listings", label: "Another")
    assert_not dup.valid?
    assert_includes dup.errors[:key].join, "taken"
  end

  test "label is required" do
    assert_not Partner.new(key: "x").valid?
  end

  # --- api key lifecycle ---------------------------------------------------

  test "a new partner has no api key" do
    assert_not @partner.api_key?
    assert_nil @partner.masked_api_key
  end

  test "issuing a key stores only a digest and returns a one-time token" do
    token = @partner.issue_api_key!
    @partner.reload

    assert @partner.api_key?
    assert @partner.api_key_digest.present?
    assert @partner.key_issued_at.present?
    assert_nil @partner.key_rotated_at, "first issue is not a rotation"

    raw = PartnerApiKey.consume_reveal(token)
    assert raw.start_with?("pk_acme_listings_"), "key should be self-identifying, got #{raw}"

    # The plaintext must not be recoverable from the record.
    assert_not_equal raw, @partner.api_key_digest
    assert_not @partner.attributes.values.map(&:to_s).include?(raw)
  end

  test "the masked key reveals only the prefix and last four characters" do
    token = @partner.issue_api_key!
    raw   = PartnerApiKey.consume_reveal(token)
    @partner.reload

    masked = @partner.masked_api_key
    assert masked.end_with?(raw[-4, 4])
    assert_not masked.include?(raw[8..-5].to_s), "the middle of the key must stay hidden"
  end

  test "an issued key authenticates and a tampered one does not" do
    raw = PartnerApiKey.consume_reveal(@partner.issue_api_key!)

    assert_equal @partner.id, Partner.authenticate(raw)&.id
    assert_nil Partner.authenticate(raw + "x")
    assert_nil Partner.authenticate(raw.upcase)
    assert_nil Partner.authenticate(nil)
    assert_nil Partner.authenticate("")
  end

  test "rotating replaces the previous key" do
    old_raw = PartnerApiKey.consume_reveal(@partner.issue_api_key!)
    new_raw = PartnerApiKey.consume_reveal(@partner.issue_api_key!)
    @partner.reload

    assert_not_equal old_raw, new_raw
    assert_nil Partner.authenticate(old_raw), "the old key must stop working"
    assert_equal @partner.id, Partner.authenticate(new_raw)&.id
    assert @partner.key_rotated_at.present?
  end

  test "revoking removes the credential but keeps the partner" do
    raw = PartnerApiKey.consume_reveal(@partner.issue_api_key!)
    @partner.revoke_api_key!
    @partner.reload

    assert_nil Partner.authenticate(raw)
    assert_not @partner.api_key?
    assert @partner.revoked?
    assert @partner.key_revoked_at.present?
    assert_includes Partner.registry_keys, "acme_listings", "the partner itself stays listed"
  end

  test "a revoked partner cannot authenticate through the ENV fallback" do
    ENV["PARTNER_TEST_FALLBACK_KEY"] = "env-secret-value"
    @partner.update!(env_var: "PARTNER_TEST_FALLBACK_KEY")

    assert_equal @partner.id, Partner.authenticate("env-secret-value")&.id

    @partner.revoke_api_key!
    assert_nil Partner.authenticate("env-secret-value"),
               "revoke must sever the ENV path too, or a revoked partner stays live"
  ensure
    ENV.delete("PARTNER_TEST_FALLBACK_KEY")
  end

  # --- one-time delivery ---------------------------------------------------

  test "a reveal token can only be consumed once" do
    token = @partner.issue_api_key!

    assert PartnerApiKey.reveal_pending?(token)
    assert PartnerApiKey.consume_reveal(token).present?
    assert_nil PartnerApiKey.consume_reveal(token), "a second read must return nothing"
    assert_not PartnerApiKey.reveal_pending?(token)
  end

  test "an unknown reveal token returns nothing" do
    assert_nil PartnerApiKey.consume_reveal("not-a-real-token")
    assert_nil PartnerApiKey.consume_reveal(nil)
  end

  # --- audit ---------------------------------------------------------------

  test "key lifecycle actions are recorded in the audit trail" do
    @partner.issue_api_key!
    @partner.issue_api_key!
    @partner.revoke_api_key!

    # reorder, not order: the association defaults to created_at DESC, which an
    # appended order() would not override.
    events = @partner.partner_events.reorder(:created_at, :id).pluck(:event)
    assert_equal %w[key_issued key_rotated key_revoked], events
  end

  # --- per-partner behaviour -----------------------------------------------

  test "svg_only is data, not a hardcoded partner key" do
    assert_not @partner.svg_only?
    @partner.update!(settings: { "svg_only" => true })
    assert @partner.svg_only?
  end
end
