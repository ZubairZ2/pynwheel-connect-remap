# == Schema Information
#
# Table name: community_users
#
#  id           :integer          not null, primary key
#  community_id :integer
#  user_id      :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class CommunityUser < ApplicationRecord
  has_paper_trail
  belongs_to :user
  belongs_to :community
  has_one :status, as: :statusable

  def as_json
    super(
      :only => [:id] ,
      :include => {
            :community => {:only => [:id  , :name, :production_started_date, :released_date, :submitted_final_approval_date] , :include => {
              :comments => {:only => [:id , :content , :created_at] , :include => {
                :creator => {:only => [:id , :first_name , :last_name]}
                }}
              }}
          },
      :methods => [:invitation_date , :company_details , :floorplan_count ,:community_products, :status_in_percentage, :community_detail_forms]
    )
  end

  def invitation_date
    self.created_at
  end

  def floorplan_count
    self&.community&.floorplans&.count
  end

  def company_details
    user_company = self.community.company
    if user_company.present?
      user_company.as_json
    else
      self.user.company.as_json
    end
  end

  def community_products
    if self.community.product_options.nil?
      selected_products = old_community_products
    else
      selected_products = get_client_products
    end
  end

  def old_community_products
    available_products = {:touchscreen_app => "pynwheel_touch" , :self_tour => "self_tour" , :pynwheel_access => "pynwheel_access"}
    selected_products = []
    community = self.community
    available_products.each do |key , value|
      if community[key] == true
        selected_products.push(value)
      end
    end
    selected_products
  end

  def get_client_products
    available_products = ["self_tour" , "pynwheel_touch" , "pynwheel_maps" , "graphic_design_services" , "additional_options", "pynwheel_access"]
    selected_products = []
    product_options = JSON.parse(self.community.product_options)
    available_products.each do |product|
      if product == "pynwheel_maps"
        product_status = nested_hash_value(product_options , "pynwheel_maps")
        if product_status == true
          selected_products.push(product)
        end
      end
      if product == "pynwheel_access"
        product_status = nested_hash_value(product_options , "pynwheel_access")
        if product_status == true
          selected_products.push(product)
        end
      end
      product_hash = nested_hash_value(product_options , product)
      product_status = nested_hash_value(product_hash , "is_enabled")
      if product_status == true
        selected_products.push(product)
      end
    end
    selected_products
  end

  def nested_hash_value(obj,key)
    if obj.respond_to?(:key?) && obj.key?(key)
      obj[key]
    elsif obj.respond_to?(:each)
      r = nil
      obj.find{ |*a| r=nested_hash_value(a.last,key) }
      r
    end
  end

  def community_detail_forms
    @community = self.community
    products = community_products
    community_detail_forms = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).get_community_detail_forms(products)
    community_detail_forms.each do |form|
      { name: form[:name], status: form[:status] }
    end
  end

  def status_in_percentage
    community_detail_sections = community_detail_forms
    new_statuses = []
    all_sections_with_status = community_detail_sections.map do |status|
      statuses = status[:status]
      statuses.each do |x|
        if !x.nil?
          new_statuses << x[:name] if x[:name].present?
        end
      end
    end
    total_number_of_sections = all_sections_with_status.count
    number_of_submitted_sections = new_statuses.pluck("submitted").compact.count rescue 0
    number_of_approved_sections = new_statuses.pluck("approved").compact.count rescue 0
    submitted_percentage = number_of_submitted_sections > 0 && new_statuses.length > 0 ? percent_of(number_of_submitted_sections, new_statuses.length).to_i : 0
    approved_percentage = number_of_approved_sections > 0  && new_statuses.length > 0 ? percent_of(number_of_approved_sections, new_statuses.length).to_i : 0
    status_percentage = {submitted: submitted_percentage, approved: approved_percentage}
    status_percentage
  end

  def percent_of(v,n)
    v.to_f / n.to_f * 100.0
  end

end
