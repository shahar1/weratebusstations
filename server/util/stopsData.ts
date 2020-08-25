/**
 *  Stops Data Utility
 **/

/*
    Imports
 */
// Essentials
import fs from "fs"; // File system
import path from "path"; // Path
import {RedisClient} from "redis"; // Redis client (typing)
import FTPClient = require("ftp"); // FTP
const redis = require("redis"); // Redis client
const {promisify} = require("util"); // Promisify
const unzipper = require("unzipper"); // Unzipper
import * as csv from 'fast-csv'; // CSV

// Models
import Stop from "../models/stop";

/*
    Definitions
 */

// Environment variables
const zipName: string = process.env.GTFS_ZIP_NAME || ''; // GTFS ZIP File Name
const fileName: string = process.env.GTFS_FILE_NAME || ''; // GTFS File Name
const outDir: string = process.env.DATASETS_FOLDER || ''; // Output directory for download

/*
    Instances
 */

// FTP client instance
const FTPclient: FTPClient = new FTPClient(); // Initialize FTP client instance
FTPclient.connect({host: process.env.GTFS_FTP_HOST}); // Connect FTP
FTPclient.on('ready', (): void => console.log("FTP client is ready")); // Print when FTP client is ready

// FTP async methods
const FTPclientListAsync = promisify(FTPclient.list.bind(FTPclient)); // FTP client list async

// Redis client instance
const redisclient = redis.createClient(process.env.REDIS_URL); // Initialize Redis client instance
redisclient.on("ready", () => console.log("Redis client is ready")); // Print when Redis client is ready

if(process.env.NODE_ENV !== "production") {
    redisclient.flushall(); // TODO: DEVELOPMENT ONLY
}

// Redis async methods
const redisGetAsync = promisify(redisclient.get.bind(redisclient)); // Redis get async method
const redisSetAsync = promisify(redisclient.set.bind(redisclient)); // Redis set async method

let isRunning:boolean = false;

/*
    Utility
 */
export const stopsDataUtil = {
    /*
        Getters
     */
    // Last modified
    get lastModified() {
        return (async () => {
            return await redisGetAsync("GTFS_FILE_LAST_MODIFIED")
        })();
    },

    /*
        Setters
     */
    // Last modified
    set lastModified(p) {
        p.then((v) => {
            return redisSetAsync("GTFS_FILE_LAST_MODIFIED", v)
        });
    },

    /*
        Functions
     */
    // Get remote ZIP file data
    async getRemoteZip() {
        const list = await FTPclientListAsync(); // Await async FTP client list
        return list.filter((item: { name: string }): boolean => { //TODO: Consider converting to find
            return item.name == zipName
        })[0]; // File properties;
    },
    // Update data
    async updateData() {

        if(isRunning){
            console.log("still running, do not disturb")
            return;
        }


        isRunning = true;

        await redisSetAsync("IS_UPDATING",true);

        const remoteZip = await this.getRemoteZip(); // Get remote ZIP file
        const {date, size} = remoteZip; // Last modified date and size of remote ZIP file

        // Create outDir folder if doesn't exist
        if (!fs.existsSync(outDir)){
            fs.mkdirSync(outDir);
        }

        FTPclient.get(zipName, (err, readStream) => { // FTP client instance get ZIP file
            // If error exists - return error
            if (err) {
                return console.log(err);
            } else {
                const writeStream = fs.createWriteStream(path.join(outDir, zipName)); // Define writable file
                readStream.pipe(writeStream); // Connect readStream to writeStream
                let written = 0; // Written data out of total
                console.log("Downloading stops data to " + (path.join(outDir, zipName)));

                // When getting data - print percentages of download
                readStream.on('data', data => {
                    writeStream.write(data, () => {
                        written += data.length;
                    })
                })
                    .pipe(unzipper.Extract({path: outDir})
                        .on('close', () => {
                            console.log("Finished Extraction");
                            fs.readFile(path.join(outDir, fileName), (err, data) => {
                                redisSetAsync("GTFS_FILE_LAST_MODIFIED", date.toString())
                                    .then(() => {
                                        this.uploadDataToDB();
                                        console.log("Updated last modified");
                                        isRunning = false;
                                    });
                            });
                        })
                    );
            }
        });
    },
    async uploadDataToDB(){
        let buffer:Object[] = [];
        let counter = 0;
        let stream = fs.createReadStream(path.join(outDir,fileName))
            .pipe(csv.parse({ headers: true }))
            .on('data',async (doc)=>{
                stream.pause();

                const docObj = {
                    stop_id: Number(doc.stop_id),
                    stop_code: Number(doc.stop_code),
                    stop_name: doc.stop_name,
                    stop_desc: doc.stop_desc,
                    stop_lat: Number(doc.stop_lat),
                    stop_lon: Number(doc.stop_lon),
                    location_type: Number(doc.location_type),
                    parent_station: Number(doc.parent_station),
                    zone_id: Number(doc.zone_id)
                }

                buffer.push({
                    updateOne: {
                        filter: {stop_id: doc.stop_id},
                        update: {
                            $set: {...docObj},
                        },
                        upsert: true
                    }
                });

                counter++;
                if(counter > 2000) // TODO: env
                {
                    await Stop.bulkWrite(buffer,{ordered: false});
                    buffer = [];
                    counter = 0;
                }
                stream.resume();
                //Stop.findOneAndUpdate({'stop_id': row.stop_id},row,{upsert: true},(err,doc)=>{
                // })
            })
            .on("end", async () => {
                    if ( counter > 0 ) {
                        await Stop.bulkWrite(buffer,{ordered: false})
                        buffer = [];
                        counter = 0;
                    }
            });
    }
}