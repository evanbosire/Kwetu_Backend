const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const customerRoutes = require("./routes/customerRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const adminRoutes = require("./routes/adminRoutes"); // Admin routes for login and registration

const app = express();
const port = process.env.PORT || 5000; // Use the environment PORT variable

// MongoDB connection using environment variable
const uri = process.env.MONGO_URL;
mongoose
  .connect(uri) // Consider updating options for Mongoose
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Enable CORS for specific origin (your frontend)
app.use(
  cors({
    origin: "https://kwetu-frontend-git-main-evans-bosires-projects.vercel.app",
    credentials: true,
  })
);

app.use(bodyParser.json());

// Basic root route
app.get("/", (req, res) => {
  res.send("Welcome to the API! EvansBosire.Dev"); // Change this to your preferred response
});

// Use routes
app.use("/api/customers", customerRoutes);
app.use("/api", employeeRoutes);
app.use("/api/admin", adminRoutes); // Admin routes for login and registration

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
