class HallwaysController < ApplicationController
  def point_save
    if params[:floor_plate_id].present?
      @floor_plate = Floorplate.find(params[:floor_plate_id])
      @floor_plate.hallways.destroy_all
      points_data = JSON.parse(params[:hallway_points])
      points_data.each do |data|
        @floor_plate.hallways.create(x_plot: data['x_plot'], y_plot: data['y_plot'])
      end
      return @floor_plate.hallways.present? ? @floor_plate.hallways : []
    elsif params[:sitemap_id].present?
      @sitemap = Sitemap.find(params[:sitemap_id])
      @sitemap.hallways.destroy_all
      points_data = JSON.parse(params[:hallway_points])
      points_data.each do |data|
        @sitemap.hallways.create(x_plot: data['x_plot'], y_plot: data['y_plot'])
      end
      return @sitemap.hallways.present? ? @sitemap.hallways : []
    end
    head :ok
  end
end
