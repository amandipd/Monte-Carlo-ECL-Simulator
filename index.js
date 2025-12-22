const express = require("express");
const path = require("path");
const moment = require("moment");
const logger = require("./middleware/logger");

const app = express();

// Init middleware
// app.use(logger);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/members", require("./routes/api/members"));

// we use app.use() when we want to use middleware

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
