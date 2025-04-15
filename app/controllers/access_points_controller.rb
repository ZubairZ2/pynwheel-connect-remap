class AccessPointsController < ApplicationController
    include AssignLocksHelper
    add_breadcrumb "Home", :root_path
    before_action :authenticate_user!
    before_action :check_community
    before_action :set_property_type, :except => [:remaining_access_point_floors]

    def plot_access_point

        if params[:id].present? and params[:id].to_i != 0
          access_point = @property_type.access_points.find params[:id]
          status = "updated"
        else
          access_point = @property_type.access_points.build
          status = "created"
        end
    
        access_point.update(community_id: @community.id, floor: params[:floor], x_plot: params[:x_plot], y_plot: params[:y_plot])
        url = get_open_modal_path(access_point, params)

        render json: {property_type: @property_type, access_point: access_point.reload, url: url, status: status, success: true}
    rescue
        render json: {property_type: {}, access_point: {}, url: "", success: false}
    end

    def remove_access_point_plot
        @access_point = @property_type.access_points.find params[:id]
        @access_point.destroy
        # render json: {property_type: @property_type, access_point: @access_point, success: true}

        flash[:notice] = "Access Point has been deleted successfully."
        redirect_back_to_property_type
    end

    def load_access_point_lock
        @access_points = @property_type.access_points.where(id: params[:id]).includes(:edgestate_lock, :dwelo_lock, :latch_lock, :zerv_lock).first
    end

    def update_access_point_lock
        @access_point = @property_type.access_points.find params[:id]
        @access_point.update(lock_provider: params[:lock_provider], access_code: params[:access_code])
        assign_lock_to_door(@community, @access_point, params[:lock_id]) if params[:lock_id].present?
    end

    def open_access_point_modal
        @active_access_point       = @property_type.access_points.find params[:id]
        @same_access_points        = @property_type.access_points.where(x_plot: @active_access_point.x_plot, y_plot: @active_access_point.y_plot).order(:id)
        session[:active_id]        = @active_access_point.id
        session[:remaining_floors] = @community.is_sitemap ? [] : (@property_type.floors - @same_access_points.map(&:floor)).map{|f| [f, f.ordinalize + " floor"]}
    end

    def remaining_access_point_floors; end


    def add_new_access_points
        access_point = @property_type.access_points.find params[:id]
        
        params[:floors].each do |floor|
            new_point = @property_type.access_points.build
            new_point.update(community_id: @community.id, floor: floor.to_i, x_plot: access_point.x_plot, y_plot: access_point.y_plot)
        end
    
        flash[:notice] = "Access Point added successfully."
        redirect_back_to_property_type
    end

    def get_open_modal_path(access_point, params)
        if @community.is_sitemap
            open_access_point_modal_community_sitemap_access_point_path(@community, @property_type, access_point, x_plot: access_point.x_plot, y_plot: access_point.y_plot, plotted_id: access_point.id, locks_present_hash: params[:locks_present_hash].to_json)
        else
            open_access_point_modal_community_floorplate_access_point_path(@community, @property_type, access_point, x_plot: access_point.x_plot, y_plot: access_point.y_plot, plotted_id: access_point.id, locks_present_hash: params[:locks_present_hash].to_json)
        end
    end

    def redirect_back_to_property_type
        if @community.is_sitemap
            render js: "window.location = '#{plotexp_community_sitemaps_path(@community)}'"
        else
            render js: "window.location = '#{community_floorplate_plotexp_path(@community, @property_type)}'"
        end
    end

    private

    def set_property_type
        if @community.is_sitemap
            @property_type = @community.sitemap
        else
            @property_type = @community.floorplates.find params[:floorplate_id]
        end
    end
end