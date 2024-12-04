const axios = require('axios')
const router = require('express').Router()
const { onGetAccessToken } = require('../../services/apple')
const AV = require('leanengine')

router.post('/onIapVerifyReceipt', async (req, res) => {
  const { username, orderId, transactionReceipt } = req.body
  console.log({ username, orderId, transactionReceiptLength: transactionReceipt?.length })

  let q = new AV.Query('_User')
  q.equalTo('username', username)
  const userLcObject = await q.first()
  if (!userLcObject) {
    return res.status(403).json({ error: '用户不存在。' })
  }

  // 这里比较恶心，先进行线上检测，检测错误21007再调用沙盒环境再检测一次
  let requestUrl = 'https://buy.itunes.apple.com/verifyReceipt'
  let status = -1
  try {
    let iapAccessToken = onGetAccessToken()
    let ret = await axios.post(
      requestUrl,
      {
        'receipt-data': transactionReceipt
      },
      {
        headers: {
          Authorization: `Bearer ${iapAccessToken}`,
          'content-type': 'application/json'
        }
      }
    )
    let verifyData = ret.data
    let status = verifyData.status
    let receipt = verifyData.receipt
    console.log(JSON.stringify(verifyData, null, 2))
    console.log('上面是线上检测结果')
    if (status === 21007) {
      console.log('线上检测失败返回21007，尝试沙盒环境')
      // 调用的是沙盒环境，沙盒再查一遍
      requestUrl = 'https://sandbox.itunes.apple.com/verifyReceipt'
      iapAccessToken = onGetAccessToken()
      ret = await axios.post(
        requestUrl,
        {
          'receipt-data': transactionReceipt
        },
        {
          headers: {
            Authorization: `Bearer ${iapAccessToken}`,
            'content-type': 'application/json'
          }
        }
      )
      verifyData = ret.data
      status = verifyData.status
      receipt = verifyData.receipt
      console.log(JSON.stringify(verifyData, null, 2))
      console.log('上面是沙盒检测结果')
    }
    if (!receipt.in_app.length) {
      console.log('订单不存在。')
      return res.status(403).json({ error: '订单不存在。' })
    }
    if (receipt.in_app.find((i) => i.transaction_id === orderId)) {
      console.log('会员处理。')
      const saveData = {
        isVip: true,
        vipExpireTime: new Date('2299-12-31 23:59:59')
      }
      console.log(JSON.stringify(saveData, null, 2))
      console.log('会员处理成功', userLcObject.get('username'))
      await userLcObject.save(saveData)
    } else {
      console.log('订单不匹配。')
      return res.status(403).json({ error: '订单不匹配。' })
    }
  } catch (error) {
    console.log('verify error', error)
  }

  console.log('交易完成')
  res.json({ success: !status })
})

const iapMap = {
  mali0: 100,
  mali1: 600,
  mali2: 2800,
  mali3: 6800,
  mali4: 12800
}

// 应该与上面合并，此接口暂时弃用
router.post('/onIapVerifyReceiptScore', async (req, res) => {
  const { accessToken, orderId, transactionReceipt } = req.body
  console.log({ accessToken, orderId, transactionReceiptLength: transactionReceipt?.length })

  let q = new AV.Query('AccessToken')
  q.equalTo('token', accessToken)
  const accessTokenLcObject = await q.first()
  if (!accessTokenLcObject) {
    return res.status(403).json({ error: '身份码不存在。' })
  }

  q = new AV.Query('IapOrder')
  q.equalTo('orderId', orderId)
  let iapOrderLcObject = await q.first()
  if (iapOrderLcObject) {
    return res.status(403).json({ error: '订单已存在。' })
  }
  iapOrderLcObject = new AV.Object('IapOrder')

  // 这里比较恶心，先进行线上检测，检测错误21007再调用沙盒环境再检测一次
  let requestUrl = 'https://buy.itunes.apple.com/verifyReceipt'
  let status = -1
  let fen = -1
  try {
    let iapAccessToken = onGetAccessToken()
    let ret = await axios.post(
      requestUrl,
      {
        'receipt-data': transactionReceipt
      },
      {
        headers: {
          Authorization: `Bearer ${iapAccessToken}`,
          'content-type': 'application/json'
        }
      }
    )
    let verifyData = ret.data
    let status = verifyData.status
    let receipt = verifyData.receipt
    console.log(JSON.stringify(verifyData, null, 2))
    console.log('上面是线上检测结果')
    if (status === 21007) {
      console.log('线上检测失败返回21007，尝试沙盒环境')
      // 调用的是沙盒环境，沙盒再查一遍
      requestUrl = 'https://sandbox.itunes.apple.com/verifyReceipt'
      iapAccessToken = onGetAccessToken()
      ret = await axios.post(
        requestUrl,
        {
          'receipt-data': transactionReceipt
        },
        {
          headers: {
            Authorization: `Bearer ${iapAccessToken}`,
            'content-type': 'application/json'
          }
        }
      )
      verifyData = ret.data
      status = verifyData.status
      receipt = verifyData.receipt
      console.log(JSON.stringify(verifyData, null, 2))
      console.log('上面是沙盒检测结果')
    }
    // score增加
    fen = iapMap[receipt.in_app[0].product_id]
    accessTokenLcObject.increment('score', fen)
    await accessTokenLcObject.save()

    // 保存订单信息
    await iapOrderLcObject.save({
      accessToken,
      orderId,
      fen,
      verifyData,
      status: 'Completed'
    })
  } catch (error) {
    console.log('verify error', error)
    status = -1
    await iapOrderLcObject.save({
      accessToken,
      orderId,
      fen,
      status: 'Failed'
    })
  }

  res.json({ success: !status })
})

module.exports = router
