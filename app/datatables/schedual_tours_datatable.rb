class SchedualToursDatatable
  delegate :params, :scheduled_tour_date_time, to: :@view
  include SchedualToursHelper

  def initialize(view,community)
    @view = view
    @community = community
  end

  def as_json(options = {})
    {
      sEcho: params[:sEcho].to_i,
      iTotalRecords: SchedualTour.where("community_id = ? AND tour_user_id is not null", @community).count,
      iTotalDisplayRecords: scheduled_tours.total_entries,
      page: page,
      per_page: per_page,
      aaData: data
    }
  end

private

  def scheduled_tour_icon_status(scheduled_tour,community)
    if scheduled_tour.is_tour_completed && !is_tour_customized(scheduled_tour) && is_tour_in_future(community,scheduled_tour)
      '<i class="fa fa-check-square icon_size customizeTourToolTip">
        <span id="customizeTourToolTipText">
          Tour has completed
        </span>
      </i>'
    elsif scheduled_tour.is_tour_completed && is_tour_customized(scheduled_tour)
      '<i class="fa fa-info-circle icon_size customizeTourToolTip">
        <span id="customizeTourToolTipText">
          Customized Tour
        </span>
      </i>
      <i class="fa fa-check-square icon_size customizeTourToolTip">
        <span id="customizeTourToolTipText">
          Tour has completed
        </span>
      </i>'
    else
      if is_tour_in_future(community,scheduled_tour)
        if is_tour_customized(scheduled_tour)
          '<i class="fa fa-info-circle icon_size customizeTourToolTip">
            <span id="customizeTourToolTipText">
              Customized Tour
            </span>
          </i>'
        else
          ""
        end
      else
        if is_tour_customized(scheduled_tour)
          '<i class="fa fa-info-circle icon_size customizeTourToolTip">
            <span id="customizeTourToolTipText">
              Customized Tour
            </span>
          </i>
          <i class="fa fa-exclamation-triangle icon_size expiredTourToolTip">
            <span id="expiredTourToolTipText">
              Tour has expired
            </span>
          </i>'
        else
          if scheduled_tour.is_tour_completed
            # '<i class="fa fa-exclamation-triangle icon_size expiredTourToolTip">
            #   <span id="expiredTourToolTipText">
            #     Tour has expired
            #   </span>
            # </i>
            '<i class="fa fa-check-square icon_size customizeTourToolTip">
              <span id="customizeTourToolTipText">
                Tour has completed
              </span>
            </i>'
          else
            '<i class="fa fa-exclamation-triangle icon_size expiredTourToolTip">
              <span id="expiredTourToolTipText">
                Tour has expired
              </span>
            </i>'
          end
        end
      end
    end
  end

  def get_scheduled_tour_html_date_time(scheduled_tour,community)
    timezone = community.get_time_zone()
    scheduler_date_time = scheduled_tour_date_time(scheduled_tour) ? scheduled_tour_date_time(scheduled_tour) : unscheduled_tour_date_time(scheduled_tour,community)
    '<div>'+ scheduler_date_time +''+scheduled_tour_icon_status(scheduled_tour,community) +'</div>' rescue ""
  end

  def created_by_type scheduled_tour
    if scheduled_tour.created_by == "salesforce"
      scheduled_tour.created_by.capitalize
    else
      scheduled_tour.created_by  
    end
  end 

  def data
    ind = 0;
    community = Community.find @community if @community.present?
    scheduled_tours.map do |scheduled_tour|
      @tour_user = scheduled_tour.tour_user
      visible_tour_stops = get_visible_tour_stops(community, scheduled_tour)
      [
        ind = ind + 1,
        get_scheduled_tour_html_date_time(scheduled_tour,community),
        scheduled_tour_type(scheduled_tour),
        tour_user_name(@tour_user),
        @tour_user.email,
        @tour_user.phone_number,
        created_by_type(scheduled_tour),
        '<div style="display: flex;">'+
          '<a class="btn btn-success custom-tour-btn" id="edit-custom-tour-'+"#{scheduled_tour.id}"+'" onclick="onEditButtonClick('+"#{visible_tour_stops}"+','+"#{scheduled_tour.id}"+','+"#{@tour_user.id}"+')"'+'>'+
            '<i class="fa fa-edit icon_size"></i>'+
          '</a>'+
          '<a class="btn btn-danger" data-href="/communities/'+"#{@community}"+'/scheduled_tours/'+"#{scheduled_tour.id}"+'?delete_type=page" data-name="Tour" data-target="#confirm-delete" data-toggle="modal" href="javascrip::;"''>'+
            '<i class="fa fa-trash icon_size"></i>'+
          '</a>'+
        '</div>'
      ]
    end
  end
  
  def scheduled_tours
    @scheduled_tours ||= fetch_scheduled_tours
  end

  def fetch_scheduled_tours
    if params[:sSearch].blank?
      scheduled_tours = SchedualTour.where(community_id: @community).where.not(tour_user_id: nil).desc_tour_date
      # scheduled_tours = scheduled_tours.joins(joins_relation(sort_column)).order("#{sort_column} #{sort_direction}")
      scheduled_tours = scheduled_tours.page(page).per_page(per_page)
    else
      scheduled_tours = SchedualTour.where(community_id: @community).where.not(tour_user_id: nil)
      scheduled_tours = scheduled_tours.page(page).per_page(per_page)
      scheduled_tours = scheduled_tours.joins(:tour_user).where("tour_users.email like :search or lower(tour_users.name) like :search or tour_users.phone_number like :search", search: "%#{params[:sSearch]}%")      
    end
    scheduled_tours
  end

  def joins_relation(column)
    case column
    when 'tour_user.email'
      :tour_user
    when 'tour_user.name'
      :tour_user
    else
      nil
    end
  end

  def page
    params[:iDisplayStart].to_i/per_page + 1
  end

  def per_page
    params[:iDisplayLength].to_i > 0 ? params[:iDisplayLength].to_i : 10
  end

  def sort_column
    columns = %w[id tour_date tour_type tour_users.name tour_users.email tour_users.phone_number created_by]
    columns[params[:iSortCol_0].to_i]
  end

  def sort_direction
    params[:sSortDir_0] == "desc" ? "desc" : "asc"
  end
end