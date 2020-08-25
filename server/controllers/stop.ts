/**
 *  Station controller
 **/

/*
    Imports
 */

import {NextFunction, Request, RequestHandler, Response} from "express"; // Express
import Stop from "../models/stop";
import Zone from "../models/zone"; // Mongoose

export const getStopData: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const {stopId} = req.params;
    Stop.find({stop_id: parseInt(stopId)})
        .populate({path:'zone', model: Zone})
        .exec()
        .then((data) => {
                res.json(data[0])
            }
        )
        .catch((err) => res.json(err));
}