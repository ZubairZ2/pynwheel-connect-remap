class HallwaysController < ApplicationController
  def point_save
    if params[:floor_plate_id].present?
      @floor_plate = Floorplate.find(params[:floor_plate_id])
      new_point = JSON.parse(params[:new_point])
      @new_point = @floor_plate.hallways.create(x_plot: new_point['x_plot'], y_plot: new_point['y_plot'], selected: new_point['selected'], next_points: new_point['next_points'])
      if params[:previous_point].present?
        previous_point = JSON.parse(params[:previous_point])
        @previous_point = Hallway.find(previous_point['id'])
        @previous_point.next_points << @new_point.id
        @previous_point.selected = false
        @previous_point.save!
      end
      render json: @floor_plate.hallways, message: "New Point is Added", status: 200
    elsif params[:sitemap_id].present?
      @sitemap = Sitemap.find(params[:sitemap_id])
      @sitemap.hallways.destroy_all
      points_data = JSON.parse(params[:hallway_points])
      points_data.each do |data|
        @sitemap.hallways.create(x_plot: data['x_plot'], y_plot: data['y_plot'])
      end
      return @sitemap.hallways.present? ? @sitemap.hallways : []
    end

  end
end
