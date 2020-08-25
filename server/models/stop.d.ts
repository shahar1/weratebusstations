/**
 *  Stop type
 **/

/*
   Imports
 */

import {Document} from "mongoose";

/*
   Interfaces
 */

export interface IStop {
   stop_id: number,
   stop_code: number,
   stop_name: string,
   stop_desc: string,
   stop_lat: number,
   stop_lon: number,
   location_type: string,
   parent_station: number,
   zone_id: number
}

export interface IStopDocument extends IStop, Document {

}