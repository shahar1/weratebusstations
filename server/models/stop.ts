/**
 * Stop model
 **/

/*
    Imports
 */

import {model, Model, Schema} from "mongoose";
import {IStopDocument} from "./stop.d";

export const stopSchema = new Schema({
    stop_id: {type: Number, unique: true},
    stop_code: Number,
    stop_name: String,
    stop_desc: String,
    stop_lat: Number,
    stop_lon: Number,
    location_type: Number,
    parent_station: Number,
    zone_id: Number
}, {collection: "stops", toJSON: {virtuals: true}, toObject: {virtuals: true}});

stopSchema.virtual("zone",{
    ref: {path: "zones"},
    localField: "zone_id",
    foreignField: "zone_id"
});

const Stop: Model<IStopDocument> = model("Stop",stopSchema);
export default Stop;