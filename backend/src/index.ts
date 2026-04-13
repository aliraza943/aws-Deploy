import cors from "cors";
import "dotenv/config";
import express from "express";
import authRoutes from './routes/auth';
import todoRoutes from './routes/todos';

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/todos", todoRoutes);
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || "development";
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${ENV}`);            // 👈 tells you which env
    console.log(`Database: ${process.env.DATABASE_URL?.split("@")[1]}`); // shows DB host only, not password
});
