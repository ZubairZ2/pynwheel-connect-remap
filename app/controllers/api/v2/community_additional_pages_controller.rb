class Api::V2::CommunityAdditionalPagesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_page, only: [:destroy]

  def index
    if @community.present?
      additional_pages = all_additional_pages
      if additional_pages.present?
        render json: { success: true, data: additional_pages.as_json }
      else
        render json: { success: false, data: nil, message: 'Additional Pages not found.' }
      end
    else
      render json: { success: false, data: nil, message: 'Community not found.' }
    end
  end

  def add_additional_pages
    begin
      pages_params = params['additional_pages']
      return unless pages_params.present?
      @status = params["status"] || ""
      pages_params.values.each do |page|
        add_webpage(page) if page['type'].eql?(WEBPAGE)
        add_imagepage(page) if page['type'].eql?(IMAGEPAGE)
      end
      @community.submit_launch_form(ADDITIONAL_PAGES, current_pynwheel_user, @status)
      additional_pages = all_additional_pages
      if additional_pages.present?
        render json: { success: true, data: additional_pages.as_json }
      else
        render json: { success: true, data: nil, message: 'Additional pages not found' }
      end
    rescue StandardError => e
      render json: { success: false, message: e.message }
    end
  end

  def destroy
    if @page.present?
      if @page.destroy!
        additional_pages = all_additional_pages
        @community.set_additional_pages_status(current_pynwheel_user, "in_progress")
        render json: { success: true, data: additional_pages.as_json, message: "Additional page deleted successfully!" }
      else
        render json: { success: false, data: nil, message: 'Failed to delete additional page!' }
      end
    else
      render json: { success: false, data: nil, message: 'Additional page not found' }
    end
  end

  def delete_imagepage_image
    begin
      file_type = params['get_file_type']
      if file_type.present?
        delete_additional_file(params['file_id']) if file_type.eql?("file")
        delete_additional_image(params['file_id']) if file_type.eql?("image")
        @community.set_additional_pages_status(current_pynwheel_user, "in_progress")
        additional_pages = all_additional_pages
        render json: { success: true, data: additional_pages.as_json, message: 'Image deleted successfully!' }
      end
    rescue => e
      render json: { success: false, data: nil, message: 'e.messages' }
    end
  end

  private

  def delete_additional_file file_id
    file = AdditionalFile.find file_id
    if file.present?
      file.destroy!
    end
  end

  def delete_additional_image file_id
    image = AdditionalImage.find file_id
    if image.present?
      image.destroy!
    end
  end

  def add_webpage(page)
    if page['id'].present?
      webpage = Webpage.find page['id']
      webpage.update!(name: page['name'], url: page['url'])
    else
      @community.webpages.create!(name: page['name'], url: page['url'])
    end
  end

  def add_imagepage(page)
    if page['id'].present?
      update_page = Imagepage.find page['id']
      update_page.update(name: page['name'])
    else
      update_page = @community.imagepages.create!(name: page['name'])
    end
    if page["gallery"].present?
      add_additional_images(update_page, page["gallery"])
    end
    if page["files"].present?
      add_additional_files(update_page, page["files"])
    end
  end

  def add_additional_images(imagepage, images)
    images.values.each do |image|
      if image['id'].nil?
        imagepage.additional_images.create!(image: image['image'])
      end
    end
  end

  def add_additional_files(imagepage, files)
    files.values.each do |file|
      if file['id'].nil?
        imagepage.additional_files.create!(file: file['file'])
      end
    end
  end

  def all_additional_pages
    additional_pages = {}
    webpages = @community.webpages
    imagepages = @community.imagepages
    additional_pages.merge!({ webpages: webpages }) if webpages.present?
    additional_pages.merge!({ imagepages: imagepages }) if imagepages.present?
    additional_pages
  end

  def load_page
    if params['type'].present?
      if params['type'].eql?(WEBPAGE)
        @page = Webpage.find params['id']
      elsif params['type'].eql?(IMAGEPAGE)
        @page = Imagepage.find params['id']
      end
    end
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Additional Page Not Found', data: nil }, status: :not_found
  end

  def load_community
    @community = Community.find params[:community_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil }, status: :not_found
  end
end
