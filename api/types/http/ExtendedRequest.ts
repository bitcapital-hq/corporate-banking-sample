import { BaseRequest } from "ts-framework";
import { Company } from "../../models";

export interface ExtendedRequest extends BaseRequest {
    core?: {
        domain?: Company;
    };
}