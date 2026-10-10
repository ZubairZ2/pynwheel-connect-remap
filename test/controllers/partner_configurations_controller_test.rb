require 'test_helper'

# Partner Configuration exposes every client's property list and the partner API
# keys, so the whole controller is Pynwheel-admin only. These tests pin that
# down for every routed action, every non-admin role and every request format —
# a guard that only holds for HTML is not a guard.
class PartnerConfigurationsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  NON_ADMIN_ROLES = [
    "Community admin", "Company admin", "Regional admin",
    "Community manager", "Dwelo admin"
  ].freeze

  # Anything that must never appear in a denied response.
  SECRETS = ["pk_", "pc-key-panel", "Property Name"].freeze

  def setup
    # Rails host authorization rejects the integration default (www.example.com)
    # with a 403, which would look exactly like an authorization failure and
    # make every assertion here pass for the wrong reason.
    host! "localhost"

    @community = Community.active_client_properties.first
    @base      = "/communities/#{@community.id}/partner_configurations"
    @partner   = Partner.registry.first
  end

  def routed_actions
    [
      [:get,    @base],
      [:patch,  "#{@base}/update_property"],
      [:post,   "#{@base}/bulk"],
      [:get,    "#{@base}/bulk_upload_template"],
      [:post,   "#{@base}/bulk_upload_match"],
      [:post,   "#{@base}/bulk_upload_apply"],
      [:get,    "#{@base}/bulk_export"],
      [:post,   "#{@base}/create_partner"],
      [:post,   "#{@base}/rotate_key"],
      [:delete, "#{@base}/revoke_key"]
    ]
  end

  def build_user(role)
    user = User.new(email: "role-probe-#{SecureRandom.hex(4)}@example.com",
                    password: SecureRandom.hex(12), role: role)
    user.save!(validate: false)
    user
  end

  def denied?(status)
    [302, 401, 403].include?(status)
  end

  test "every routed action is denied to every non-admin role" do
    NON_ADMIN_ROLES.each do |role|
      user = build_user(role)
      sign_in user

      routed_actions.each do |verb, path|
        public_send(verb, path, params: { partner_key: @partner.key, id: @community.id, label: "NeverCreated" })
        assert denied?(response.status),
               "#{role} reached #{verb.to_s.upcase} #{path} (HTTP #{response.status})"
      end

      sign_out user
      user.destroy
    end
  end

  test "denial does not depend on the request format" do
    user = build_user("Community admin")
    sign_in user

    # A respond_to without a catch-all would raise UnknownFormat here instead of
    # denying, turning an authorization failure into a 406.
    ["", ".json", ".csv"].each do |ext|
      get "#{@base}/bulk_export#{ext}"
      assert denied?(response.status),
             "bulk_export#{ext} returned HTTP #{response.status} rather than a denial"
    end

    sign_out user
    user.destroy
  end

  test "a denied response leaks no partner or property data" do
    user = build_user("Company admin")
    sign_in user

    get @base
    get "#{@base}/bulk_export.csv"
    body = response.body.to_s
    SECRETS.each do |needle|
      assert_not body.include?(needle), "denied response contained #{needle.inspect}"
    end

    sign_out user
    user.destroy
  end

  test "denied requests have no side effects" do
    jonah_before = @partner.reload.attributes.slice("api_key_digest", "key_revoked_at")

    user = build_user("Regional admin")
    sign_in user

    post "#{@base}/create_partner", params: { label: "NeverCreated" }
    post "#{@base}/rotate_key",     params: { partner_key: @partner.key }
    delete "#{@base}/revoke_key",   params: { partner_key: @partner.key }

    assert_nil Partner.find_by(label: "NeverCreated")
    assert_equal jonah_before, @partner.reload.attributes.slice("api_key_digest", "key_revoked_at")

    sign_out user
    user.destroy
  end

  test "anonymous visitors are turned away" do
    routed_actions.each do |verb, path|
      public_send(verb, path, params: { partner_key: @partner.key })
      assert denied?(response.status),
             "anonymous reached #{verb.to_s.upcase} #{path} (HTTP #{response.status})"
    end
  end

  # The positive case uses a real, persisted admin rather than a fabricated one:
  # a hand-built user is not "active for authentication" in Devise, so signing
  # it in silently yields no current_user and the assertion would pass for the
  # wrong reason.
  test "a super admin can reach the screen" do
    admin = User.find_by(role: "Super admin")
    skip "no Super admin user in this database" if admin.nil?

    sign_in admin
    get @base, headers: { "Accept" => "text/html" }

    assert_response :success
    assert response.body.include?("Partner Configuration")
    sign_out admin
  end
end
