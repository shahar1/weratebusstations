/*
    Imports
 */

// Dotenv
import dotenv from "dotenv"; // Dotenv
dotenv.config(); // Dotenv configuration

// Express
import express from "express"; // Express
import bodyParser from "body-parser"; // Body parser
import cookieParser from "cookie-parser";  // Cookie parser

// Essentials modules
import morgan from "morgan"; // Morgan - Logging
import mongoose from "mongoose"; // Mongoose - Database
import compression from "compression"; // Copmression - Compression of HTTP responses
import helmet from "helmet"; // Helmet - Security
import errorHandler from "errorhandler"; // Error handler (for development only)
import cron from "cron"; // Cron jobs

// Utilities
import {stopsDataUtil} from "./util/stopsData";
import {zonesDataUtil} from "./util/zonesData";

// Routes
import stop from "./routes/stop"; // Station

/*
    Configurations
 */

const app = express(); // Express

/*
    Middlewares
 */

app.use(bodyParser.urlencoded({extended: false})); // Avoid parsing application/x-www-form-urlencoded post data
app.use(bodyParser.json()); // Parse JSON application/json post data
app.use(cookieParser()); // Parse cookies
app.use(helmet()); // Enhance helmet
app.use(compression()); // Compress HTTP responses

// Apply development packages
if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev")); // Morgan for logging
    app.use(errorHandler()); // Error handling
}

/*
    Cronjobs
 */

// Install
/*let is_running = false;
const CronJob = cron.CronJob;
new CronJob(
   '0 * * * * *',
  async ()=>{
       await stopsDataUtil.updateData()
  },
    null,
true,
 'America/Los_Angeles',
);*/


(async () => {
    let tasks = [];
    tasks.push(zonesDataUtil.updateData());
    const remoteFileDataProm = stopsDataUtil.getRemoteZip(); // Get remote ZIP file
    const lastModifiedProm = stopsDataUtil.lastModified; // Get last modified date from redis as string
    const [remoteFileData,lastModified] = await Promise.all([remoteFileDataProm,lastModifiedProm]);

    if(!lastModified || (remoteFileData["date"]-Date.parse(lastModified))>=1000*60*60*24){
        tasks.push(stopsDataUtil.updateData()); // Download ZIP file from GTFS and upload CSV to Mongoose
    }

    await Promise.all(tasks);
})();

/*
    MongoDB Connection
 */

mongoose.connect(`${process.env.MONGODB_URI}`,
    {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("Connected to MongoDB");

        // Set debug mode in development
        if (process.env.NODE_ENV !== "production") {
            mongoose.set("debug", true); // Set debug in development environment
            console.log("MongoDB Debug set to true in development environment");
        }
    }).catch((err) => console.error(err));

/*
    Routing
 */

app.use("/api/stop", stop);

app.get('/', function (req, res) {
    res.send('hello world')
})

/*
    App listen
 */
app.listen(process.env.PORT, () => console.log(`Server is running on port: ${process.env.PORT}`));
