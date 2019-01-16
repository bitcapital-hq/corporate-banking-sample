import { Controller, Get, Post, BaseRequest, BaseResponse, HttpError, HttpCode } from 'ts-framework';
import DomainService from '../services/DomainService';
import { Person, Company } from '../models';

@Controller("/domains")
export default class DomainController {

    @Post("/")
    public static async createDomain(req: BaseRequest, res: BaseResponse) {
        const domainData: Company = req.body;

        const domain = await DomainService.getInstance().createDomain(domainData);

        return res.success(domain.toSimpleJSON());
    }  

    @Post("/:id/mediators")
    public static async createMediator(req: BaseRequest, res: BaseResponse) {
        const { id }: { id: string } = req.params;
        const { password, personData }: { password?: string; personData: Person } = req.body;

        const domainService = DomainService.getInstance();
        const domain = await domainService.findById(id);

        if(!domain) {
            throw new HttpError("There is no domain with the given identifier", 
            HttpCode.Client.NOT_FOUND);
        }

        const transientPerson = new Person(personData);
        const mediator = await domainService.createMediator(domain, transientPerson, password);

        return res.success( mediator.toJSON() );
    }  
}