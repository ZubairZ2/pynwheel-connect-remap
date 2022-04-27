module CustomTokenErrorResponse
  def body
    {
      success: false,
      status_code: 401,
      message: I18n.t('devise.failure.invalid', authentication_keys: User.authentication_keys.join('/')),
      result: []
    }
  end
end
