const { searchUsers, searchGroups, searchPosts } = require('../services/search_service');

// חיפוש כללי - מחזיר תוצאות חיפוש מכל הקטגוריות
exports.generalSearch = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const [users, groups, posts] = await Promise.all([
      searchUsers(query),
      searchGroups(query),
      searchPosts(query)
    ]);

    res.json({ users, groups, posts });
  } catch (err) {
    console.error('General search error:', err);
    res.status(500).json({ error: 'Failed to perform general search' });
  }
};
