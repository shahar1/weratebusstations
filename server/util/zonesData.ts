/*
    Imports
 */
import axios from "axios"; // Axios
import * as XLSX from "xlsx"; // XLSX
import Zone from "../models/zone"; // Zone model

const xlsxRemoteFileAddress = process.env["ZONES_REMOTE_FILE"]!;

export const zonesDataUtil = {
    async updateData() {
        try {
            const fileData = await axios.get(xlsxRemoteFileAddress, {responseType: "arraybuffer"});
            const xlsxFile = await XLSX.read(fileData.data, {type: "buffer"});
            const firstSheet = Object.keys(xlsxFile.Sheets)[0];
            const jsonData: Object[] = XLSX.utils.sheet_to_json(xlsxFile.Sheets[firstSheet]);

            let buffer = [];

            for (let i = 0; i < jsonData.length; i++) {
                const docObj = {
                    zone_id: Object.values(jsonData[i])[1],
                    zone_name: Object.values(jsonData[i])[0],
                }

                buffer.push({
                    updateOne: {
                        filter: {
                            zone_id: docObj.zone_id,
                        },
                        update: {
                            $set: {...docObj},
                        },
                        upsert: true
                    }
                });
            }


            await Zone.bulkWrite(buffer, {ordered: false});

        } catch (e) {
            console.error(e)
        }
    }
}