const { Router } = require('express')
const postRoutes = require('./api/post')
const commentRoutes = require('./api/comment')
const payRoutes = require('./api/pay')
const appleRoutes = require('./api/apple')

const router = Router()

// 默认英文
router.use('/*', (req, res, next) => {
  req.locale = 'zh'
  next()
})

router.get('/', (req, res) => {
  res.send('Hello World')
})

router.get('/ping', (req, res) => {
  res.json({
    data: 'success'
  })
})

router.use('/post', postRoutes)
router.use('/comment', commentRoutes)
router.use('/pay', payRoutes)
router.use('/apple', appleRoutes)
module.exports = router
