module CustomTokenResponse
  def body
    user = User.find(@token.resource_owner_id)
    user_details = user.as_json
    if user.verified_portal_user?
     	super.merge({
        success: true,
     		status_code: 200,
     		message: I18n.t('devise.sessions.signed_in'),
     		user_details: user_details
     	})
    else
      {
        success: false,
     		status_code: 401,
     		message: "Unauthorized. You don't have permission to access this area or content",
     		user_details: []
     	}
    end
  end
end
