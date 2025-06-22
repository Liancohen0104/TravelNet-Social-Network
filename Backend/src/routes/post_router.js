// נתיבים של פוסט

const router = require('express').Router();
const postController = require('../controllers/post_controller');
const { verifyToken, optionalAuth } = require('../middlewares/authMiddleware');
const { upload } = require("../services/cloudinary_service");

router.get('/:id/view-shared-post',          optionalAuth, postController.getSharedPost);
router.post('/create-post',                  upload.fields([{ name: 'images', maxCount: 10 },{ name: 'videos', maxCount: 5 }]),
verifyToken, postController.createPost);
router.put('/:id/update-post',               upload.fields([{ name: 'images', maxCount: 10 },{ name: 'videos', maxCount: 5 }]),
verifyToken, postController.updatePost);
router.delete('/:id/delete-post',            verifyToken, postController.deletePost);
router.get('/search-post',                   verifyToken, postController.searchPosts);
router.get('/:id/share-link',                verifyToken, postController.getShareLink);
router.put('/:id/make-public',               verifyToken, postController.makePostPublic);
router.put('/:id/make-private',              verifyToken, postController.makePostPrivate);
router.get('/:id',                           verifyToken, postController.getPostById);
router.post('/:id/like',                     verifyToken, postController.toggleLike);
router.post('/:id/comment',                  verifyToken, postController.addComment);
router.delete('/:postId/comment/:commentId', verifyToken, postController.deleteComment);
router.post('/:id/share-to-feed',            verifyToken, postController.sharePostToFeed);

module.exports = router;
