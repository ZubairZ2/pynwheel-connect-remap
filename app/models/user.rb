class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  mount_uploader :avatar, AvatarUploader
  devise :invitable, :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable
  ROLES = ["super admin" , "company admin" , "community manager", "region admin" , "member"]  
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

end
