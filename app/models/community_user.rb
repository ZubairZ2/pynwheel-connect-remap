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
            :community => {:only => [:id  , :name] , :include => {
              :comments => {:only => [:id , :content , :created_at] , :include => {
                :creator => {:only => [:id , :first_name , :last_name]}
                }}
              }}
          },
      :methods => [:invitation_date , :company_name , :community_products, :status_in_percentage, :community_detail_forms]
    )
  end

  def invitation_date
    self.created_at
  end

  def company_name
    user_company = self.user.company
    if user_company.present?
      user_company&.name
    else
      self.community.company&.name
    end
  end

  def community_products
    if self.product_options.nil?
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
    available_products = ["self_tour" , "pynwheel_touch" , "pynwheel_maps" , "graphic_design_services" , "additional_options"]
    selected_products = []
    product_options = JSON.parse(self.product_options)
    available_products.each do |product|
      if product == "pynwheel_maps"
        product_status = nested_hash_value(product_options , "pynwheel_maps")
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
    all_sections_with_status = community_detail_sections.map {|x| x[:status]}
    total_number_of_sections = all_sections_with_status.count
    number_of_submitted_sections = all_sections_with_status.pluck("submitted").compact.count rescue 0
    number_of_approved_sections = all_sections_with_status.pluck("approved").compact.count rescue 0
    submitted_percentage = percent_of(number_of_submitted_sections, total_number_of_sections).to_i
    approved_percentage = percent_of(number_of_approved_sections, total_number_of_sections).to_i
    status_percentage = {submitted: submitted_percentage, approved: approved_percentage}
    status_percentage 
  end

  def percent_of(v,n)
    v.to_f / n.to_f * 100.0
  end

end
