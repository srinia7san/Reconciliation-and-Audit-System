import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    // Attach minimal user info to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };
    // Optionally refresh user from DB if needed
    // const user = await User.findById(payload.userId).lean();
    // req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
