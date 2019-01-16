import { AuthService } from "../../services";
import { BaseResponse } from 'ts-framework';
import { ExtendedRequest } from "../../types/http";

/**
 * Authorization check middleware.
 *
 * @param req The express request
 * @param res The express response
 * @param next The express next middleware in chain
 */
export default async function authorize(req: ExtendedRequest, res: BaseResponse, next) {
    const [ domain, currentUser ] = await AuthService.getInstance().authorize(req, res);

    req.core = { ...req.core, domain: domain };
    req.user = currentUser;
    next();
};