import { Controller, Get, Post, BaseRequest, BaseResponse, HttpError, HttpCode, Delete } from 'ts-framework';
import { AuthService, PersonService, DomainService, PayrollService } from '../services';
import { PersonType, Person, PersonStatus, Document, DocumentType, Company } from '../models';
import { Auth } from '../filters';
import { ExtendedRequest } from '../types/http';
import * as Bluebird from "bluebird";

@Controller("/users")
export default class PersonController {

    private static DEFAULT_LIMIT = 25;

    @Get('/:id', [Auth.authorize])
    public static async findById(req: ExtendedRequest, res: BaseResponse) {
        const { id }: { id: string } = req.params;
        const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

        const accountable = await DomainService.getInstance().findAccountable(domain.id);

        if(![currentUser.id, accountable.id].includes(id)) {
            throw new HttpError(`The account details can be accessed only by his owner or by the company´s accountable`, 
            HttpCode.Client.FORBIDDEN);
        }

        let person: Person;
        if(currentUser.id == id) {
            person = currentUser;
        } else {
            person = await PersonService.getInstance().findById(id);            
            if (!person) {
                throw new HttpError(`There is no person with the given id: ${id}`, 
                HttpCode.Client.NOT_FOUND);
            }
        }

        return res.success(person.toJSON());
    }

    @Get('/me', [Auth.authorize])
    public static async findMe(req: ExtendedRequest, res: BaseResponse) {
        const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

        return res.success(currentUser.toJSON());
    }

    @Get('/', [Auth.authorize])
    static async findByDomain(req: ExtendedRequest, res: BaseResponse) {
        const   { type = undefined, status = undefined, offset = 0, limit = PersonController.DEFAULT_LIMIT }:
                { type: PersonType, status: PersonStatus, offset: number; limit: number } = req.query;
        
        const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

        const filters = {
            type: type,
            status: status
        }

        const [ users, count ] = await PersonService.getInstance()
        .findByDomain(domain.id, filters, offset, limit);
    
        res.set("X-Data-Length", count.toString());
        res.set("X-Data-Offset", req.query.offset || "0");
        res.set("X-Data-Limit", req.query.limit || PersonController.DEFAULT_LIMIT);
        
        return res.success( users.map(person => person.toJSON()) );
    }

    @Post("/")
    public static async create(req: BaseRequest, res: BaseResponse) {
        const   { domainId, password, personData }: 
                { domainId: string, password?: string; personData: Person } = req.body;
      
        const personService = PersonService.getInstance();
        const domain = await DomainService.getInstance().findById(domainId);

        if(!domain) {
            throw new HttpError("There is no domain with the given identifier", 
            HttpCode.Client.NOT_FOUND);
        }

        const transientPerson = new Person(personData);
        const person = await personService.create(domain, transientPerson, password);

        return res.success( person.toJSON() );
    }

    @Post("/:id/documents", [Auth.authorize])
    public static async uploadDocs(req: ExtendedRequest, res: BaseResponse) {
        const { id }: { id: string } = req.params;
        const   { type, number, expiresAt }: 
                { type: DocumentType, number: string, expiresAt: Date } = req.body;
        const files = (req as any).files;

        const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

        if(currentUser.id != id) {
            throw new HttpError("Only the owner can upload documents associated with the account", 
            HttpCode.Client.FORBIDDEN);
        }

        const personService = PersonService.getInstance();
        const promises: Promise<Person>[] = [];

        if(files.front) {
            const doc = new Document({
                type: type,
                number: number,
                expiresAt: expiresAt,
                fileName: files.front.name,
                front: Buffer.from(files.front.data).toString('base64')
            });

            promises.push(personService.addDocument(currentUser, doc, "front"));
        }

        if(files.back) {
            const doc = new Document({
                type: type,
                number: number,
                expiresAt: expiresAt,
                fileName: files.back.name,
                back: Buffer.from(files.back.data).toString('base64')
            });

            promises.push(personService.addDocument(currentUser, doc, "back"));
        }

        let results: Person[];
        try {
            results = await Bluebird.all(promises);

        } catch(error) {
            if(error instanceof HttpError) throw error;

            throw new HttpError(`Error saving document: ${error.data.message}`, 
            HttpCode.Server.INTERNAL_SERVER_ERROR);
        }

        return res.success( results.pop().toJSON() );
    }

    @Get("/:id/documents", [Auth.authorize])
    public static async checkDocsStatus(req: ExtendedRequest, res: BaseResponse) {
        const { id }: { id: string } = req.params;
        const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

        const personService = PersonService.getInstance();

        const accountable = await DomainService.getInstance().findAccountable(domain.id);
        if(![currentUser.id, accountable.id].includes(id)) {
            throw new HttpError("Only the owner or the company's accountable can check status of documents associated with the account", 
            HttpCode.Client.FORBIDDEN);
        }

        let documents: Document[];
        try {
            documents = await personService
            .checkPersonDocumentsStatus(currentUser);

        } catch(error) {
            if(error instanceof HttpError) throw error;

            throw new HttpError("Error retrieving document status",
            HttpCode.Server.INTERNAL_SERVER_ERROR);
        }

        return res.success( documents.map(document => document.toJSON()) );
    }

    @Post("/:id/salary", [Auth.authorize])
    public static async updateSalary(req: ExtendedRequest, res: BaseResponse) {
        const { id }: { id: string } = req.params;
        const { amount }: { amount: string } = req.body;
        const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];
      
        const personService = PersonService.getInstance();
        const accountable = await DomainService.getInstance().findAccountable(domain.id);
        if(currentUser.id != accountable.id) {
            throw new HttpError("Only the company's accountable can do this", 
            HttpCode.Client.FORBIDDEN);
        }

        const employee = await personService.findById(id);
        if(!employee) {
            throw new HttpError("There is no employee with the given id", 
            HttpCode.Client.NOT_FOUND);
        }

        const salary = await PayrollService.getInstance().update(employee, amount);

        return res.success( salary.toJSON() );
    }

    @Get('/:id/balance', [Auth.authorize])
    public static async getBalance(req: ExtendedRequest, res: BaseResponse) {
        const { id }: { id: string } = req.params;
        const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];
    
        const personService = PersonService.getInstance();

        const resource = await personService.findById(id);
        if(!resource) { 
            throw new HttpError(`There is no person with the given ID: ${id}`, 
            HttpCode.Client.NOT_FOUND);
        }
        
        if(resource.id != currentUser.id) {
            throw new HttpError(`The account balance can be accessed only by his owner`, 
            HttpCode.Client.FORBIDDEN);
        }

        const accountBalance = await personService.checkBalance(resource);

        return res.success({
            "balance": accountBalance
        });    
    }

    @Delete('/:id', [Auth.authorize])
    static async delete(req: ExtendedRequest, res: BaseResponse) {
        const { id }: { id: string } = req.params;
        const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

        const accountable = await DomainService.getInstance()
        .findAccountable(domain.id);

        if(currentUser.id != accountable.id) {
            throw new HttpError(`Only the company´s accountable can delete an account`, 
            HttpCode.Client.FORBIDDEN);
        }

        const found = await PersonService.getInstance().findById(id);
        if (!found) {
            throw new HttpError(`There is no person with the given id: ${id}`, 
            HttpCode.Client.NOT_FOUND);
        }
    
        const result = await PersonService.getInstance().delete(id);
        return res.success(result.raw);
    }
}
