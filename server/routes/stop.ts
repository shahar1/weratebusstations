/**
 *  Station route
 **/

/*
    Imports
 */

import express from "express";
import * as controller from "../controllers/stop";

/*
    Configuration of router
 */
const stop = express.Router();
stop.route("/:stopId").get(controller.getStopData);
export default stop;