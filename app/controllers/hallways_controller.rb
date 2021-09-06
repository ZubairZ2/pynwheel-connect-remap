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
      Hallway.find(params[:current_id]).update(x_plot: params[:x_plot], y_plot: params[:y_plot], selected: true)
      return render json: @floor_plate.hallways.order("id ASC"), message: "New Point is Added", status: 200
    elsif params[:sitemap_id].present?
      @sitemap = Sitemap.find(params[:sitemap_id])
      Hallway.find(params[:current_id]).update(x_plot: params[:x_plot], y_plot: params[:y_plot], selected: true)
      return render json: @sitemap.hallways.order("id ASC"), message: "New Point is Added", status: 200
    end
  end

  def remove_point
    if params[:floor_plate_id].present?
      @floor_plate = Floorplate.find(params[:floor_plate_id])
      Hallway.find(params[:current_id]).delete_hallway_point(@floor_plate.hallways)
      return render json: @floor_plate.hallways.order("id ASC"), message: "New Point is Added", status: 200
    elsif params[:sitemap_id].present?
      @sitemap = Sitemap.find(params[:sitemap_id])
      Hallway.find(params[:current_id]).delete_hallway_point(@sitemap.hallways)
      return render json: @sitemap.hallways.order("id ASC"), message: "New Point is Added", status: 200
    end
  end

  def connect_leaf_point
    current_point = Hallway.find(params[:previous_id])
    next_point = Hallway.find(params[:current_id])
    unless is_leaf_point_child_of_next_point(current_point, next_point)
      current_point.next_points << next_point.id unless current_point.next_points.include?(next_point.id)
      current_point.save
      message = "Leaf node is already connected"
    else
      message = "Leaf node connected now"
    end
    hallways = fetch_hallways_points()
    hallways.update_all(selected: false)
    next_point.selected = true
    next_point.save
    return render json: hallways, message: message, status: 200
  end

  def save_selected_point
    current_point = Hallway.find(params[:previous_id]) if params.has_key?('previous_id') && params[:previous_id].present?
    next_point = Hallway.find(params[:current_id])
    hallways = fetch_hallways_points()
    hallways.update_all(selected: false)
    next_point.selected = true
    next_point.save
    return render json: true, message: 'selected point updated', status: 200
  end

  private

    def is_leaf_point_child_of_next_point(current_point, next_point)
      next_point.next_points.include?(current_point.id)
    end

    def fetch_hallways_points
      if params[:floor_plate_id].present?
        @floor_plate = Floorplate.find(params[:floor_plate_id])
        hallways = @floor_plate.hallways.order("id ASC")
      elsif params[:sitemap_id].present?
        @sitemap = Sitemap.find(params[:sitemap_id])
        hallways = @sitemap.hallways.order("id ASC")
      end
      hallways
    end

end
