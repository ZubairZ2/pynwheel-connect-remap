class ImagesController < ActionController::Base
  include ApplicationHelper

  def fetch_svg_image
    svg_url = params[:svg_url]
  
    if !(svg_data = fetch_svg_by_url(svg_url))
      render plain: "Failed to fetch SVG: Invalid URL", status: :bad_request
      return
    end
  
    send_data svg_data, type: 'image/svg+xml', disposition: 'inline'
  rescue => e
    render plain: "Failed to fetch SVG: #{e.message}", status: :bad_request
  end
end
