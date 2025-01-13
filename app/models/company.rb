# == Schema Information
#
# Table name: companies
#
#  id         :integer          not null, primary key
#  name       :string
#  address    :string
#  city       :string
#  state      :string
#  zip        :string
#  email      :string
#  phone      :string
#  logo       :string
#  locked     :boolean
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  inactivate :boolean          default(FALSE)
#

class Company < ApplicationRecord
  has_paper_trail
  has_many :communities, dependent: :destroy
  has_many :users, dependent: :destroy
  has_many :community_groups, dependent: :destroy
  has_many :regions, dependent: :destroy
  has_one :status, as: :statusable
  has_one :company_setting, dependent: :destroy
  has_one :credential, dependent: :destroy
  validates_uniqueness_of :name
  scope :remove_pynwheel_company, -> { where.not(id: 44) }
  accepts_nested_attributes_for :credential,  allow_destroy: true

  def as_json
    super(
      :only => [:id , :name , :phone , :email , :address , :zip , :state , :city, :data_providers], :methods => [:company_status],include: { company_setting: { only: [:company_level_data_import] },
                                                                                                                            credential: {except: [:created_at]}}
    )
  end
  
  def set_company_details_status(current_user, status)
    return if self.blank?
    if status.nil?
      company_status = status_string(check_company_requirement(self))
    else
      company_status = status
    end
    set_status_for_all(self, company_status, current_user)
  end

  def set_status_for_all(status_entity,status_attribute,current_user)
    status_entity.build_status unless status_entity.status
    status_entity.status.update(status: status_attribute, whodunnit: current_user.id)
  end

  def company_status
    return [] if self.blank?
    [self&.status&.status_and_remarks_obj]
  end

  def delete_company
    CompanyDestroyWorker.perform_async self.id
  end

  def creator
    User.find_by(id: self.creator_id)
  end

  private

  def status_string(present_required_fields)
    present_required_fields ? SUBMITTED : IN_PROGRESS
  end

  def check_company_requirement(company)
    (company.name && company.email && company.phone && company.address && company.city && company.state && company.zip).present?
  end
  
end
