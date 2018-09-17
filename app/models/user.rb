# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  email                  :string           default(""), not null
#  encrypted_password     :string           default(""), not null
#  reset_password_token   :string
#  reset_password_sent_at :datetime
#  remember_created_at    :datetime
#  sign_in_count          :integer          default(0), not null
#  current_sign_in_at     :datetime
#  last_sign_in_at        :datetime
#  current_sign_in_ip     :inet
#  last_sign_in_ip        :inet
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  first_name             :string
#  last_name              :string
#  role                   :string
#  avatar                 :string
#  invitation_token       :string
#  invitation_created_at  :datetime
#  invitation_sent_at     :datetime
#  invitation_accepted_at :datetime
#  invitation_limit       :integer
#  invited_by_type        :string
#  invited_by_id          :integer
#  invitations_count      :integer          default(0)
#  company_id             :integer
#

class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  mount_uploader :avatar, AvatarUploader
  devise :invitable, :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable
  #ROLES = ["super admin" , "company admin" , "community manager", "region admin" , "member"]  
  ROLES = ["Super admin" , "Company admin"]  
  belongs_to :company     

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

  def is_company_admin?
    role == "Company admin"
  end

  def is_community_manager?
    role == "community manager"
  end

  def is_region_admin?
    role == "region admin"
  end

  def is_member?
    role == "member"
  end

end
