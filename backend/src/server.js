import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import toolsRoutes from './routes/toolsRoutes.js';
import { connectDB } from './config/db.js';


dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const normalizeOrigin = (value) => {
  if (!value) return value;
  return String(value).trim().replace(/\/$/, "");
};

const isDev = process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header)
    if (!origin) return callback(null, true);

    const requestOrigin = normalizeOrigin(origin);

    // In development, be permissive so local dev isn't blocked by origin/port quirks.
    if (isDev) return callback(null, true);

    const envList = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(normalizeOrigin).filter(Boolean)
      : [];

    if (envList.includes(requestOrigin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(
  cors(corsOptions)
);

// Handle preflight requests explicitly.
app.options(/.*/, cors(corsOptions));


app.use('/api/auth', authRoutes);
app.use('/api/tools', toolsRoutes);

const PORT = process.env.PORT || 5100;


app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});