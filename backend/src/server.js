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

app.use(
  cors({
    origin: (origin, callback) => {
      const envList = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
        : ['http://localhost:5123', 'http://127.0.0.1:5123'];

      // Allow non-browser requests (no Origin header)
      if (!origin) return callback(null, true);

      if (envList.includes(origin)) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true, 
}));


app.use('/api/auth', authRoutes);
app.use('/api/tools', toolsRoutes);

const PORT = process.env.PORT || 5100;


app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});