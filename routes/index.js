const { Router } = require('express')
const apiRoutes = require('./api')

const router = Router()

// API 路由
router.use('/api', apiRoutes)

module.exports = router