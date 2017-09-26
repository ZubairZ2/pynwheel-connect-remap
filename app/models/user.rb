class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  mount_uploader :avatar, AvatarUploader
  devise :invitable, :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable
  #ROLES = ["super admin" , "company admin" , "community manager", "region admin" , "member"]  
  ROLES = ["super admin" , "company admin"]  
  belongs_to :company     

  def name
  	if first_name.nil? and last_name.nil?
  		email
  	else
  		first_name+" "+last_name
  	end
  end  

  def is_super_admin?
    role == "super admin"
  end

  def is_company_admin?
    role == "company admin"
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
