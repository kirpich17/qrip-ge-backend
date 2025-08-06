const  axios = require('axios');

let bogTokenCache = { token: null, expires: 0 };

 async function getBogToken() {
  if (bogTokenCache.token && Date.now() < bogTokenCache.expires) {
    return bogTokenCache.token;
  }
  const tokenUrl = 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.BOG_CLIENT_ID);
  params.append('client_secret', process.env.BOG_CLIENT_SECRET);
  try {
    const response = await axios.post(tokenUrl, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    bogTokenCache = {
      token: response.data.access_token,
      expires: Date.now() + (response.data.expires_in - 300) * 1000
    };
    return response.data.access_token;
  } catch (error) {
    console.error('BOG Token acquisition error:', error.response?.data || error.message);
    throw new Error('Failed to acquire BOG payment token');
  }
}

module.exports=getBogToken