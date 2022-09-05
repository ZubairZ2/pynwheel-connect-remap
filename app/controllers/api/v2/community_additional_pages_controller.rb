class Api::V2::CommunityAdditionalPagesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community

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
      pages_params.values.each do |page|
        add_webpage(page) if page['type'].eql?(WEBPAGE)
        add_imagepage(page) if page['type'].eql?(IMAGEPAGE)
      end
      additional_pages = all_additional_pages
      if add_additional_pages.present?
        render json: { success: true, data: additional_pages.as_json }
      else
        render json: { success: true, data: nil, message: 'Additional pages not found' }
      end
    rescue => error
      render json: { success: false, message: error }
    end
  end

  def destroy
    binding.pry

  end

  def delete_imagepage_image
    binding.pry

  end

  private

  def add_webpage(page)
    binding.pry
    if page['id'].present?
      webpage = Webpage.find page['id']
      webpage.update(name: page['name'], url: page['url'])
    else
      @community.webpages.create(name: page['name'], url: page['url'])
    end
  end

  def add_imagepage(page)
  end

  def all_additional_pages
    additional_pages = {}
    webpages = @community.webpages
    imagepages = @community.imagepages
    additional_pages.merge!({ webpages: webpages }) if webpages.present?
    additional_pages.merge!({ imagepages: imagepages }) if imagepages.present?
    additional_pages
  end

  def load_community
    @community = Community.find params[:community_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil }, status: :not_found
  end
end
