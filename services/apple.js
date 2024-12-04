const jwt = require('jsonwebtoken')
const fs = require('fs')

// 设置参数
const api_key = process.env.APPLE_IAP_API_KEY
const issuerID = process.env.APPLE_IAP_ISSUER_ID
const private_key = fs.readFileSync('services/private.key', 'utf8')
const appid = process.env.APPLE_IAP_APP_ID

let iap = {
  access_token: '',
  expiresTime: Math.floor(new Date().getTime() / 1000)
}
// 过期时间设置为当前时间后的 5 分钟
const exp = 60 * 5

exports.onGetAccessToken = function () {
  // 获取当前时间戳（以秒为单位）
  const currentTime = Math.floor(new Date().getTime() / 1000)
  if (currentTime > iap.expiresTime || !iap.access_token) {
    // 构建jwt头
    const jwt_headers = {
      algorithm: 'ES256',
      keyid: api_key
    }
    // 构建负载数据
    const payload = {
      iss: issuerID,
      iat: currentTime,
      exp: currentTime + exp,
      aud: 'appstoreconnect-v1',
      bid: appid
    }
    // 生成 JWT
    const token = jwt.sign(payload, private_key, jwt_headers)
    iap.expiresTime = currentTime + exp
    iap.access_token = token
    return token
  } else {
    return iap.access_token
  }
}
