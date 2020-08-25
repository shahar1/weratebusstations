/**
 *  Zone
 **/

/*
   Imports
 */

import {Document} from "mongoose";

/*
   Interfaces
 */

export interface IZone {
    zone_number: number,
    zone_name: string,
}

export interface IZoneDocument extends IZone, Document {

}