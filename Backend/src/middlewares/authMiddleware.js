// בודק אם נשלח טוקן תקף מהלקוח, מאמת אותו, ומעביר את המידע על המשתמש לבקשה

const jwt = require('jsonwebtoken');

// אימות טוקן
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// אם יש טוקן מאמת אם לא ממשיך ללא
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      req.user = null; // טוקן לא תקף – נמשיך בלי יוזר
    }
  } else {
    req.user = null; // אין טוקן – נמשיך בלי יוזר
  }

  next();
}

// בדיקה אם משתמש הוא אדמין
function verifyAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin access required' });
}

module.exports = {
  verifyToken,
  optionalAuth, 
  verifyAdmin
};
