// מרכז את כל הראוטרים

module.exports = (app) => {
  app.use('/api/users',         require('./user_router'));
  app.use('/api/admin',         require('./admin_router'));
  app.use('/api/posts',         require('./post_router'));
  app.use('/api/groups',        require('./group_router'));
  app.use('/api/search',        require('./search_router'));
  app.use('/api/notifications', require('./notification_router'));
  app.use('/api/chats',         require('./chat_router'));
  app.use('/api/conversations', require('./conversation_router'));
};