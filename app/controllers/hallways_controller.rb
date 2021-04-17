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
      return render json: @floor_plate.hallways.order("id ASC"), message: "New Point is Added", status: 200
    elsif params[:sitemap_id].present?
      @sitemap = Sitemap.find(params[:sitemap_id])
      new_point = JSON.parse(params[:new_point])
      @new_point = @sitemap.hallways.create(x_plot: new_point['x_plot'], y_plot: new_point['y_plot'], selected: new_point['selected'], next_points: new_point['next_points'])
      if params[:previous_point].present?
        previous_point = JSON.parse(params[:previous_point])
        @previous_point = Hallway.find(previous_point['id'])
        @previous_point.next_points << @new_point.id
        @previous_point.selected = false
        @previous_point.save
      end
      return render json: @sitemap.hallways.order("id ASC"), message: "New Point is Added", status: 200
    end
  end

  def update_point
    if params[:floor_plate_id].present?
      @floor_plate = Floorplate.find(params[:floor_plate_id])
      Hallway.find(params[:current_id]).update(x_plot: params[:x_plot], y_plot: params[:y_plot])
      return render json: @floor_plate.hallways.order("id ASC"), message: "New Point is Added", status: 200
    elsif params[:sitemap_id].present?
      @sitemap = Sitemap.find(params[:sitemap_id])
      Hallway.find(params[:current_id]).update(x_plot: params[:x_plot], y_plot: params[:y_plot])
      return render json: @sitemap.hallways.order("id ASC"), message: "New Point is Added", status: 200
    end
  end

  def remove_point
    if params[:floor_plate_id].present?
      @floor_plate = Floorplate.find(params[:floor_plate_id])
      Hallway.find(params[:current_id]).destroy
      if params[:previous_id].present?
        @previous_point = Hallway.find(params[:previous_id])
        @previous_point.next_points.delete(params[:current_id].to_i)
        @previous_point.save
      end
      return render json: @floor_plate.hallways.order("id ASC"), message: "New Point is Added", status: 200
    elsif params[:sitemap_id].present?
      @sitemap = Sitemap.find(params[:sitemap_id])
      Hallway.find(params[:current_id]).destroy
      if params[:previous_id].present?
        @previous_point = Hallway.find(params[:previous_id])
        @previous_point.next_points.delete(params[:current_id].to_i)
        @previous_point.save
      end
      return render json: @sitemap.hallways.order("id ASC"), message: "New Point is Added", status: 200
    end
  end
end
