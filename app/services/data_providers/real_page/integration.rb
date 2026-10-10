module DataProviders
  module RealPage
    # Which of the two RealPage partner gateways a property's data actually sits
    # behind.
    #
    # RealPage exposes us through two separate partner integrations, and they are
    # not interchangeable: each has its own URL, its own license key, and its own
    # SOAP operation names (getfloorplanlist/getunitsbyproperty on Tour versus
    # getfloorplans/unitlist on Touch), which in turn produce differently shaped
    # responses. Picking one means committing to its operations and its parsing.
    #
    # We used to pick by product flag -- self_tour/touchscreen_app on the
    # community -- on the assumption that a property sold Touch is provisioned on
    # the Touch gateway. RealPage does not guarantee that. Cypress Terra (pmc
    # 1048354 / site 5580371) is sold as Touch but provisioned only on Tour, so
    # every call went to the Touch gateway and came back
    #
    #   There are no active integrations for client id: X and property id: Y
    #
    # as a SOAP Fault with an HTTP 200. Nothing parsed, nothing imported, and no
    # error surfaced anywhere the admin could see it.
    #
    # So the flag is now only a starting guess. We probe it, and if the property
    # is not provisioned there we use the other gateway. The answer is cached,
    # because it changes about as often as RealPage re-provisions a property.
    module Integration
      TOUR  = :tour
      TOUCH = :touch

      # Long enough that a nightly import and the admin's retries all reuse one
      # probe, short enough that a property RealPage re-provisions corrects
      # itself within a day without anyone clearing a key by hand.
      TTL = 12.hours

      # A property that is provisioned on neither gateway (bad pmc/site id, or an
      # integration RealPage has not switched on yet) would otherwise re-probe
      # both gateways on every single call.
      UNRESOLVED_TTL = 5.minutes

      # The fault RealPage returns for "this property is not on this gateway", as
      # opposed to a bad license key or a malformed request. Only this one means
      # "try the other gateway".
      NO_INTEGRATION_FAULT = /no active integrations/i.freeze

      module_function

      # The gateway to use for this community. Falls back to the flag-derived
      # guess if RealPage is unreachable, so a network blip degrades to today's
      # behaviour rather than to no import at all.
      def for(community)
        return preferred(community) if community.blank?

        cached = read_cache(community.id)
        return cached if cached

        resolved = probe(community)
        write_cache(community.id, resolved) if resolved
        resolved || preferred(community)
      end

      def tour?(community)
        self.for(community) == TOUR
      end

      # The gateway the community's product flags imply. This is the order we
      # probe in, so a correctly provisioned property is confirmed on its first
      # call and never touches the second gateway.
      def preferred(community)
        if community&.all_apps_enabled? || community&.pynwheel_tour_enabled?
          TOUR
        else
          TOUCH
        end
      end

      def url(integration)
        integration == TOUR ? RP_TOUR_API_URL : RP_TOUCH_API_URL
      end

      def license_key(integration)
        integration == TOUR ? ENV["RP_TOUR_API_KEY"] : ENV["RP_TOUCH_API_KEY"]
      end

      # True when the body is RealPage saying the property is not on this
      # gateway. Callers use it to tell "wrong gateway" apart from "no data".
      def no_integration_fault?(body)
        body.to_s.include?("s:Fault") && body.to_s.match?(NO_INTEGRATION_FAULT)
      end

      def fault?(body)
        body.to_s.include?("s:Fault")
      end

      # HTTParty options every RealPage call should carry.
      #
      # The gateway sits behind Akamai, which answers anything outside the
      # allowed regions with a 403 "Access Denied" page before the request ever
      # reaches RealPage -- including an unauthenticated GET of the WSDL. Heroku
      # is inside, a developer laptop generally is not, which is why this only
      # ever failed locally while production looked fine. Routing through the
      # same QuotaGuard static IP the Yardi services already use puts local
      # requests back inside.
      #
      # Off in production, where the dynos are already inside and the proxy would
      # just burn quota. REALPAGE_VIA_PROXY overrides in either direction.
      def http_options
        return {} unless via_proxy?

        proxy = URI(ENV["QUOTAGUARDSTATIC_URL"])
        {
          http_proxyaddr: proxy.host,
          http_proxyport: proxy.port,
          http_proxyuser: proxy.user,
          http_proxypass: proxy.password
        }
      rescue StandardError => e
        Rails.logger.error("[RealPage::Integration] unusable QUOTAGUARDSTATIC_URL: #{e.class}: #{e.message}")
        {}
      end

      def via_proxy?
        return false if ENV["QUOTAGUARDSTATIC_URL"].blank?

        default = Rails.env.production? ? "false" : "true"
        ENV.fetch("REALPAGE_VIA_PROXY", default) == "true"
      end

      # Asks each gateway, cheapest operation first, whether it knows this
      # property. Returns nil rather than a guess when neither answers, so a
      # transport failure does not get cached as a routing decision.
      def probe(community)
        credential = community.credential
        site_id    = credential&.site_id.to_s.split(",").first&.strip
        return nil if site_id.blank? || credential&.pmc_id.blank?

        order = preferred(community) == TOUR ? [TOUR, TOUCH] : [TOUCH, TOUR]
        reachable = false

        order.each do |integration|
          body = probe_request(credential.pmc_id, site_id, integration)
          next if body.nil?

          reachable = true
          return integration unless no_integration_fault?(body)
        end

        # Reachable but on neither gateway: remember briefly so we stop probing
        # both every call, and let the preferred one produce the real error.
        write_cache(community.id, preferred(community), ttl: UNRESOLVED_TTL) if reachable
        nil
      end

      def probe_request(pmc_id, site_id, integration)
        operation = integration == TOUR ? "getfloorplanlist" : "getfloorplans"

        response = HTTParty.post(
          url(integration),
          {
            headers: {
              "Content-Type" => "text/xml",
              "SOAPAction"   => "#{SOAP_ACTION_BASE_URL}#{operation}"
            },
            body: probe_body(pmc_id, site_id, operation, license_key(integration)),
            timeout: 30
          }.merge(http_options)
        )

        # A 403 here is Akamai, not RealPage, and says nothing about provisioning.
        return nil unless response.code.to_i == 200

        response.body
      rescue StandardError => e
        Rails.logger.warn("[RealPage::Integration] probe of #{integration} failed: #{e.class}: #{e.message}")
        nil
      end

      def probe_body(pmc_id, site_id, operation, key)
        <<~XML
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
            <soapenv:Header/>
            <soapenv:Body>
              <tem:#{operation}>
                <tem:auth>
                  <tem:pmcid>#{pmc_id}</tem:pmcid>
                  <tem:siteid>#{site_id}</tem:siteid>
                  <tem:licensekey>#{key}</tem:licensekey>
                </tem:auth>
              </tem:#{operation}>
            </soapenv:Body>
          </soapenv:Envelope>
        XML
      end

      # Sidekiq's Redis rather than Rails.cache, for the same reason
      # TestConnectionCache uses it: in development Rails.cache is a per-process
      # :memory_store, so a probe made in the worker would be invisible to the
      # web process and vice versa.
      def cache_key(community_id)
        "realpage_integration:#{community_id}"
      end

      def read_cache(community_id)
        raw = Sidekiq.redis { |conn| conn.get(cache_key(community_id)) }
        return nil if raw.blank?

        value = raw.to_sym
        [TOUR, TOUCH].include?(value) ? value : nil
      rescue StandardError => e
        Rails.logger.warn("[RealPage::Integration] cache read failed: #{e.class}: #{e.message}")
        nil
      end

      def write_cache(community_id, integration, ttl: TTL)
        Sidekiq.redis { |conn| conn.set(cache_key(community_id), integration.to_s, ex: ttl.to_i) }
      rescue StandardError => e
        Rails.logger.warn("[RealPage::Integration] cache write failed: #{e.class}: #{e.message}")
        nil
      end

      # For the admin "re-test connection" path and for console use after
      # RealPage changes a property's provisioning.
      def clear(community_id)
        Sidekiq.redis { |conn| conn.del(cache_key(community_id)) }
      rescue StandardError
        nil
      end
    end
  end
end
