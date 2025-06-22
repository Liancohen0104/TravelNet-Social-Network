// נתיב חיפוש כללי

const router = require('express').Router();
const searchController = require('../controllers/search_controller');

router.get('/all-categories', searchController.generalSearch);

module.exports = router;
