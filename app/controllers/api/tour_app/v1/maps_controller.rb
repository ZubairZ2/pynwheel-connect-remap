# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # The property's map: levels and buildings, one level's nodes and
      # paths, and the level's floor SVG served through the API (the CMS
      # keeps floor SVGs on S3 without CORS headers).
      class MapsController < PropertyController
        def show
          render json: TourApi::Maps.map(@property, built, payload)
        end

        def level
          render json: TourApi::Maps.level(@property, built, payload, params[:level_id].to_s)
        end

        def svg
          asset = TourApi::Maps.svg(payload, params[:level_id].to_s, request.base_url)
          etag = %("#{asset.etag}")
          response.headers['ETag'] = etag
          response.headers['Cache-Control'] = 'private, max-age=86400'
          response.headers['X-Svg-ViewBox'] = asset.view_box ? asset.view_box.map { |v| format('%g', v) }.join(' ') : ''
          return head :not_modified if etag_matches?(etag)

          render body: asset.content, content_type: 'image/svg+xml'
        end
      end
    end
  end
end
