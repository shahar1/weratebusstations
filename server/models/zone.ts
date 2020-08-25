/**
 * Zone model
 **/

/*
    Imports
 */

import {model, Model, Schema} from "mongoose";
import {IZoneDocument} from "./zone.d";

export const zoneSchema = new Schema({
    zone_id: {type: Number, unique: true},
    zone_name: String,
}, {collection: "zones"});

const Zone: Model<IZoneDocument> = model("Zone",zoneSchema);
export default Zone;