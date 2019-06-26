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
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  mount_uploader :avatar, AvatarUploader
  devise :invitable, :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable
  #ROLES = ["super admin" , "company admin" , "community manager", "region admin" , "member"]  
  ROLES = ["Super admin","Community admin", "Community manager"]
  ROLES_ADMIN = [ "Community manager"]   
  belongs_to :company
  has_many :community_users,dependent: :destroy
  has_many :communities ,through: :community_users

  def all_companies
    Company.all.map(&:name)
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
    role == "Community admin"
  end

  def is_community_manager?
    role == "Community manager"
  end
end
