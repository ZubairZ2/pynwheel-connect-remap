# == Schema Information
# == Schema Information
#
# Table name: users
#
#  id                            :integer          not null, primary key
#  email                         :string           default(""), not null
#  encrypted_password            :string           default(""), not null
#  reset_password_token          :string
#  reset_password_sent_at        :datetime
#  remember_created_at           :datetime
#  sign_in_count                 :integer          default(0), not null
#  current_sign_in_at            :datetime
#  last_sign_in_at               :datetime
#  current_sign_in_ip            :inet
#  last_sign_in_ip               :inet
#  created_at                    :datetime         not null
#  updated_at                    :datetime         not null
#  first_name                    :string
#  last_name                     :string
#  role                          :string
#  avatar                        :string
#  invitation_token              :string
#  invitation_created_at         :datetime
#  invitation_sent_at            :datetime
#  invitation_accepted_at        :datetime
#  invitation_limit              :integer
#  invited_by_type               :string
#  invited_by_id                 :integer
#  invitations_count             :integer          default(0)
#  company_id                    :integer
#  company_name                  :string
#  welcome_prompt                :boolean          default(FALSE)
#  community_logs                :string
#  entrata_list_logs             :string
#  entrata_function_logs         :string
#  welcome_property_details_page :boolean          default(FALSE)
#  welcome_logo_page             :boolean          default(FALSE)
#  welcome_homepage_page         :boolean          default(FALSE)
#  welcome_floorplate_page       :boolean          default(FALSE)
#  welcome_amenity_page          :boolean          default(FALSE)
#  welcome_floorplan_page        :boolean          default(FALSE)
#  welcome_sitemap_page          :boolean          default(FALSE)
#  welcome_edit_floorplan_page   :boolean          default(FALSE)
#  welcome_unit_page             :boolean          default(FALSE)
#  welcome_neighbourhood_page    :boolean          default(FALSE)
#  welcome_favorite_page         :boolean          default(FALSE)
#  welcome_additional_page       :boolean          default(FALSE)
#  welcome_gallery_page          :boolean          default(FALSE)
#

class User < ApplicationRecord
  acts_as_reader
  # attr_readonly :uuid
  has_paper_trail
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  mount_uploader :avatar, AvatarUploader
  devise :invitable, :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable, :timeoutable, :timeout_in => 8.hours
  #ROLES = ["super admin" , "company admin" , "community manager", "region admin" , "member"]
  ROLES = ["Community admin", "Community manager",["Company admin","Company admin"] ,["Regional admin", "Regional admin"], ["Pynwheel admin","Super admin"],["View Visitor Details","visitor_detail_page"], ["Dwelo admin","Dwelo admin"], ["Community Assistant (Pynwheel Tour)","Community assistant"]]
  ROLES_DWELO_ADMIN = [["Company admin","Company admin"] ,["Regional admin", "Regional admin"], ["Community admin", "Community admin"],["Community manager","Community manager"],["View Visitor Details","visitor_detail_page"], ["Community Assistant (Pynwheel Tour)","Community assistant"]]
  ROLES_ADMIN = [ "Community manager"]
  belongs_to :company
  belongs_to :region
  has_many :community_users,dependent: :destroy
  has_many :communities ,through: :community_users
  # before_validation :gen_uuid, on: :create
  # validates :uuid, presence: true, uniqueness: true

  def as_json options = {}
    super(
      :only => [:id , :first_name , :last_name , :email , :role] ,
      :methods => [:is_user_authorized, :name, :company_details]
    )
  end

  def company_details
    user_company = self.company || self.communities&.last&.company
    if user_company.present?
      user_company.as_json
    end
  end

  def all_companies
    Company.all.map(&:name).sort
  end

  def dwelo_companies
    Company.where(creator_id: User.where(role: "Dwelo admin").ids).map(&:name).sort
  end
  
  def name
  	if first_name.nil? and last_name.nil?
  		email
  	else
  		first_name+" "+last_name
  	end
  end

  def is_super_admin?
    role == "Super admin"
  end

  def is_community_admin?
    (role == "Community admin") || (role == "Dwelo admin")
  end

  def is_comm_admin?
    role == "Community admin"
  end

  def is_community_manager?
    role == "Community manager"
  end

  def is_view_visitor_details_page?
    role == "visitor_detail_page"
  end

  def is_dwelo_admin?
    role == "Dwelo admin"
  end

  def is_community_assistant?
    role == "Community assistant"
  end

  def return_last_cms_session
    if !self.cms_sessions.any?
      self.cms_sessions.build
    elsif self.cms_sessions.start_datetime_in_limit?
      last_session = self.cms_sessions.last
      last_session.update_column(:end_datetime, (last_session.start_datetime + 10.minutes) )
      self.cms_sessions.build
    else
      self.cms_sessions.last
    end
  end

  def is_company_admin?
    role == "Company admin"
  end

  def is_regional_admin?
    role == "Regional admin"
  end

  def is_new_client?
    role == "New Client"
  end

  def verified_portal_user?
    is_new_client? || is_super_admin? || self.pynwheel_launch_access
  end

  def is_user_authorized
    is_new_client? || is_super_admin? || self.pynwheel_launch_access
  end

  def is_admin?
    is_super_admin? || is_community_admin? ||  is_community_manager? || is_company_admin? || is_regional_admin?
  end

  # def gen_uuid
  #   self.uuid = SecureRandom.uuid
  # end

  # def self.reader_scope
  #   where(role: "Community admin")
  # end
end
