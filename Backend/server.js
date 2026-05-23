require("dotenv").config();
const express = require("express");
const cors = require("cors");

const weatherRoutes = require("./routes/weatherRoutes");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/weather",weatherRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
console.log(`Server running on port ${PORT}`);
});