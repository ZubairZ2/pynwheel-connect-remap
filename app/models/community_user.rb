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
            :community => {:only => [:id  , :name, :production_started_date, :released_date, :submitted_final_approval_date, :product_options, :use_company_level_data_settings] , :include => {
              :comments => {:only => [:id , :content , :created_at] , :include => {
                :creator => {:only => [:id , :first_name , :last_name]}
                }}
              }}
          },
      :methods => [:invitation_date , :company_details , :floorplan_count ,:community_products, :status_in_percentage, :community_detail_forms, :directional_text_characters]
    )
  end

  def invitation_date
    CommunityUser.where(community_id: self.community_id).order(created_at: :asc)[0].created_at
  end

  def directional_text_characters
    ENV["DESCRIPTION_LIMIT"].to_i
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
    PynwheelLaunch::Forms.products_for(self.community)
  end

  def community_detail_forms
    PynwheelLaunch::Communities::CommunityDetailForms.new(self.community).get_community_detail_forms(community_products)
  end

  # The two rings on the dashboard. They count records rather than forms, so a
  # community with fifty floorplans and one credential is mostly floorplans --
  # which is what makes the ring move as a client works through them.
  def status_in_percentage
    statuses = community_detail_forms.flat_map { |form| Array(form[:status]) }
                                     .filter_map { |status| status&.dig(:name).presence }
    return { submitted: 0, approved: 0 } if statuses.empty?

    # `include?` so re_submitted counts as submitted and form_approved as
    # approved, as these rings have always done.
    {
      submitted: percent_of(statuses.count { |s| s.include?(SUBMITTED) }, statuses.length).to_i,
      approved: percent_of(statuses.count { |s| s.include?(APPROVED) }, statuses.length).to_i
    }
  end

  def percent_of(v,n)
    v.to_f / n.to_f * 100.0
  end

end
