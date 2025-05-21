import { HSReleaseInfo, PrivateAPIResponse } from "../../../types/hs-types";
import { HSGlobal } from "../hs-global";

/*
    Small class to communicate with an endpoint on my server
    to get the mod release info
*/
export class HSGithub {
    static async getLatestRelease() {
        try {
            const resp = await fetch(`${HSGlobal.PrivateAPI.base}${HSGlobal.PrivateAPI.latestRelease}`);
            const respJson = await resp.json() as PrivateAPIResponse;

            if(respJson.code === 0) {
                return respJson.data as HSReleaseInfo;
            } else {
                return null;
            }
        } catch (err) {
            return null;
        }
    }
}