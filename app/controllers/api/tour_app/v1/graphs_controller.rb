# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # The routable graph (`Wayfinding::GraphSerializer`'s payload, every
      # field present). The ETag is the graph version: the app sends it back
      # as `If-None-Match` and gets a 304 while nothing changed.
      class GraphsController < PropertyController
        def show
          etag = %("#{built.version}")
          response.headers['ETag'] = etag
          response.headers['Cache-Control'] = 'private, max-age=0, must-revalidate'
          return head :not_modified if etag_matches?(etag)

          json = built.graph_json[request.base_url] ||= TourApi::Maps.graph(payload).to_json
          render json: json
        end
      end
    end
  end
end
