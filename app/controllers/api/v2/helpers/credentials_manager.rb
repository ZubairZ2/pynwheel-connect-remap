module CredentialsManager
  DATA_PROVIDERS_CREDENTIALS = {
    'yardirentcafe' => {
      company: {
        api_token: :api_token,
        yardi_rent_cafe_api_url: :api_url,
        c_code: :c_code,
        rentcafe_api_version: :rentcafe_api_version
      },
      community: {
        api_token: :api_token,
        yardi_rent_cafe_api_url: :api_url,
        c_code: :c_code,
        p_code: :p_code,
        rentcafe_api_version: :rentcafe_api_version,
        currency: :currency,
        limit_result: :limit_result
      }
    },
    'psi' => {
      company: {
        entrata_url: :domain,
        username: :username,
        password: :password,
        currency: :currency
      },
      community: {
        entrata_url: :domain,
        username: :username,
        password: :password,
        currency: :currency,
        property_id: :property_id,
        limit_result: :limit_result
      }
    }
    # Add more providers and their respective credentials as needed
  }.freeze


  CREDENTIALS_CRITERIA = {
    'yardirentcafe' => { column: 'p_code' },
    'psi' => { column: 'property_id' }
  }.freeze
end