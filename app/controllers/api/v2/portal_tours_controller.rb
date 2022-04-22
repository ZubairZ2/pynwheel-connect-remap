class Api::V2::PortalToursController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, :only => [:add_tour_step_details, :get_tour_step_details]

  def get_tour_step_details
      @tour = @community.portal_tour
      if @tour.present?
        render json: {success: true, data: @tour.as_json}
      else
        render json: {success: false, message: "No Tour Found"}
      end
  end

  def add_tour_step_details
    begin
      if @community.present?
        tour = params['tour']
        @portal_tour = @community.portal_tour
        if @portal_tour.present?
          @portal_tour.update_attributes(start_tour: tour["start_tour"], max_tour: tour["max_tours"])
          @tour = @portal_tour
        else
          @tour = @community.create_portal_tour(start_tour: tour["start_tour"], max_tour: tour["max_tours"])
        end
        tour_stop = params["tour_stop"]
        if tour_stop.present?
          tour_stop.values.each do |stop|
            add_tour_stop(stop)
          end
        end
      end
      render json: {success: true, data: @tour.as_json}
    rescue => exception
      render json: {success: false, message: exception}
    end
  end

  def delete_tour_stop_gallery
    if params["gallery_id"].present?
      tour_gallery = PortalTourStopGallery.find params["gallery_id"]
      if tour_gallery.present?
        if tour_gallery.destroy!
          render json: {success: true, data: "Gallery deleted successfully"}
        else
          render json: {success: false, message: tour_gallery.errors.full_messages}
        end
      end
    end
  end

  def delete_tour_stop
    if params["tour_stop_id"].present?
      tour_stop = PortalTourStop.find params["tour_stop_id"]
      if tour_stop.present?
        if tour_stop.destroy!
          render json: {success: true, message: "Tour stop deleted successfully"}
        else
          render json: {success: false, message: tour_stop.errors.full_messages}
        end
      end
    end
  end

  private

  def add_tour_stop(tour)
    if tour["id"].present?
      tour_stop = PortalTourStop.find tour["id"]
      if tour_stop.present?
        tour_stop.update_attributes(stop_type: tour["type"], starting_point: tour["starting_point"], name: tour["name"], description: tour["description"], direction: tour["direction"], video_link: tour["video_link"])
        @tour_stop = tour_stop
      end
    else
      @tour_stop = @tour.portal_tour_stops.create(stop_type: tour["type"], starting_point: tour["starting_point"], name: tour["name"], description: tour["description"], direction: tour["direction"], video_link: tour["video_link"])
    end
    galleries = tour["image"]
    if galleries.present?
      galleries.values.each do |gallery|
        add_tour_stop_gallery(gallery)
      end
    end
  end

  def add_tour_stop_gallery(gallery)
    if gallery["id"].present?
      tour_gallery = PortalTourStopGallery.find gallery["id"]
      if tour_gallery.present?
        tour_gallery.update_attributes(image: gallery["image"], description: gallery["image_description"])
      end
    else
      @tour_stop.portal_tour_stop_galleries.create(image: gallery["image"], description: gallery["image_description"])
    end
  end

  def load_community
		@community = Community.find params[:community_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
	end

end
